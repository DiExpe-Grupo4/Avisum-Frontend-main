import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Driver } from '../../users/domain/model/driver.entity';
import { Turno } from '../domain/model/turno-historial.entity';
import { FleetTrackingService } from '../../shared/infrastructure/fleet-tracking.service';
import { ShiftsApiEndpoint } from '../infrastructure/shifts-api-endpoint';
import { UnidadesApiEndpoint } from '../infrastructure/unidades-api-endpoint';

@Injectable({ providedIn: 'root' })
export class ShiftTrackingService {
  private fleet = inject(FleetTrackingService);
  private http = inject(HttpClient);
  private shiftsApi = new ShiftsApiEndpoint(this.http);
  private unidadesApi = new UnidadesApiEndpoint(this.http);

  readonly turnoActual = signal<Turno | null>(null);
  readonly turnoActivo = signal(false);

  readonly tiempoSegundos = signal(0);
  readonly distanciaKm = signal(0);
  readonly pasajeros = signal(0);
  readonly recaudacion = signal(0);
  // Protocolo de cierre: vive aqui (no en el componente) para que sobreviva
  // la navegacion del dashboard al reporte de turno finalizado.
  readonly protocolo1 = signal(false);
  readonly protocolo2 = signal(false);
  readonly protocolo3 = signal(false);

  readonly protocoloProgreso = computed(() => {
    const items = [this.protocolo1(), this.protocolo2(), this.protocolo3()];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  });
  readonly tiempoStr = computed(() => {
    const s = this.tiempoSegundos();
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  iniciarTurno(conductor: Driver, busId: string) {
    // Guard: si ya hay un turno corriendo en esta sesion, no insistas con otro POST.
    if (this.turnoActivo()) return;

    this.unidadesApi.getAll().subscribe({
      next: (unidades) => {
        const unidad = unidades.find((u) => u.placa === busId);
        if (!unidad) {
          console.error('No se encontro la unidad con placa:', busId);
          return;
        }
        this.shiftsApi
          .iniciarTurno(conductor.id, unidad.id, 'Terminal Norte', 'Estación Central')
          .subscribe({
            next: (turno) => this.activarTurno(turno, conductor.codigoEmpleado),
            error: (err) => {
              if (err.status === 409) {
                // El backend dice que ya existe un turno activo (ej. se volvio a pasar
                // por "Acceso autorizado"). En vez de fallar, recuperamos ese turno real.
                this.shiftsApi.getActiveShiftByBusUnit(unidad.id).subscribe({
                  next: (turnoExistente) =>
                    this.activarTurno(turnoExistente, conductor.codigoEmpleado),
                  error: (err2) => console.error('No se pudo recuperar el turno activo:', err2),
                });
              } else {
                console.error('Error al iniciar turno:', err);
              }
            },
          });
      },
      error: (err) => console.error('Error al buscar unidades:', err),
    });
  }
  /**
   * Para el caso F5: no hay turno en memoria, pero puede seguir activo en el backend.
   * onDone(true) si lo recupero y lo dejo corriendo; onDone(false) si de verdad no hay nada.
   */
  recuperarTurnoSiExiste(conductor: Driver, busId: string, onDone: (recuperado: boolean) => void) {
    if (this.turnoActivo()) {
      onDone(true);
      return;
    }

    this.unidadesApi.getAll().subscribe({
      next: (unidades) => {
        const unidad = unidades.find((u) => u.placa === busId);
        if (!unidad) {
          onDone(false);
          return;
        }

        this.shiftsApi.getActiveShiftByBusUnit(unidad.id).subscribe({
          next: (turno) => {
            if (turno && turno.conductorId === conductor.id) {
              this.activarTurno(turno, conductor.codigoEmpleado);
              onDone(true);
            } else {
              onDone(false);
            }
          },
          error: () => onDone(false),
        });
      },
      error: () => onDone(false),
    });
  }
  private activarTurno(turno: Turno, codigoEmpleado: string) {
    this.turnoActual.set(turno);
    this.turnoActivo.set(true);
    // Si es un turno recuperado (no recien creado), partimos de sus metricas reales.
    this.tiempoSegundos.set(turno.tiempoSegundos ?? 0);
    this.distanciaKm.set(turno.distanciaKm ?? 0);
    this.pasajeros.set(turno.pasajeros ?? 0);
    this.recaudacion.set(turno.recaudacion ?? 0);
    this.iniciarTimer(codigoEmpleado);
    this.protocolo1.set(false);
    this.protocolo2.set(false);
    this.protocolo3.set(false);
  }

  private iniciarTimer(codigoEmpleado: string) {
    this.detenerTimer();
    this.timer = setInterval(() => {
      if (!this.turnoActivo()) return;
      this.tiempoSegundos.update((v) => v + 1);
      const deltaKm = 0.003;
      this.distanciaKm.update((v) => +(v + deltaKm).toFixed(3));
      if (this.tiempoSegundos() % 15 === 0) {
        this.pasajeros.update((v) => v + Math.floor(Math.random() * 3));
        this.recaudacion.update((v) => +(v + Math.random() * 2.5).toFixed(2));
      }
      if (codigoEmpleado) this.fleet.moverUnidadPorDistancia(codigoEmpleado, deltaKm);
      const t = this.turnoActual();
      if (t) {
        t.tiempoSegundos = this.tiempoSegundos();
        t.distanciaKm = this.distanciaKm();
        t.pasajeros = this.pasajeros();
        t.recaudacion = this.recaudacion();
      }
      // Cada 5 segundos empujamos el progreso real al backend, para que
      // "Historial de Turnos" en administración lo vea en vivo.
      if (this.tiempoSegundos() % 5 === 0) {
        this.enviarProgreso();
      }
    }, 1000);
  }

  private enviarProgreso() {
    const t = this.turnoActual();
    if (!t || t.id < 0) return;
    this.shiftsApi
      .actualizarProgreso(
        t.id,
        this.distanciaKm(),
        this.tiempoSegundos(),
        this.pasajeros(),
        this.recaudacion(),
      )
      .pipe(
        catchError((err) => {
          console.error('Error al actualizar progreso del turno:', err);
          return of(null);
        }),
      )
      .subscribe();
  }

  private detenerTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  finalizarTurno() {
    const t = this.turnoActual();
    this.detenerTimer();
    this.turnoActivo.set(false);
    if (!t) return;
    this.shiftsApi
      .finalizarTurno(
        t.id,
        this.distanciaKm(),
        this.tiempoSegundos(),
        this.pasajeros(),
        this.recaudacion(),
      )
      .subscribe({
        next: (turnoFinalizado) => this.turnoActual.set(turnoFinalizado),
        error: (err) => console.error('Error al finalizar turno:', err),
      });
  }

  resetTurno() {
    this.turnoActual.set(null);
    this.turnoActivo.set(false);
    this.detenerTimer();
    this.protocolo1.set(false);
    this.protocolo2.set(false);
    this.protocolo3.set(false);
  }
}
