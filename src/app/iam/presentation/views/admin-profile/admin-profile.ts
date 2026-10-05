import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="profile-root">
      <h2 class="page-title">MI PERFIL</h2>
      <div class="sb-card profile-card">
        <mat-icon class="profile-avatar">account_circle</mat-icon>
        <div class="profile-info">
          <p class="profile-name">Administrador del Sistema</p>
          <p class="profile-role">Panel de Control — Avisum</p>
          <p class="profile-code">Código de acceso: ADMIN-001</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-root {
        padding: 20px;
      }
      .page-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 900;
        font-size: 22px;
        color: var(--sb-white);
        margin-bottom: 20px;
      }
      .profile-card {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px;
        max-width: 420px;
      }
      .profile-avatar {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: var(--sb-accent);
      }
      .profile-name {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        font-size: 16px;
        color: var(--sb-white);
      }
      .profile-role,
      .profile-code {
        font-size: 12px;
        color: var(--sb-gray);
        margin-top: 4px;
      }
    `,
  ],
})
export class AdminProfile {}
