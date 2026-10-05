import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStateService } from './auth-state.service';
import { IamApi } from '../infrastructure/iam-api';

/**
 * Se ejecuta en cada navegación a una ruta de conductor y vuelve a preguntarle
 * al backend por el estado real del conductor (por si un admin lo desactivó o
 * eliminó mientras la sesión seguía abierta en el navegador).
 */
export const conductorAuthGuard: CanActivateFn = () => {
  const state = inject(AuthStateService);
  const api = inject(IamApi);
  const router = inject(Router);

  const actual = state.conductorActual();
  if (!actual) {
    return router.createUrlTree(['/conductor/login']);
  }

  return api.verifyByCode(actual.codigoEmpleado).pipe(
    map((c) => {
      if (c && c.estado === 'ACTIVO') {
        state.setConductor(c);
        return true;
      }
      state.clearConductor();
      return router.createUrlTree(['/conductor/login']);
    }),
    catchError(() => {
      state.clearConductor();
      return of(router.createUrlTree(['/conductor/login']));
    }),
  );
};
