import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'avisum_admin_session';
export const ADMIN_CODE = 'ADMIN-001';

@Injectable({ providedIn: 'root' })
export class AdminAuthStateService {
  readonly activo = signal<boolean>(sessionStorage.getItem(STORAGE_KEY) === 'true');

  login() {
    this.activo.set(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  }

  logout() {
    this.activo.set(false);
    sessionStorage.removeItem(STORAGE_KEY);
  }
}
