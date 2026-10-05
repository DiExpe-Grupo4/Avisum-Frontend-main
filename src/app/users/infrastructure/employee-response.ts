export interface EmployeeResponse {
  id: number;
  employeeCode: string;
  fullName: string;
  email: string;
  role: string;
  dni: string;
  active: boolean;
  deleted: boolean;
}

export interface CreateEmployeeRequest {
  fullName: string;
  email: string;
  password: string;
  role: string;
  dni: string;
}

export interface UpdateEmployeeRequest {
  fullName: string;
  email: string;
  role: string;
  dni: string;
}
