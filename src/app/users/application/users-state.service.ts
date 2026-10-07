import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { Driver } from '../domain/model/driver.entity';
import { EmployeesApiEndpoint } from '../infrastructure/employees-api-endpoint';
import { employeeResponseToDriver } from '../infrastructure/employee-assembler';
import { CreateEmployeeRequest, UpdateEmployeeRequest } from '../infrastructure/employee-response';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UsersStateService {
  private api = inject(EmployeesApiEndpoint);
  private http = inject(HttpClient);

  readonly conductores = signal<Driver[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly searchTerm = signal('');

  readonly filtered = computed(() => {
    const t = this.searchTerm().toLowerCase().trim();
    const visibles = this.conductores().filter((c) => c.estado !== 'ELIMINADO');
    if (!t) return visibles;
    return visibles.filter(
      (c) =>
        c.nombre.toLowerCase().includes(t) ||
        c.apellido.toLowerCase().includes(t) ||
        c.dni.includes(t) ||
        c.codigoEmpleado.toLowerCase().includes(t),
    );
  });

  readonly activosCount = computed(
    () => this.conductores().filter((c) => c.estado === 'ACTIVO').length,
  );

  cargar(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAll().subscribe({
      next: (resp) => {
        const soloConductores = resp.filter((r) => r.role === 'CONDUCTOR');
        this.conductores.set(soloConductores.map(employeeResponseToDriver));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de conductores.');
        this.loading.set(false);
      },
    });
  }

  getConductores(): Driver[] {
    return this.conductores();
  }

  crear(
    data: {
      nombre: string;
      apellido: string;
      dni: string;
      email: string;
      password: string;
      placa?: string;
      ruta?: string;
    },
    onDone: (err?: string) => void,
  ) {
    const req: CreateEmployeeRequest = {
      fullName: `${data.nombre} ${data.apellido}`.trim(),
      email: data.email,
      password: data.password,
      role: 'CONDUCTOR',
      dni: data.dni,
    };
    this.api.create(req).subscribe({
      next: (empleado) => {
        this.crearUnidadParaConductor(empleado.id, data.placa, data.ruta);
        this.cargar();
        onDone();
      },
      error: (err) => onDone(this.extraerError(err)),
    });
  }

  /** Crea la unidad para el conductor recién creado. Si el admin no especificó placa/ruta, usa valores automáticos. */
  private crearUnidadParaConductor(employeeId: number, placa?: string, ruta?: string) {
    const plate = placa?.trim() || `BUS-${String(employeeId).padStart(3, '0')}`;
    this.http
      .post(`${environment.platformProviderApiBaseUrl}/bus-units`, {
        plateNumber: plate,
        route: ruta?.trim() || 'Por asignar',
        latitude: -12.0464,
        longitude: -77.0428,
        assignedEmployeeId: employeeId,
      })
      .pipe(
        catchError((err) => {
          console.error('No se pudo crear la unidad automática para el conductor', employeeId, err);
          return of(null);
        }),
      )
      .subscribe();
  }

  editar(
    id: number,
    data: { nombre: string; apellido: string; dni: string; email: string },
    onDone: (err?: string) => void,
  ) {
    const req: UpdateEmployeeRequest = {
      fullName: `${data.nombre} ${data.apellido}`.trim(),
      email: data.email,
      role: 'CONDUCTOR',
      dni: data.dni,
    };
    this.api.update(id, req).subscribe({
      next: () => {
        this.cargar();
        onDone();
      },
      error: (err) => onDone(this.extraerError(err)),
    });
  }

  desactivar(id: number, onDone: (err?: string) => void) {
    this.api.deactivate(id).subscribe({
      next: () => {
        this.cargar();
        onDone();
      },
      error: (err) => onDone(this.extraerError(err)),
    });
  }

  reactivar(id: number, onDone: (err?: string) => void) {
    this.api.reactivate(id).subscribe({
      next: () => {
        this.cargar();
        onDone();
      },
      error: (err) => onDone(this.extraerError(err)),
    });
  }

  eliminar(id: number, onDone: (err?: string) => void) {
    this.api.delete(id).subscribe({
      next: () => {
        this.cargar();
        onDone();
      },
      error: (err) => onDone(this.extraerError(err)),
    });
  }

  private extraerError(err: any): string {
    if (typeof err?.error === 'string') return err.error;
    return 'Ocurrió un error. Intenta de nuevo.';
  }
}
