import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ActividadesDisponibles } from '../modelos/actividades-disponibles.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActividadesDisponiblesService {
  private apiUrl = `${environment.apiUrl}/actividades-disponibles`;

  constructor(private http: HttpClient) {}

  obtenerTodos(): Observable<ActividadesDisponibles[]> {
    return this.http.get<ActividadesDisponibles[]>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<ActividadesDisponibles> {
    return this.http.get<ActividadesDisponibles>(`${this.apiUrl}/${id}`);
  }

  crear(actividad: ActividadesDisponibles): Observable<ActividadesDisponibles> {
    return this.http.post<ActividadesDisponibles>(this.apiUrl, actividad);
  }

  actualizar(id: number, actividad: ActividadesDisponibles): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, actividad);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getActividadesDisponibles(tipoActividadId: number): Observable<ActividadesDisponibles[]> {
    return this.http.get<ActividadesDisponibles[]>(`${this.apiUrl}?tipoActividadId=${tipoActividadId}`);
  }
}