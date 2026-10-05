import { Component, inject, computed, AfterViewInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';
import { AlertsNotificationService } from '../../../../shared/infrastructure/alerts-notification.service';

declare const L: any;

function nivelDesdeTipo(tipo: string): 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO' {
  const t = tipo.toUpperCase();
  if (t.includes('PÁNICO') || t.includes('PANICO')) return 'CRITICO';
  if (t.includes('VELOCIDAD')) return 'ALTO';
  if (t.includes('DESVÍO') || t.includes('DESVIO') || t.includes('PASAJEROS')) return 'MEDIO';
  return 'BAJO';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements AfterViewInit, OnDestroy {
  private fleet = inject(FleetTrackingService);
  private alertsService = inject(AlertsNotificationService);

  unidades = this.fleet.unidades;

  /** Alertas reales del backend (todas las unidades/conductores), no solo las de esta pestaña. */
  alertas = computed(() => {
    const unidades = this.unidades();
    return this.alertsService
      .alertas()
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20)
      .map((a) => {
        const unidad = unidades.find((u) => u.id === a.busUnitId);
        return {
          id: a.id,
          tipo: a.alertType,
          bus: unidad?.placa ?? `UNIDAD-${a.busUnitId}`,
          conductor: unidad?.conductor ?? '—',
          hora: new Date(a.createdAt).toLocaleTimeString('es-PE', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          nivel: nivelDesdeTipo(a.alertType),
          resuelta: a.status !== 'ACTIVE',
        };
      });
  });

  get activasCnt() {
    return this.unidades().filter((u) => u.estado === 'ACTIVO' || u.estado === 'ALERTA').length;
  }
  get alertaCnt() {
    return this.alertsService.activas().length;
  }
  get pasajerosCnt() {
    return this.unidades().reduce((s, u) => s + u.pasajeros, 0);
  }

  nivelColor(n: string) {
    return n === 'CRITICO'
      ? '#e8002a'
      : n === 'ALTO'
        ? '#ff6d00'
        : n === 'MEDIO'
          ? '#f0a000'
          : '#888';
  }
  estadoColor(e: string) {
    return e === 'ACTIVO' ? 'var(--sb-accent)' : e === 'ALERTA' ? '#e8002a' : 'var(--sb-gray)';
  }

  resolverAlerta(id: number) {
    this.fleet.resolverAlerta(id);
    this.alertsService.recargar();
  }

  private map: any;
  private markers = new Map<number, any>();
  private renderInterval: ReturnType<typeof setInterval> | null = null;

  ngAfterViewInit() {
    this.map = L.map('monitoring-map').setView([-12.06, -77.04], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.renderMarcadores();
    this.renderInterval = setInterval(() => this.renderMarcadores(), 2000);
  }

  private renderMarcadores() {
    for (const u of this.unidades()) {
      const color = u.estado === 'ALERTA' ? '#e8002a' : u.estado === 'ACTIVO' ? '#c8ff00' : '#888';
      let marker = this.markers.get(u.id);
      if (!marker) {
        const icon = L.divIcon({
          className: 'bus-marker-admin',
          html: `<div class="bus-dot" style="background:${color}"></div>`,
          iconSize: [16, 16],
        });
        marker = L.marker([u.lat, u.lng], { icon })
          .addTo(this.map)
          .bindTooltip(`${u.placa} — ${u.conductor}`);
        this.markers.set(u.id, marker);
      } else {
        marker.setLatLng([u.lat, u.lng]);
        const el: HTMLElement | null = marker.getElement()?.querySelector('.bus-dot') ?? null;
        if (el) el.style.background = color;
      }
    }
  }

  focarUnidad(placa: string) {
    const unidad = this.unidades().find((u) => u.placa === placa);
    if (unidad && this.map) {
      this.map.setView([unidad.lat, unidad.lng], 16, { animate: true });
      this.markers.get(unidad.id)?.openTooltip();
    }
  }

  ngOnDestroy() {
    if (this.renderInterval) clearInterval(this.renderInterval);
    if (this.map) this.map.remove();
  }
}
