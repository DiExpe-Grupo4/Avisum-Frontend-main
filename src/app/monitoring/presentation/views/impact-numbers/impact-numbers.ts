import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../../environments/environment';
import { MonitoringDataService } from '../../../application/monitoring-data.service';
import { UsersStateService } from '../../../../users/application/users-state.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';
import { Turno } from '../../../domain/model/turno-historial.entity';

interface AlertApi {
  id: number;
  employeeId: number;
  busUnitId: number;
  alertType: string;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

type Metrica = 'km' | 'pasajeros' | 'recaudado';

interface FilaUnidad {
  busUnitId: number;
  placa: string;
  conductorNombre: string;
  km: number;
  pasajeros: number;
  recaudado: number;
}

interface FilaTipo {
  tipo: string;
  cantidad: number;
}

@Component({
  selector: 'app-impact-numbers',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="impact-root">
      <h2 class="page-title">MÉTRICAS DE OPERACIÓN</h2>
      <p class="page-sub"><span class="live-dot"></span>Cifras calculadas con los datos del sistema, en vivo</p>

      <div class="kpi-grid">
        <div class="impact-card">
          <mat-icon style="color:var(--sb-accent)">groups</mat-icon>
          <span class="impact-val" style="color:var(--sb-accent)">{{ conductoresActivos() }}</span>
          <span class="impact-label">Conductores Activos</span>
          <span class="impact-desc">de {{ conductoresTotal() }} registrados</span>
        </div>
        <div class="impact-card">
          <mat-icon style="color:var(--sb-accent)">directions_bus</mat-icon>
          <span class="impact-val" style="color:var(--sb-accent)">{{ unidadesEnRuta() }}</span>
          <span class="impact-label">Unidades en Ruta</span>
          <span class="impact-desc">de {{ unidadesTotal() }} unidades monitoreadas</span>
        </div>
        <div class="impact-card">
          <mat-icon style="color:var(--sb-red)">warning</mat-icon>
          <span class="impact-val" style="color:var(--sb-red)">{{ alertasActivas() }}</span>
          <span class="impact-label">Alertas Activas</span>
          <span class="impact-desc">Pendientes de resolución</span>
        </div>
        <div class="impact-card">
          <mat-icon style="color:var(--sb-white)">timer</mat-icon>
          <span class="impact-val" style="color:var(--sb-white)">{{ tiempoRespuestaTexto() }}</span>
          <span class="impact-label">Tiempo de Respuesta</span>
          <span class="impact-desc">{{ alertasResueltas() > 0 ? 'Promedio hasta resolución' : 'Aún no hay alertas resueltas' }}</span>
        </div>
        <div class="impact-card">
          <mat-icon style="color:var(--sb-accent)">check_circle</mat-icon>
          <span class="impact-val" style="color:var(--sb-accent)">{{ porcentajeResueltas() }}%</span>
          <span class="impact-label">Alertas Resueltas</span>
          <span class="impact-desc">{{ alertasResueltas() }} de {{ totalAlertas() }} generadas</span>
        </div>
        <div class="impact-card">
          <mat-icon style="color:var(--sb-white)">history</mat-icon>
          <span class="impact-val" style="color:var(--sb-white)">{{ turnosFinalizados() }}</span>
          <span class="impact-label">Turnos Finalizados</span>
          <span class="impact-desc">{{ kmAcumulados().toFixed(1) }} km y {{ pasajerosAcumulados() }} pasajeros acumulados</span>
        </div>
      </div>

      <div class="impact-grid-2">
        <div class="sb-card">
          <div class="comp-top">
            <p class="section-label">COMPARACIÓN ENTRE UNIDADES</p>
            <div class="sh-tabs">
              <button class="sh-tab" [class.active]="metrica() === 'km'" (click)="metrica.set('km')">Kilómetros</button>
              <button class="sh-tab" [class.active]="metrica() === 'pasajeros'" (click)="metrica.set('pasajeros')">Pasajeros</button>
              <button class="sh-tab" [class.active]="metrica() === 'recaudado'" (click)="metrica.set('recaudado')">Recaudado</button>
            </div>
          </div>
          @for (f of filasUnidadesOrdenadas(); track f.busUnitId) {
            <div class="comp-row">
              <div class="comp-info">
                <span class="comp-placa">{{ f.placa }}</span>
                <span class="comp-nombre">{{ f.conductorNombre }}</span>
              </div>
              <div class="comp-bar-wrap">
                <div class="comp-bar" [style.width.%]="porcentajeBarra(f)"></div>
              </div>
              <span class="comp-val">{{ valorFormateado(f) }}</span>
            </div>
          } @empty {
            <p class="sh-empty">Todavía no hay turnos registrados.</p>
          }
        </div>

        <div class="sb-card">
          <p class="section-label">ALERTAS POR TIPO</p>
          @for (t of alertasPorTipo(); track t.tipo) {
            <div class="comp-row">
              <span class="comp-tipo">{{ t.tipo }}</span>
              <div class="comp-bar-wrap">
                <div class="comp-bar comp-bar-red" [style.width.%]="totalAlertas() ? (t.cantidad / totalAlertas() * 100) : 0"></div>
              </div>
              <span class="comp-val">{{ t.cantidad }}</span>
            </div>
          } @empty {
            <p class="sh-empty">Todavía no se han generado alertas.</p>
          }
        </div>
      </div>
    </div>`,
  styles: [`
    .impact-root { padding: 20px; }
    .page-title { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:22px; color:var(--sb-white); margin:0 0 4px; }
    .page-sub { display:flex; align-items:center; gap:6px; font-family:'Share Tech Mono',monospace; font-size:11px; color:var(--sb-gray); margin:0 0 20px; }
    .live-dot { width:7px; height:7px; border-radius:50%; background:var(--sb-accent); display:inline-block; animation:im-pulse 1.4s ease-in-out infinite; }
    @keyframes im-pulse { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; margin-bottom:20px; }
    .impact-card { background:var(--sb-bg-card); border:1px solid var(--sb-border); padding:20px 16px; display:flex; flex-direction:column; gap:6px; }
    .impact-card mat-icon { font-size:28px; width:28px; height:28px; }
    .impact-val { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:36px; line-height:1; }
    .impact-label { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11px; letter-spacing:0.15em; color:var(--sb-white); text-transform:uppercase; }
    .impact-desc { font-size:11px; color:var(--sb-gray); line-height:1.4; }
    .impact-grid-2 { display:grid; grid-template-columns:1.3fr 1fr; gap:16px; }
    .sb-card { background:var(--sb-bg-card); border:1px solid var(--sb-border); padding:20px; }
    .section-label { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11px; letter-spacing:0.2em; color:var(--sb-gray); text-transform:uppercase; margin:0 0 16px; }
    .comp-top { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:4px; }
    .sh-tabs { display:flex; border:1px solid var(--sb-border); border-radius:4px; overflow:hidden; }
    .sh-tab { background:var(--sb-bg-card2); color:var(--sb-gray); border:none; font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:10px; letter-spacing:0.05em; padding:6px 10px; cursor:pointer; }
    .sh-tab.active { background:var(--sb-accent); color:#0a0a0a; }
    .comp-row { display:grid; grid-template-columns:1.1fr 2fr 0.7fr; align-items:center; gap:12px; padding:9px 0; }
    .comp-info { display:flex; flex-direction:column; }
    .comp-placa { font-family:'Share Tech Mono',monospace; font-size:11px; color:var(--sb-gray); }
    .comp-nombre { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:13px; color:var(--sb-white); }
    .comp-tipo { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:13px; color:var(--sb-white); }
    .comp-bar-wrap { height:8px; background:var(--sb-bg-card2); border-radius:4px; overflow:hidden; }
    .comp-bar { height:100%; background:var(--sb-accent); border-radius:4px; transition:width 0.3s; }
    .comp-bar-red { background:var(--sb-red); }
    .comp-val { font-family:'Barlow Condensed',sans-serif; font-weight:800; font-size:13px; color:var(--sb-white); text-align:right; }
    .sh-empty { font-family:'Barlow Condensed',sans-serif; color:var(--sb-gray); font-size:13px; padding:10px 0; }
  `]
})
export class ImpactNumbers implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private svc = inject(MonitoringDataService);
  private users = inject(UsersStateService);
  private fleet = inject(FleetTrackingService);

  private readonly POLL_MS = 5000;
  private pollRef: ReturnType<typeof setInterval> | null = null;

  private alertas = signal<AlertApi[]>([]);
  private historial = signal<Turno[]>([]);

  metrica = signal<Metrica>('km');

  ngOnInit() {
    if (this.users.getConductores().length === 0) {
      this.users.cargar();
    }
    this.cargarTodo();
    this.pollRef = setInterval(() => this.cargarTodo(), this.POLL_MS);
  }

  ngOnDestroy() {
    if (this.pollRef) clearInterval(this.pollRef);
  }

  private cargarTodo() {
    this.http.get<AlertApi[]>(`${environment.platformProviderApiBaseUrl}/alerts`).subscribe({
      next: (list) => this.alertas.set(list),
      error: (err) => console.error('Error al cargar alertas:', err),
    });
    this.svc.getHistorial().subscribe({
      next: (list) => this.historial.set(list),
      error: (err) => console.error('Error al cargar historial de turnos:', err),
    });
  }

  readonly conductoresActivos = computed(
    () => this.users.getConductores().filter((c) => c.estado === 'ACTIVO').length,
  );
  readonly conductoresTotal = computed(
    () => this.users.getConductores().filter((c) => c.estado !== 'ELIMINADO').length,
  );

  readonly unidadesEnRuta = computed(
    () => this.fleet.unidades().filter((u) => u.estado === 'ACTIVO' || u.estado === 'ALERTA').length,
  );
  readonly unidadesTotal = computed(() => this.fleet.unidades().length);

  readonly totalAlertas = computed(() => this.alertas().length);
  readonly alertasActivas = computed(() => this.alertas().filter((a) => a.status === 'ACTIVE').length);
  readonly alertasResueltas = computed(() => this.alertas().filter((a) => a.status === 'RESOLVED').length);
  readonly porcentajeResueltas = computed(() => {
    const total = this.totalAlertas();
    return total === 0 ? 0 : Math.round((this.alertasResueltas() / total) * 100);
  });

  readonly tiempoRespuestaTexto = computed(() => {
    const resueltas = this.alertas().filter((a) => a.status === 'RESOLVED');
    if (resueltas.length === 0) return '—';
    const totalMs = resueltas.reduce(
      (acc, a) => acc + (new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()),
      0,
    );
    const minutos = totalMs / resueltas.length / 60000;
    return `${minutos.toFixed(1)} min`;
  });

  readonly alertasPorTipo = computed<FilaTipo[]>(() => {
    const mapa = new Map<string, number>();
    for (const a of this.alertas()) {
      mapa.set(a.alertType, (mapa.get(a.alertType) ?? 0) + 1);
    }
    return [...mapa.entries()]
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  });

  readonly turnosFinalizados = computed(
    () => this.historial().filter((t) => t.estado === 'FINALIZADO').length,
  );
  readonly kmAcumulados = computed(() =>
    this.historial()
      .filter((t) => t.estado === 'FINALIZADO')
      .reduce((acc, t) => acc + t.distanciaKm, 0),
  );
  readonly pasajerosAcumulados = computed(() =>
    this.historial()
      .filter((t) => t.estado === 'FINALIZADO')
      .reduce((acc, t) => acc + t.pasajeros, 0),
  );

  readonly filasUnidadesOrdenadas = computed<FilaUnidad[]>(() => {
    const mapa = new Map<number, { km: number; pasajeros: number; recaudado: number; ultimoTurno: Turno }>();
    for (const t of this.historial()) {
      const busUnitId = Number(t.busId);
      const actual = mapa.get(busUnitId);
      if (actual) {
        actual.km += t.distanciaKm;
        actual.pasajeros += t.pasajeros;
        actual.recaudado += t.recaudacion;
        if (t.fechaInicio.getTime() > actual.ultimoTurno.fechaInicio.getTime()) actual.ultimoTurno = t;
      } else {
        mapa.set(busUnitId, { km: t.distanciaKm, pasajeros: t.pasajeros, recaudado: t.recaudacion, ultimoTurno: t });
      }
    }

    const filas: FilaUnidad[] = [...mapa.entries()].map(([busUnitId, v]) => ({
      busUnitId,
      placa: this.fleet.unidades().find((u) => u.id === busUnitId)?.placa ?? `#${busUnitId}`,
      conductorNombre: this.nombreConductor(v.ultimoTurno.conductorId),
      km: v.km,
      pasajeros: v.pasajeros,
      recaudado: v.recaudado,
    }));

    const m = this.metrica();
    return filas.sort((a, b) => b[m] - a[m]);
  });

  private nombreConductor(id: number): string {
    const c = this.users.getConductores().find((c) => c.id === id);
    return c ? `${c.nombre} ${c.apellido}`.trim() : `#${id}`;
  }

  porcentajeBarra(f: FilaUnidad): number {
    const max = Math.max(...this.filasUnidadesOrdenadas().map((x) => x[this.metrica()]), 1);
    return (f[this.metrica()] / max) * 100;
  }

  valorFormateado(f: FilaUnidad): string {
    const m = this.metrica();
    if (m === 'km') return `${f.km.toFixed(1)} km`;
    if (m === 'pasajeros') return `${f.pasajeros}`;
    return `S/ ${f.recaudado.toFixed(2)}`;
  }
}
