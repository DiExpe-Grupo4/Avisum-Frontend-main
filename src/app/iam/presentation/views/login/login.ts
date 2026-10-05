import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { IamApi } from '../../../infrastructure/iam-api';
import { AuthStateService } from '../../../application/auth-state.service';
import { AdminAuthStateService, ADMIN_CODE } from '../../../application/admin-auth-state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private router = inject(Router);
  private api = inject(IamApi);
  private state = inject(AuthStateService);
  private adminState = inject(AdminAuthStateService);

  codigoEmpleado = signal('');
  errors = signal<string[]>([]);
  loading = signal(false);

  // 'conflict' queda listo para cuando se implemente la validación de unidad duplicada.
  readonly errorList = [
    {
      key: 'invalid',
      icon: 'error',
      color: '#e8002a',
      title: 'Código inválido',
      desc: 'La firma digital no coincide con los registros actuales.',
    },
    {
      key: 'unauthorized',
      icon: 'info',
      color: '#f0a000',
      title: 'Conductor no autorizado',
      desc: 'Su perfil no tiene permisos para esta zona operativa.',
    },
    {
      key: 'conflict',
      icon: 'warning',
      color: '#f0a000',
      title: 'Conflicto de vehículo',
      desc: 'El vehículo #SB-902 ya tiene un conductor asignado.',
    },
  ];

  openScanner() {
    this.router.navigate(['/conductor/qr-scanner']);
  }

  /** Normaliza el código: sin espacios, mayúsculas, acepta el prefijo "QR-". */
  private normalizeCode(raw: string): string {
    let code = raw.trim().toUpperCase().replace(/\s+/g, '');
    if (code.startsWith('QR-')) {
      code = code.slice(3);
    }
    return code;
  }

  verify() {
    const code = this.normalizeCode(this.codigoEmpleado());
    if (!code) {
      this.errors.set(['invalid']);
      return;
    }

    // Código especial de administrador: no pasa por el backend de conductores.
    if (code === ADMIN_CODE) {
      this.adminState.login();
      this.router.navigate(['/admin']);
      return;
    }

    this.loading.set(true);
    this.errors.set([]);
    this.api.verifyByCode(code).subscribe({
      next: (conductor) => {
        this.loading.set(false);

        // No existe, o fue eliminado: se trata igual, como si nunca hubiera existido.
        if (!conductor || conductor.estado === 'ELIMINADO') {
          this.errors.set(['invalid']);
          return;
        }

        // Existe pero está inhabilitado por el admin.
        if (conductor.estado !== 'ACTIVO') {
          this.errors.set(['unauthorized']);
          return;
        }

        this.state.setConductor(conductor);
        this.router.navigate(['/conductor/access-authorized']);
      },
      error: () => {
        this.loading.set(false);
        this.errors.set(['invalid']);
      },
    });
  }
}
