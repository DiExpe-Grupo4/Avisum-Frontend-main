import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthStateService } from '../../../application/auth-state.service';
import { ShiftTrackingService } from '../../../../monitoring/application/shift-tracking.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';

@Component({
  selector: 'app-access-authorized',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './access-authorized.html',
  styleUrl: './access-authorized.css',
})
export class AccessAuthorized implements OnInit {
  private router = inject(Router);
  private state = inject(AuthStateService);
  private shift = inject(ShiftTrackingService);
  private fleet = inject(FleetTrackingService);

  coords = signal('4.7110° N, 74.0721° W');
  centralOk = signal(true);
  recording = signal(true);
  error = signal<string | null>(null);

  ngOnInit() {
    const c = this.state.conductorActual();
    if (!c) {
      this.router.navigate(['/conductor/login']);
      return;
    }

    const unidad = this.fleet.getUnidadByCodigo(c.codigoEmpleado);
    if (unidad) {
      this.shift.iniciarTurno(c, unidad.placa);
      return;
    }

    // Puede que la unidad se haya creado recién y el servicio aún no la tenga en memoria: recargamos una vez.
    this.fleet.recargar(() => {
      const unidadRecargada = this.fleet.getUnidadByCodigo(c.codigoEmpleado);
      if (unidadRecargada) {
        this.shift.iniciarTurno(c, unidadRecargada.placa);
      } else {
        console.error(
          'No hay una unidad asignada a este conductor en FleetTrackingService:',
          c.codigoEmpleado,
        );
        this.error.set(
          'No se encontró una unidad asignada a tu cuenta. Contacta al administrador.',
        );
      }
    });
  }

  volverAlLogin() {
    this.router.navigate(['/conductor/login']);
  }

  continue() {
    this.router.navigate(['/conductor/dashboard']);
  }
}
