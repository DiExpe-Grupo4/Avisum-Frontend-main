import { Component, signal, inject, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AlertsNotificationService } from '../../../../shared/infrastructure/alerts-notification.service';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [MatIconModule],
  template: ` <div class="notif-root">
    <h2 class="page-title">NOTIFICACIONES</h2>
    <div class="notif-grid">
      <div class="sb-card">
        <p class="section-label">DESTINATARIOS ACTIVOS</p>
        @for (r of recipients(); track r.id) {
          <div class="recip-row">
            <mat-icon [style.color]="r.active ? 'var(--sb-accent)' : 'var(--sb-gray)'">{{
              r.icon
            }}</mat-icon>
            <div class="recip-info">
              <p class="recip-name">{{ r.name }}</p>
              <p class="recip-type">{{ r.type }}</p>
            </div>
            <span
              class="recip-status"
              [style.color]="r.active ? 'var(--sb-accent)' : 'var(--sb-gray)'"
            >
              {{ r.active ? 'ACTIVO' : 'INACTIVO' }}
            </span>
          </div>
        }
      </div>
      <div class="sb-card">
        <p class="section-label">REGISTRO DE ENTREGAS</p>
        @for (n of notifs(); track n.id) {
          <div class="notif-row">
            <div
              class="notif-dot"
              [style.background]="n.tipo === 'PÁNICO' ? 'var(--sb-red)' : 'var(--sb-accent)'"
            ></div>
            <div>
              <p class="notif-msg">{{ n.mensaje }}</p>
              <p class="notif-hora">{{ n.hora }} — {{ n.bus }}</p>
            </div>
            <mat-icon [style.color]="n.entregado ? 'var(--sb-accent)' : 'var(--sb-gray)'">
              {{ n.entregado ? 'check_circle' : 'pending' }}
            </mat-icon>
          </div>
        } @empty {
          <p class="notif-vacio">Sin alertas registradas todavía.</p>
        }
      </div>
    </div>
  </div>`,
  styles: [
    `
      .notif-root {
        padding: 20px;
      }
      .page-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 900;
        font-size: 22px;
        color: var(--sb-white);
        margin-bottom: 20px;
      }
      .notif-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .section-label {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 11px;
        letter-spacing: 0.2em;
        color: var(--sb-gray);
        text-transform: uppercase;
        margin-bottom: 14px;
      }
      .recip-row,
      .notif-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid var(--sb-border);
      }
      .recip-row:last-child,
      .notif-row:last-child {
        border-bottom: none;
      }
      .recip-row mat-icon {
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
      .recip-info {
        flex: 1;
      }
      .recip-name {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        font-size: 13px;
        color: var(--sb-white);
      }
      .recip-type {
        font-size: 11px;
        color: var(--sb-gray);
      }
      .recip-status {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 800;
        font-size: 10px;
      }
      .notif-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .notif-msg {
        font-size: 12px;
        color: var(--sb-white);
        flex: 1;
      }
      .notif-hora {
        font-size: 10px;
        color: var(--sb-gray);
      }
      .notif-vacio {
        font-size: 12px;
        color: var(--sb-gray);
        padding: 10px 0;
      }
      @media (max-width: 768px) {
        .notif-root {
          padding: 14px;
        }
        .page-title {
          font-size: 20px;
          margin-bottom: 16px;
        }
        .notif-grid {
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .section-label {
          font-size: 12px;
          margin-bottom: 12px;
        }
        .recip-row,
        .notif-row {
          padding: 12px 0;
          gap: 14px;
        }
        .recip-row mat-icon {
          font-size: 26px;
          width: 26px;
          height: 26px;
        }
        .recip-name {
          font-size: 15px;
        }
        .recip-type {
          font-size: 12px;
        }
        .recip-status {
          font-size: 11px;
        }
        .notif-msg {
          font-size: 13px;
        }
        .notif-hora {
          font-size: 11px;
        }
      }
    `,
  ],
})
export class Notifications {
  private alertsService = inject(AlertsNotificationService);
  private fleet = inject(FleetTrackingService);

  recipients = signal([
    { id: 1, name: 'Central PNP Lima Norte', type: 'POLICÍA', icon: 'local_police', active: true },
    { id: 2, name: 'Central Avisum OPS', type: 'OPERACIONES', icon: 'headset_mic', active: true },
    { id: 3, name: 'Empresa Trans Lima SAC', type: 'EMPRESA', icon: 'business', active: true },
    { id: 4, name: 'Gerencia Operativa', type: 'GESTIÓN', icon: 'manage_accounts', active: false },
  ]);

  notifs = computed(() => {
    const unidades = this.fleet.unidades();
    return this.alertsService
      .alertas()
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((a) => {
        const unidad = unidades.find((u) => u.id === a.busUnitId);
        const bus = unidad?.placa ?? `UNIDAD-${a.busUnitId}`;
        const hora = new Date(a.createdAt).toLocaleTimeString('es-PE', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return {
          id: a.id,
          tipo: a.alertType,
          mensaje: a.description || `Alerta ${a.alertType} — ${bus}`,
          hora,
          bus,
          entregado: a.status !== 'ACTIVE',
        };
      });
  });
}
