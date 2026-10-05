
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MonitoringDataService } from '../../../application/monitoring-data.service';


@Component({
  selector: 'app-unit-assignment',
  standalone: true,
  imports: [MatIconModule],
  template: `
<div class="ua-root">
  <h2 class="page-title">ASIGNACIÓN DE UNIDADES</h2>
  <div class="unit-grid">
    @for (u of unidades(); track u.id) {
      <div class="unit-card" [class.alert]="u.estado === 'ALERTA'">
        <div class="uc-top">
          <mat-icon [style.color]="estadoColor(u.estado)">directions_bus</mat-icon>
          <span class="uc-placa">{{ u.placa }}</span>
          <span class="uc-estado" [style.color]="estadoColor(u.estado)">{{ u.estado }}</span>
        </div>
        <p class="uc-conductor">{{ u.conductor }}</p>
        <p class="uc-ruta">Ruta: <strong>{{ u.ruta }}</strong></p>
        <div class="uc-stats">
          <span><mat-icon>people</mat-icon> {{ u.pasajeros }}</span>
          <span><mat-icon>speed</mat-icon> {{ u.velocidad }} km/h</span>
        </div>
        <button class="uc-btn">REASIGNAR</button>
      </div>
    }
  </div>
</div>`,
  styles: [`
.ua-root { padding: 20px; }
.page-title { font-family:'Barlow Condensed',sans-serif; font-weight:900; font-size:22px; color:var(--sb-white); margin-bottom:20px; }
.unit-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; }
.unit-card { background:var(--sb-bg-card); border:1px solid var(--sb-border); padding:16px; }
.unit-card.alert { border-color:var(--sb-red); }
.uc-top { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
.uc-top mat-icon { font-size:20px; width:20px; height:20px; }
.uc-placa { font-family:'Barlow Condensed',sans-serif; font-weight:800; font-size:14px; color:var(--sb-white); flex:1; }
.uc-estado { font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:10px; }
.uc-conductor { font-size:12px; color:var(--sb-gray); margin-bottom:4px; }
.uc-ruta { font-size:12px; color:var(--sb-gray); margin-bottom:10px; }
.uc-ruta strong { color:var(--sb-accent); }
.uc-stats { display:flex; gap:12px; margin-bottom:12px; }
.uc-stats span { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--sb-gray); }
.uc-stats mat-icon { font-size:14px; width:14px; height:14px; }
.uc-btn { width:100%; background:transparent; border:1px solid var(--sb-border2); color:var(--sb-gray); font-family:'Barlow Condensed',sans-serif; font-weight:700; font-size:11px; letter-spacing:0.1em; padding:7px; cursor:pointer; transition:all 0.15s; }
.uc-btn:hover { border-color:var(--sb-accent); color:var(--sb-accent); }
`]
})
export class UnitAssignment {
  private svc = inject(MonitoringDataService);
  unidades    = toSignal(this.svc.getUnidades(), { initialValue: [] });
  estadoColor(e: string) { return e === 'ACTIVO' ? 'var(--sb-accent)' : e === 'ALERTA' ? 'var(--sb-red)' : 'var(--sb-gray)'; }
}
