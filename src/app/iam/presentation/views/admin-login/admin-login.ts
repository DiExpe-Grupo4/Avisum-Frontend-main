import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AdminAuthStateService, ADMIN_CODE } from '../../../application/admin-auth-state.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private router = inject(Router);
  private adminState = inject(AdminAuthStateService);

  codigoAdmin = signal('');
  error = signal(false);

  private normalizeCode(raw: string): string {
    return raw.trim().toUpperCase().replace(/\s+/g, '');
  }

  verify() {
    const code = this.normalizeCode(this.codigoAdmin());
    if (code === ADMIN_CODE) {
      this.error.set(false);
      this.adminState.login();
      this.router.navigate(['/admin']);
      return;
    }
    this.error.set(true);
  }
}
