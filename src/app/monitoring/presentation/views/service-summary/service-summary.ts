import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe, DatePipe } from '@angular/common';
import { ShiftTrackingService } from '../../../application/shift-tracking.service';
import { AuthStateService } from '../../../../iam/application/auth-state.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';
import { UsersStateService } from '../../../../users/application/users-state.service';

@Component({
  selector: 'app-service-summary',
  standalone: true,
  imports: [MatIconModule, DecimalPipe, DatePipe],
  templateUrl: './service-summary.html',
  styleUrl: './service-summary.css',
})
export class ServiceSummary {
  private router = inject(Router);
  private auth = inject(AuthStateService);
  private fleet = inject(FleetTrackingService);
  private users = inject(UsersStateService);
  readonly state = inject(ShiftTrackingService);

  get turno() {
    return this.state.turnoActual();
  }

  formatTime(s: number): string {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, '0');
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  }

  nombreConductor(): string {
    const t = this.turno;
    if (!t) return '—';
    const c = this.users.getConductores().find((c) => c.id === t.conductorId);
    return c ? c.nombreCompleto : `Conductor #${t.conductorId}`;
  }

  placaUnidad(): string {
    const t = this.turno;
    if (!t) return '—';
    const u = this.fleet.unidades().find((u) => u.id === Number(t.busId));
    return u ? u.placa : `Unidad #${t.busId}`;
  }

  velocidadPromedio(): number {
    const t = this.turno;
    if (!t || t.tiempoSegundos === 0) return 0;
    return +(t.distanciaKm / (t.tiempoSegundos / 3600)).toFixed(1);
  }

  montoPorPasajero(): number {
    const t = this.turno;
    if (!t || t.pasajeros === 0) return 0;
    return +(t.recaudacion / t.pasajeros).toFixed(2);
  }

  newService() {
    this.auth.clearConductor();
    this.state.resetTurno();
    this.router.navigate(['/conductor/login']);
  }
}
