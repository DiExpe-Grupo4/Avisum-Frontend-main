import { Component, inject, signal, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { IamApi } from '../../../../iam/infrastructure/iam-api';
import { AuthStateService } from '../../../../iam/application/auth-state.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';
import { Driver } from '../../../../users/domain/model/driver.entity';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.css',
})
export class QrScanner implements OnDestroy {
  private router = inject(Router);
  private api = inject(IamApi);
  private state = inject(AuthStateService);
  private fleet = inject(FleetTrackingService);

  manualCode = signal('');
  scanning = signal(true);
  conductorFound = signal<Driver | null>(null);
  scanLine = signal(0);
  errorMsg = signal('');

  private codigosRegistrados = [
    'EMP-001',
    'EMP-002',
    'EMP-003',
    'EMP-004',
    'EMP-005',
    'EMP-006',
    'EMP-007',
  ];

  private interval: ReturnType<typeof setInterval>;
  private autoScanTimeout: ReturnType<typeof setTimeout>;

  constructor() {
    this.interval = setInterval(() => {
      this.scanLine.update((v) => (v + 3) % 100);
    }, 30);

    this.autoScanTimeout = setTimeout(() => this.simulateScan(), 3000);
  }

  private normalizeCode(raw: string): string {
    let code = raw.trim().toUpperCase().replace(/\s+/g, '');
    if (code.startsWith('QR-')) {
      code = code.slice(3);
    }
    return code;
  }

  placaDe(c: Driver): string {
    return this.fleet.getUnidadByCodigo(c.codigoEmpleado)?.placa ?? '—';
  }

  private simulateScan() {
    if (this.conductorFound()) return;

    const codigoAleatorio =
      this.codigosRegistrados[Math.floor(Math.random() * this.codigosRegistrados.length)];
    this.api.verifyByCode(codigoAleatorio).subscribe({
      next: (c) => {
        if (c && c.estado === 'ACTIVO') {
          this.conductorFound.set(c);
          this.state.setConductor(c);
        }
      },
      error: () => {
        this.errorMsg.set('No se pudo validar el escaneo automático.');
      },
    });
  }

  validate() {
    const code = this.normalizeCode(this.manualCode());
    if (!code) return;
    this.errorMsg.set('');
    this.api.verifyByCode(code).subscribe({
      next: (c) => {
        if (!c || c.estado === 'ELIMINADO') {
          this.errorMsg.set('Código inválido.');
          return;
        }
        if (c.estado !== 'ACTIVO') {
          this.errorMsg.set('Conductor desactivado. Contacta al administrador.');
          return;
        }
        this.conductorFound.set(c);
        this.state.setConductor(c);
      },
      error: () => {
        this.errorMsg.set('Código inválido.');
      },
    });
  }

  startShift() {
    this.router.navigate(['/conductor/access-authorized']);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
    clearTimeout(this.autoScanTimeout);
  }
}
