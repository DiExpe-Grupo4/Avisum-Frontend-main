import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Driver } from '../../users/domain/model/driver.entity';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IamApi {
  private http = inject(HttpClient);

  /** Verifica la identidad de un conductor a partir de su código de empleado. */
  verifyByCode(codigo: string): Observable<Driver | null> {
    const url = `${environment.platformProviderApiBaseUrl}/employees/code/${codigo}`;
    return this.http
      .get<any>(url)
      .pipe(map((response) => (response ? this.mapEmployeeToDriver(response) : null)));
  }

  private mapEmployeeToDriver(employee: any): Driver {
    const partes = (employee.fullName ?? '').trim().split(/\s+/);
    const nombre = partes.shift() ?? employee.fullName ?? '';
    const apellido = partes.join(' ');
    const estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' = employee.deleted
      ? 'ELIMINADO'
      : employee.active
        ? 'ACTIVO'
        : 'INACTIVO';

    return new Driver({
      id: employee.id,
      nombre,
      apellido,
      dni: employee.dni ?? '',
      codigoEmpleado: employee.employeeCode,
      email: employee.email ?? '',
      role: employee.role ?? 'CONDUCTOR',
      estado,
    });
  }
}
