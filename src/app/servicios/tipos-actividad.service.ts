import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TipoActividad } from '../modelos/tipo-actividad.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TiposActividadService {
  private apiUrl = `${environment.apiUrl}/tipos-actividad`;

  constructor(private http: HttpClient) { }

  obtenerTodos(): Observable<TipoActividad[]> {
    return this.http.get<TipoActividad[]>(this.apiUrl);
  }

  crear(tipo: TipoActividad): Observable<TipoActividad> {
    return this.http.post<TipoActividad>(this.apiUrl, tipo);
  }

  actualizar(id: number, tipo: TipoActividad): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, tipo);
  }

  eliminar(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  obtenerPorId(id: number): Observable<TipoActividad> {
    return this.http.get<TipoActividad>(`${this.apiUrl}/${id}`);
  }

  getTiposActividad(): Observable<TipoActividad[]> {
    return this.http.get<TipoActividad[]>(this.apiUrl);
  }
}