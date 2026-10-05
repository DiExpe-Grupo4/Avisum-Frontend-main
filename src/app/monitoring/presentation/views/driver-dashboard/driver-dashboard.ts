import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { ShiftTrackingService } from '../../../application/shift-tracking.service';
import { AuthStateService } from '../../../../iam/application/auth-state.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [MatIconModule, MatCheckboxModule, FormsModule, DecimalPipe],
  templateUrl: './driver-dashboard.html',
  styleUrl: './driver-dashboard.css',
})
export class DriverDashboard implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthStateService);
  private fleet = inject(FleetTrackingService);
  readonly state = inject(ShiftTrackingService);

  tiempoStr = this.state.tiempoStr;
  distancia = this.state.distanciaKm;
  pasajeros = this.state.pasajeros;
  recaudacion = this.state.recaudacion;

  checking = signal(true);

  /** 'confirm' = pidiendo confirmacion, 'success' = ya se finalizo de verdad. */
  finishStep = signal<'confirm' | 'success'>('confirm');
  showFinishModal = signal(false);

  gpsStatus = signal('ESTABLE');
  telStatus = signal('SINCRO');
  cloudStatus = signal('ACTIVA');

  async ngOnInit() {
    if (this.state.turnoActivo()) {
      this.checking.set(false);
      return;
    }

    const conductor = (await this.auth.whenReady()) ?? this.auth.conductorActual();
    const unidad = conductor ? this.fleet.getUnidadByCodigo(conductor.codigoEmpleado) : null;

    if (!conductor || !unidad) {
      this.router.navigate(['/conductor/login']);
      return;
    }

    this.state.recuperarTurnoSiExiste(conductor, unidad.placa, (recuperado) => {
      this.checking.set(false);
      if (!recuperado) {
        this.router.navigate(['/conductor/login']);
      }
    });
  }

  viewMap() {
    this.router.navigate(['/conductor/view-map']);
  }

  openFinish() {
    this.finishStep.set('confirm');
    this.showFinishModal.set(true);
  }

  cancelFinish() {
    this.showFinishModal.set(false);
  }

  /** Aqui es donde de verdad se finaliza el turno — al confirmar, no antes. */
  doFinalize() {
    this.state.finalizarTurno();
    this.finishStep.set('success');
  }

  verReporte() {
    this.showFinishModal.set(false);
    this.router.navigate(['/conductor/service-summary']);
  }

  salir() {
    this.auth.clearConductor();
    this.state.resetTurno();
    this.showFinishModal.set(false);
    this.router.navigate(['/conductor/login']);
  }
}
