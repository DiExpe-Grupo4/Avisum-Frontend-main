import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AdminAuthStateService } from './admin-auth-state.service';

export const adminAuthGuard: CanActivateFn = () => {
  const admin = inject(AdminAuthStateService);
  const router = inject(Router);
  if (admin.activo()) return true;
  return router.createUrlTree(['/admin/login']);
};
