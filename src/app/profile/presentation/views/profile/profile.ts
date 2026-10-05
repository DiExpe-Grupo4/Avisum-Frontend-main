import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AuthStateService } from '../../../../iam/application/auth-state.service';
import { ShiftTrackingService } from '../../../../monitoring/application/shift-tracking.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [MatIconModule, RouterLink, DecimalPipe],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  private router = inject(Router);
  private fleet = inject(FleetTrackingService);
  readonly auth = inject(AuthStateService);
  readonly shift = inject(ShiftTrackingService);

  conductor = this.auth.conductorActual;

  initials(): string {
    const c = this.conductor();
    if (!c) return '';
    return `${c.nombre.charAt(0)}${c.apellido.charAt(0)}`.toUpperCase();
  }

  placaUnidad(): string {
    const c = this.conductor();
    if (!c) return '—';
    return this.fleet.getUnidadByCodigo(c.codigoEmpleado)?.placa ?? '—';
  }

  logout() {
    this.auth.clearConductor();
    this.router.navigate(['/conductor/login']);
  }
}
