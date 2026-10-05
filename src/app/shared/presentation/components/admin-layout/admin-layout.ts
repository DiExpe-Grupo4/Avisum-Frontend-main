import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AlertsNotificationService } from '../../../infrastructure/alerts-notification.service';
import { AdminAuthStateService } from '../../../../iam/application/admin-auth-state.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css',
})
export class AdminLayout {
  private router = inject(Router);
  private adminAuth = inject(AdminAuthStateService);
  alerts = inject(AlertsNotificationService);

  navItems = signal([
    { icon: 'location_on', label: 'CENTRO DE CONTROL', route: '/admin/control-center' },
    { icon: 'people', label: 'GESTIÓN CONDUCTORES', route: '/admin/drivers' },
    { icon: 'directions_bus', label: 'ASIG. UNIDADES', route: '/admin/units' },
    { icon: 'terminal', label: 'API CONSOLE', route: '/admin/api-console' },
    { icon: 'notifications', label: 'NOTIFICACIONES', route: '/admin/notifications' },
    { icon: 'history', label: 'HISTORIAL TURNOS', route: '/admin/shifts' },
    { icon: 'bar_chart', label: 'IMPACTO NÚMEROS', route: '/admin/impact' },
  ]);

  irANotificaciones() {
    this.router.navigate(['/admin/notifications']);
  }

  cerrarSesion() {
    this.adminAuth.logout();
    this.router.navigate(['/conductor/login']);
  }
}
