import { Driver } from '../domain/model/driver.entity';
import { EmployeeResponse } from './employee-response';

export function employeeResponseToDriver(r: EmployeeResponse): Driver {
  const partes = r.fullName.trim().split(/\s+/);
  const nombre = partes[0] ?? '';
  const apellido = partes.slice(1).join(' ');

  return new Driver({
    id: r.id,
    nombre,
    apellido,
    dni: r.dni,
    codigoEmpleado: r.employeeCode,
    email: r.email,
    role: r.role,
    estado: r.deleted ? 'ELIMINADO' : r.active ? 'ACTIVO' : 'INACTIVO',
  });
}
