import { BaseEntity } from '../../../shared/infrastructure/base-entity';

export class Driver implements BaseEntity {
  private _id: number;
  private _nombre: string;
  private _apellido: string;
  private _dni: string;
  private _codigoEmpleado: string;
  private _email: string;
  private _role: string;
  private _estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';

  constructor(props: {
    id: number;
    nombre: string;
    apellido: string;
    dni: string;
    codigoEmpleado: string;
    email: string;
    role: string;
    estado: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO';
  }) {
    this._id = props.id;
    this._nombre = props.nombre;
    this._apellido = props.apellido;
    this._dni = props.dni;
    this._codigoEmpleado = props.codigoEmpleado;
    this._email = props.email;
    this._role = props.role;
    this._estado = props.estado;
  }

  get id(): number {
    return this._id;
  }
  set id(v: number) {
    this._id = v;
  }
  get nombre(): string {
    return this._nombre;
  }
  set nombre(v: string) {
    this._nombre = v;
  }
  get apellido(): string {
    return this._apellido;
  }
  set apellido(v: string) {
    this._apellido = v;
  }
  get dni(): string {
    return this._dni;
  }
  set dni(v: string) {
    this._dni = v;
  }
  get codigoEmpleado(): string {
    return this._codigoEmpleado;
  }
  set codigoEmpleado(v: string) {
    this._codigoEmpleado = v;
  }
  get email(): string {
    return this._email;
  }
  set email(v: string) {
    this._email = v;
  }
  get role(): string {
    return this._role;
  }
  set role(v: string) {
    this._role = v;
  }
  get estado(): 'ACTIVO' | 'INACTIVO' | 'ELIMINADO' {
    return this._estado;
  }
  set estado(v: 'ACTIVO' | 'INACTIVO' | 'ELIMINADO') {
    this._estado = v;
  }

  get nombreCompleto(): string {
    return `${this._nombre} ${this._apellido}`.trim();
  }

  get iniciales(): string {
    const a = this._nombre?.charAt(0) ?? '';
    const b = this._apellido?.charAt(0) ?? '';
    return (a + b).toUpperCase() || '--';
  }
}
