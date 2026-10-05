import { Injectable, signal, inject } from '@angular/core';
import { Driver } from '../../users/domain/model/driver.entity';
import { FleetTrackingService } from '../../shared/infrastructure/fleet-tracking.service';
import { IamApi } from '../infrastructure/iam-api';

const STORAGE_KEY = 'avisum_codigo_empleado';

@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private fleet = inject(FleetTrackingService);
  private api = inject(IamApi);

  readonly conductorActual = signal<Driver | null>(null);

  private readyPromise: Promise<Driver | null>;
  private resolveReady!: (d: Driver | null) => void;

  constructor() {
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.restaurarSesion();
  }

  setConductor(c: Driver) {
    this.conductorActual.set(c);
    this.fleet.setCodigoPropio(c.codigoEmpleado);
    sessionStorage.setItem(STORAGE_KEY, c.codigoEmpleado);
  }

  clearConductor() {
    this.conductorActual.set(null);
    this.fleet.setCodigoPropio(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Se resuelve una vez que ya se intento restaurar la sesion desde sessionStorage
   * (relevante justo despues de un F5). Devuelve el conductor si se recupero, o null.
   */
  whenReady(): Promise<Driver | null> {
    return this.readyPromise;
  }

  private restaurarSesion() {
    const codigo = sessionStorage.getItem(STORAGE_KEY);
    if (!codigo) {
      this.resolveReady(null);
      return;
    }

    this.api.verifyByCode(codigo).subscribe({
      next: (c) => {
        if (c && c.estado === 'ACTIVO') {
          this.conductorActual.set(c);
          this.fleet.setCodigoPropio(c.codigoEmpleado);
          this.resolveReady(c);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          this.resolveReady(null);
        }
      },
      error: () => {
        sessionStorage.removeItem(STORAGE_KEY);
        this.resolveReady(null);
      },
    });
  }
}
