import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MonitoringDataService } from '../../../application/monitoring-data.service';
import { UsersStateService } from '../../../../users/application/users-state.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';
import { ShiftSimulationService } from '../../../application/shift-simulation.service';
import { Turno } from '../../../domain/model/turno-historial.entity';

type EstadoFila = 'EN_RUTA' | 'FINALIZADO' | 'NO_LABORABLE';
type Filtro = 'TODOS' | EstadoFila;

interface FilaHoy {
  conductorId: number;
  nombre: string;
  iniciales: string;
  placa: string;
  ruta: string;
  origenDestino: string;
  fechaInicio: Date | null;
  duracionSegundos: number;
  km: number;
  pasajeros: number;
  recaudado: number;
  estado: EstadoFila;
  esReal: boolean;
}

interface FilaAnterior {
  id: string;
  conductorId: number;
  fecha: Date;
  duracionSegundos: number;
  km: number;
  pasajeros: number;
  recaudado: number;
}

@Component({
  selector: 'app-shift-history',
  standalone: true,
  imports: [MatIconModule],
  template: ` <div class="sh-root">
    <div class="sh-top">
      <div>
        <h2 class="page-title">HISTORIAL DE TURNOS</h2>
        <p class="live-sub"><span class="live-dot"></span>En vivo, se actualiza cada segundo</p>
      </div>
      <div class="sh-filtros">
        <select class="sh-select" (change)="setFiltroConductor($any($event.target).value)">
          <option value="">Todos los conductores</option>
          @for (c of conductoresOrdenados(); track c.id) {
            <option [value]="c.id">{{ c.nombre }} {{ c.apellido }}</option>
          }
        </select>
        <div class="sh-tabs">
          <button
            class="sh-tab"
            [class.active]="filtroEstado() === 'TODOS'"
            (click)="setFiltroEstado('TODOS')"
          >
            Todos
          </button>
          <button
            class="sh-tab"
            [class.active]="filtroEstado() === 'EN_RUTA'"
            (click)="setFiltroEstado('EN_RUTA')"
          >
            En ruta
          </button>
          <button
            class="sh-tab"
            [class.active]="filtroEstado() === 'FINALIZADO'"
            (click)="setFiltroEstado('FINALIZADO')"
          >
            Finalizados
          </button>
          <button
            class="sh-tab"
            [class.active]="filtroEstado() === 'NO_LABORABLE'"
            (click)="setFiltroEstado('NO_LABORABLE')"
          >
            No laborable
          </button>
        </div>
      </div>
    </div>

    <div class="sh-stats">
      <div class="sh-stat">
        <span class="sh-stat-val">{{ enRutaAhora() }}</span>
        <span class="sh-stat-label">en ruta ahora</span>
      </div>
      <div class="sh-stat">
        <span class="sh-stat-val">{{ kmHoy().toFixed(1) }}</span>
        <span class="sh-stat-label">kilómetros hoy</span>
      </div>
      <div class="sh-stat">
        <span class="sh-stat-val">{{ pasajerosHoy() }}</span>
        <span class="sh-stat-label">pasajeros hoy</span>
      </div>
      <div class="sh-stat">
        <span class="sh-stat-val accent">S/ {{ recaudadoHoy().toFixed(2) }}</span>
        <span class="sh-stat-label">recaudado hoy</span>
      </div>
    </div>

    <div class="shift-table">
      <div class="sh-header">
        <span>CONDUCTOR</span><span>UNIDAD</span><span>RUTA</span><span>FECHA</span>
        <span>DURACIÓN</span><span>KM</span><span>PASAJ.</span><span>RECAUDADO</span
        ><span>ESTADO</span>
      </div>
      @for (f of filasFiltradas(); track f.conductorId) {
        <div class="sh-row" [class.sh-row-live]="f.estado === 'EN_RUTA'">
          <span class="sh-conductor">
            <span class="sh-avatar">{{ f.iniciales }}</span>
            <span class="sh-name">{{ f.nombre }}</span>
          </span>
          <span class="sh-mono">{{ f.placa }}</span>
          <span>
            <span class="sh-val">{{ f.ruta }}</span>
            @if (f.origenDestino !== '—') {
              <div class="sh-sub">{{ f.origenDestino }}</div>
            }
          </span>
          <span>
            @if (f.fechaInicio) {
              <span class="sh-val">{{ formatearFecha(f.fechaInicio) }}</span>
              <div class="sh-sub">
                {{ formatearHora(f.fechaInicio) }} {{ f.estado === 'EN_RUTA' ? 'a ahora' : '' }}
              </div>
            } @else {
              <span class="sh-val">Hoy</span>
              <div class="sh-sub">Sin turno asignado</div>
            }
          </span>
          <span class="sh-mono">{{
            f.estado === 'NO_LABORABLE' ? '—' : formatearDuracion(f.duracionSegundos)
          }}</span>
          <span class="sh-val">{{ f.estado === 'NO_LABORABLE' ? '—' : f.km.toFixed(1) }}</span>
          <span class="sh-val">{{ f.estado === 'NO_LABORABLE' ? '—' : f.pasajeros }}</span>
          <span class="sh-accent">{{
            f.estado === 'NO_LABORABLE' ? '—' : 'S/ ' + f.recaudado.toFixed(2)
          }}</span>
          <span class="sh-badge" [class]="estadoClase(f.estado)">{{ estadoLabel(f.estado) }}</span>
        </div>
      } @empty {
        <div class="sh-empty">Todavía no hay conductores registrados.</div>
      }
    </div>

    <h3 class="sh-sub-title">Turnos anteriores</h3>
    <div class="shift-table">
      <div class="sh-header sh-header-ant">
        <span>CONDUCTOR</span><span>UNIDAD</span><span>RUTA</span><span>FECHA</span>
        <span>DURACIÓN</span><span>KM</span><span>PASAJ.</span><span>RECAUDADO</span>
      </div>
      @for (a of turnosAnteriores(); track a.id) {
        <div class="sh-row sh-row-ant">
          <span class="sh-conductor">
            <span class="sh-avatar">{{ inicialesConductor(a.conductorId) }}</span>
            <span class="sh-name">{{ nombreConductor(a.conductorId) }}</span>
          </span>
          <span class="sh-mono">{{ placaDeConductorPorId(a.conductorId) }}</span>
          <span class="sh-val">{{ rutaDeConductorPorId(a.conductorId) }}</span>
          <span>
            <span class="sh-val">{{ formatearFecha(a.fecha) }}</span>
            <div class="sh-sub">{{ formatearHora(a.fecha) }}</div>
          </span>
          <span class="sh-mono">{{ formatearDuracion(a.duracionSegundos) }}</span>
          <span class="sh-val">{{ a.km.toFixed(1) }}</span>
          <span class="sh-val">{{ a.pasajeros }}</span>
          <span class="sh-accent">S/ {{ a.recaudado.toFixed(2) }}</span>
        </div>
      } @empty {
        <div class="sh-empty">Todavía no hay turnos anteriores.</div>
      }
    </div>
  </div>`,
  styles: [
    `
      .sh-root {
        padding: 20px;
      }
      .sh-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 18px;
      }
      .page-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 900;
        font-size: 22px;
        color: var(--sb-white);
        margin: 0;
      }
      .live-sub {
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        color: var(--sb-gray);
        margin: 4px 0 0;
      }
      .live-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--sb-accent);
        display: inline-block;
        animation: sh-pulse 1.4s ease-in-out infinite;
      }
      @keyframes sh-pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.25;
        }
      }
      .sh-filtros {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .sh-select {
        background: var(--sb-bg-card);
        border: 1px solid var(--sb-border);
        color: var(--sb-white);
        font-family: 'Barlow Condensed', sans-serif;
        font-size: 12px;
        padding: 7px 10px;
        border-radius: 4px;
      }
      .sh-tabs {
        display: flex;
        border: 1px solid var(--sb-border);
        border-radius: 4px;
        overflow: hidden;
      }
      .sh-tab {
        background: var(--sb-bg-card);
        color: var(--sb-gray);
        border: none;
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.05em;
        padding: 8px 14px;
        cursor: pointer;
      }
      .sh-tab.active {
        background: var(--sb-accent);
        color: #0a0a0a;
      }
      .sh-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        background: var(--sb-border);
        border: 1px solid var(--sb-border);
        margin-bottom: 18px;
      }
      .sh-stat {
        background: var(--sb-bg-card);
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sh-stat-val {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 900;
        font-size: 26px;
        color: var(--sb-white);
      }
      .sh-stat-val.accent {
        color: var(--sb-accent);
      }
      .sh-stat-label {
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
        color: var(--sb-gray);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .sh-sub-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        font-size: 15px;
        color: var(--sb-white);
        margin: 24px 0 10px;
      }
      .shift-table {
        background: var(--sb-bg-card);
        border: 1px solid var(--sb-border);
      }
      .sh-header,
      .sh-row {
        display: grid;
        grid-template-columns: 1.8fr 1fr 1.3fr 1.1fr 1fr 0.7fr 0.8fr 1fr 1fr;
        padding: 10px 16px;
        border-bottom: 1px solid var(--sb-border);
        align-items: center;
        gap: 8px;
      }
      .sh-header-ant,
      .sh-row-ant {
        grid-template-columns: 1.8fr 1fr 1.3fr 1.1fr 1fr 0.7fr 0.8fr 1fr;
      }
      .sh-header {
        background: var(--sb-bg-card2);
      }
      .sh-header span {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 10px;
        letter-spacing: 0.12em;
        color: var(--sb-gray);
      }
      .sh-row:hover {
        background: var(--sb-bg-card2);
      }
      .sh-row-live {
        background: color-mix(in srgb, var(--sb-accent) 6%, transparent);
      }
      .sh-conductor {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .sh-avatar {
        width: 28px;
        height: 28px;
        border-radius: 4px;
        background: var(--sb-accent);
        color: #0a0a0a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        font-size: 11px;
        flex-shrink: 0;
      }
      .sh-name {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 13px;
        color: var(--sb-white);
      }
      .sh-mono {
        font-family: 'Share Tech Mono', monospace;
        font-size: 11px;
        color: var(--sb-gray);
      }
      .sh-val {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 13px;
        color: var(--sb-white);
      }
      .sh-sub {
        font-family: 'Share Tech Mono', monospace;
        font-size: 10px;
        color: var(--sb-gray);
        margin-top: 2px;
      }
      .sh-accent {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 900;
        font-size: 13px;
        color: var(--sb-accent);
      }
      .sh-badge {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        font-size: 10px;
        letter-spacing: 0.05em;
        padding: 5px 10px;
        border-radius: 3px;
        text-align: center;
      }
      .badge-live {
        background: var(--sb-accent);
        color: #0a0a0a;
      }
      .badge-done {
        background: transparent;
        border: 1px solid var(--sb-white);
        color: var(--sb-white);
      }
      .badge-off {
        background: transparent;
        border: 1px solid var(--sb-border);
        color: var(--sb-gray);
      }
      .sh-empty {
        padding: 24px 16px;
        font-family: 'Barlow Condensed', sans-serif;
        color: var(--sb-gray);
        font-size: 13px;
        text-align: center;
      }
    `,
  ],
})
export class ShiftHistory implements OnInit, OnDestroy {
  private svc = inject(MonitoringDataService);
  private users = inject(UsersStateService);
  private fleet = inject(FleetTrackingService);
  private sim = inject(ShiftSimulationService);

  private readonly POLL_MS = 5000;
  private pollRef: ReturnType<typeof setInterval> | null = null;

  private historialReal = signal<Turno[]>([]);

  filtroEstado = signal<Filtro>('TODOS');
  filtroConductorId = signal<number | null>(null);

  ngOnInit() {
    if (this.users.getConductores().length === 0) {
      this.users.cargar();
    }
    this.cargarHistorial();
    this.pollRef = setInterval(() => this.cargarHistorial(), this.POLL_MS);
  }

  ngOnDestroy() {
    if (this.pollRef) clearInterval(this.pollRef);
  }

  private cargarHistorial() {
    this.svc.getHistorial().subscribe({
      next: (list) => this.historialReal.set(list),
      error: (err) => console.error('Error al cargar historial de turnos:', err),
    });
  }

  private placaDeConductor(codigoEmpleado: string): string {
    return this.fleet.unidades().find((u) => u.codigoEmpleado === codigoEmpleado)?.placa ?? '—';
  }

  private rutaDeConductor(codigoEmpleado: string): string {
    return this.fleet.unidades().find((u) => u.codigoEmpleado === codigoEmpleado)?.ruta ?? '—';
  }

  conductoresOrdenados() {
    return [...this.users.getConductores()]
      .filter((c) => c.estado === 'ACTIVO')
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  readonly filasHoy = computed<FilaHoy[]>(() => {
    this.sim.tick();
    const conductores = this.users.getConductores().filter((c) => c.estado === 'ACTIVO');
    const real = this.historialReal();

    return conductores.map((c) => {
      const turnoReal = real
        .filter((t) => t.conductorId === c.id)
        .sort((a, b) => b.fechaInicio.getTime() - a.fechaInicio.getTime())[0];

      const placa = this.placaDeConductor(c.codigoEmpleado);
      const ruta = this.rutaDeConductor(c.codigoEmpleado);
      const nombre = `${c.nombre} ${c.apellido}`.trim();

      if (turnoReal) {
        return {
          conductorId: c.id,
          nombre,
          iniciales: c.iniciales,
          placa,
          ruta: turnoReal.rutaNombre || ruta,
          origenDestino: `${turnoReal.rutaOrigen} a ${turnoReal.rutaDestino}`,
          fechaInicio: turnoReal.fechaInicio,
          duracionSegundos: turnoReal.tiempoSegundos,
          km: turnoReal.distanciaKm,
          pasajeros: turnoReal.pasajeros,
          recaudado: turnoReal.recaudacion,
          estado: (turnoReal.estado === 'ACTIVO' ? 'EN_RUTA' : 'FINALIZADO') as EstadoFila,
          esReal: true,
        };
      }

      const s = this.sim.obtener(c.id);

      if (s.estado === 'NO_LABORABLE') {
        return {
          conductorId: c.id,
          nombre,
          iniciales: c.iniciales,
          placa: '—',
          ruta: '—',
          origenDestino: '—',
          fechaInicio: null,
          duracionSegundos: 0,
          km: 0,
          pasajeros: 0,
          recaudado: 0,
          estado: 'NO_LABORABLE' as EstadoFila,
          esReal: false,
        };
      }

      const duracionSegundos = Math.floor((Date.now() - s.inicio.getTime()) / 1000);
      return {
        conductorId: c.id,
        nombre,
        iniciales: c.iniciales,
        placa,
        ruta,
        origenDestino: 'Terminal Norte a Estación Central',
        fechaInicio: s.inicio,
        duracionSegundos,
        km: s.km,
        pasajeros: s.pasajeros,
        recaudado: s.recaudado,
        estado: s.estado as EstadoFila,
        esReal: false,
      };
    });
  });

  readonly filasFiltradas = computed(() => {
    let list = this.filasHoy();
    const f = this.filtroEstado();
    if (f !== 'TODOS') list = list.filter((r) => r.estado === f);
    const cid = this.filtroConductorId();
    if (cid != null) list = list.filter((r) => r.conductorId === cid);
    const orden: Record<EstadoFila, number> = { EN_RUTA: 0, FINALIZADO: 1, NO_LABORABLE: 2 };
    return [...list].sort((a, b) => orden[a.estado] - orden[b.estado]);
  });

  readonly enRutaAhora = computed(
    () => this.filasHoy().filter((r) => r.estado === 'EN_RUTA').length,
  );
  readonly kmHoy = computed(() =>
    this.filasHoy().reduce((acc, r) => acc + (r.estado !== 'NO_LABORABLE' ? r.km : 0), 0),
  );
  readonly pasajerosHoy = computed(() =>
    this.filasHoy().reduce((acc, r) => acc + (r.estado !== 'NO_LABORABLE' ? r.pasajeros : 0), 0),
  );
  readonly recaudadoHoy = computed(() =>
    this.filasHoy().reduce((acc, r) => acc + (r.estado !== 'NO_LABORABLE' ? r.recaudado : 0), 0),
  );

  readonly turnosAnteriores = computed<FilaAnterior[]>(() => {
    const reales: FilaAnterior[] = this.historialReal()
      .filter((t) => t.estado === 'FINALIZADO')
      .map((t) => ({
        id: `r-${t.id}`,
        conductorId: t.conductorId,
        fecha: t.fechaInicio,
        duracionSegundos: t.tiempoSegundos,
        km: t.distanciaKm,
        pasajeros: t.pasajeros,
        recaudado: t.recaudacion,
      }));

    return [...reales, ...this.sim.anteriores].sort(
      (a, b) => b.fecha.getTime() - a.fecha.getTime(),
    );
  });

  nombreConductor(id: number): string {
    const c = this.users.getConductores().find((c) => c.id === id);
    return c ? `${c.nombre} ${c.apellido}`.trim() : `#${id}`;
  }
  inicialesConductor(id: number): string {
    const c = this.users.getConductores().find((c) => c.id === id);
    return c ? c.iniciales : '—';
  }
  placaDeConductorPorId(id: number): string {
    const c = this.users.getConductores().find((c) => c.id === id);
    return c ? this.placaDeConductor(c.codigoEmpleado) : '—';
  }
  rutaDeConductorPorId(id: number): string {
    const c = this.users.getConductores().find((c) => c.id === id);
    return c ? this.rutaDeConductor(c.codigoEmpleado) : '—';
  }

  formatearDuracion(segundos: number): string {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = segundos % 60;
    if (h > 0) return `${h} h ${m} min`;
    if (m > 0) return `${m} min ${s} s`;
    return `${s} s`;
  }
  formatearFecha(d: Date): string {
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  formatearHora(d: Date): string {
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  estadoLabel(e: EstadoFila): string {
    return e === 'EN_RUTA' ? 'En ruta' : e === 'FINALIZADO' ? 'Finalizado' : 'No laborable';
  }
  estadoClase(e: EstadoFila): string {
    return e === 'EN_RUTA' ? 'badge-live' : e === 'FINALIZADO' ? 'badge-done' : 'badge-off';
  }

  setFiltroEstado(f: Filtro) {
    this.filtroEstado.set(f);
  }
  setFiltroConductor(valor: string) {
    this.filtroConductorId.set(valor ? Number(valor) : null);
  }
}
