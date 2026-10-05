import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AlertaBackend {
  id: number;
  employeeId: number;
  busUnitId: number;
  alertType: string;
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  description: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

const POLL_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AlertsNotificationService {
  private http = inject(HttpClient);
  private baseUrl = environment.platformProviderApiBaseUrl;

  readonly alertas = signal<AlertaBackend[]>([]);
  readonly activas = computed(() => this.alertas().filter((a) => a.status === 'ACTIVE'));
  readonly hayActivas = computed(() => this.activas().length > 0);

  constructor() {
    this.cargar();
    setInterval(() => this.cargar(), POLL_MS);
  }

  private cargar() {
    this.http
      .get<AlertaBackend[]>(`${this.baseUrl}/alerts`)
      .pipe(catchError(() => of([])))
      .subscribe((lista) => this.alertas.set(lista));
  }

  recargar() {
    this.cargar();
  }
}
