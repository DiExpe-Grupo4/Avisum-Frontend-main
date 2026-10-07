import { Component, inject, signal, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { UsersStateService } from '../../../application/users-state.service';
import { Driver } from '../../../domain/model/driver.entity';
import { FleetTrackingService } from '../../../../shared/infrastructure/fleet-tracking.service';

type FormMode = 'crear' | 'editar';
type ConfirmAction = 'desactivar' | 'reactivar' | 'eliminar';

@Component({
  selector: 'app-driver-management',
  standalone: true,
  imports: [MatIconModule, FormsModule],
  templateUrl: './driver-management.html',
  styleUrl: './driver-management.css',
})
export class DriverManagement implements OnInit {
  readonly state = inject(UsersStateService);
  private fleet = inject(FleetTrackingService);

  searchTerm = this.state.searchTerm;
  filtered = this.state.filtered;
  activosCount = this.state.activosCount;

  showFormModal = signal(false);
  formMode = signal<FormMode>('crear');
  editingId = signal<number | null>(null);
  saving = signal(false);

  fNombre = signal('');
  fApellido = signal('');
  fDni = signal('');
  fEmail = signal('');
  fPassword = signal('');
  fPlaca = signal('');
  fRuta = signal('');

  formErrors = signal<Record<string, string>>({});

  showConfirmModal = signal(false);
  confirmAction = signal<ConfirmAction>('desactivar');
  confirmTarget = signal<Driver | null>(null);
  confirmStep = signal<1 | 2>(1);

  toastMsg = signal<string | null>(null);

  ngOnInit() {
    this.state.cargar();
  }

  estadoColor(e: string) {
    return e === 'ACTIVO'
      ? 'var(--sb-accent)'
      : e === 'INACTIVO'
        ? 'var(--sb-gray)'
        : 'var(--sb-red)';
  }

  abrirCrear() {
    this.formMode.set('crear');
    this.editingId.set(null);
    this.fNombre.set('');
    this.fApellido.set('');
    this.fDni.set('');
    this.fEmail.set('');
    this.fPassword.set('');
    this.fPlaca.set('');
    this.fRuta.set('');
    this.formErrors.set({});
    this.showFormModal.set(true);
  }

  abrirEditar(c: Driver) {
    this.formMode.set('editar');
    this.editingId.set(c.id);
    this.fNombre.set(c.nombre);
    this.fApellido.set(c.apellido);
    this.fDni.set(c.dni);
    this.fEmail.set(c.email);
    this.fPassword.set('');
    this.formErrors.set({});
    this.showFormModal.set(true);
  }

  cerrarForm() {
    this.showFormModal.set(false);
  }

  private validarForm(): boolean {
    const errors: Record<string, string> = {};
    if (!this.fNombre().trim()) errors['nombre'] = 'El nombre es obligatorio';
    if (!this.fApellido().trim()) errors['apellido'] = 'El apellido es obligatorio';
    if (!/^\d{8}$/.test(this.fDni().trim())) errors['dni'] = 'El DNI debe tener 8 dígitos';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.fEmail().trim()))
      errors['email'] = 'Correo inválido';
    if (this.formMode() === 'crear' && this.fPassword().trim().length < 6) {
      errors['password'] = 'La contraseña debe tener al menos 6 caracteres';
    }
    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  guardar() {
    if (!this.validarForm()) return;
    this.saving.set(true);

    const datosBase = {
      nombre: this.fNombre().trim(),
      apellido: this.fApellido().trim(),
      dni: this.fDni().trim(),
      email: this.fEmail().trim(),
    };

    if (this.formMode() === 'crear') {
      this.state.crear(
        {
          ...datosBase,
          password: this.fPassword().trim(),
          placa: this.fPlaca().trim(),
          ruta: this.fRuta().trim(),
        },
        (err) => {
          this.saving.set(false);
          if (err) {
            this.formErrors.set({ general: err });
            return;
          }
          this.showFormModal.set(false);
          this.fleet.recargar();
          this.mostrarToast('Conductor creado correctamente');
        },
      );
    } else {
      const id = this.editingId();
      if (id == null) return;
      this.state.editar(id, datosBase, (err) => {
        this.saving.set(false);
        if (err) {
          this.formErrors.set({ general: err });
          return;
        }
        this.showFormModal.set(false);
        this.mostrarToast('Conductor actualizado correctamente');
      });
    }
  }

  pedirConfirmacion(c: Driver, accion: ConfirmAction) {
    this.confirmTarget.set(c);
    this.confirmAction.set(accion);
    this.confirmStep.set(1);
    this.showConfirmModal.set(true);
  }

  avanzarConfirmacion() {
    if (this.confirmAction() === 'eliminar' && this.confirmStep() === 1) {
      this.confirmStep.set(2);
      return;
    }
    this.ejecutarConfirmacion();
  }

  cancelarConfirmacion() {
    this.showConfirmModal.set(false);
  }

  private ejecutarConfirmacion() {
    const target = this.confirmTarget();
    if (!target) return;
    const accion = this.confirmAction();

    const onDone = (err?: string) => {
      this.showConfirmModal.set(false);
      if (err) {
        this.mostrarToast(err);
        return;
      }
      const mensajes: Record<ConfirmAction, string> = {
        desactivar: 'Conductor desactivado',
        reactivar: 'Conductor reactivado',
        eliminar: 'Conductor eliminado',
      };
      this.mostrarToast(mensajes[accion]);
    };

    if (accion === 'desactivar') this.state.desactivar(target.id, onDone);
    else if (accion === 'reactivar') this.state.reactivar(target.id, onDone);
    else this.state.eliminar(target.id, onDone);
  }

  private mostrarToast(msg: string) {
    this.toastMsg.set(msg);
    setTimeout(() => this.toastMsg.set(null), 3000);
  }
}
