import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateEmployeeRequest,
  EmployeeResponse,
  UpdateEmployeeRequest,
} from './employee-response';

@Injectable({ providedIn: 'root' })
export class EmployeesApiEndpoint {
  private http = inject(HttpClient);
  private baseUrl = `${environment.platformProviderApiBaseUrl}/employees`;

  getAll(): Observable<EmployeeResponse[]> {
    return this.http.get<EmployeeResponse[]>(this.baseUrl);
  }

  create(req: CreateEmployeeRequest): Observable<EmployeeResponse> {
    return this.http.post<EmployeeResponse>(this.baseUrl, req);
  }

  update(id: number, req: UpdateEmployeeRequest): Observable<EmployeeResponse> {
    return this.http.put<EmployeeResponse>(`${this.baseUrl}/${id}`, req);
  }

  deactivate(id: number): Observable<EmployeeResponse> {
    return this.http.patch<EmployeeResponse>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  reactivate(id: number): Observable<EmployeeResponse> {
    return this.http.patch<EmployeeResponse>(`${this.baseUrl}/${id}/reactivate`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
