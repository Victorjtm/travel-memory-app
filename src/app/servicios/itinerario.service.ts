import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Itinerario } from '../modelos/viaje-previsto.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItinerarioService {

  private apiUrl = `${environment.apiUrl}/itinerarios`;

  constructor(private http: HttpClient) { }

  // Obtener todos los itinerarios
  getItinerarios(viajePrevistoId?: number): Observable<Itinerario[]> {
    const url = viajePrevistoId ? `${this.apiUrl}?viajePrevistoId=${viajePrevistoId}` : this.apiUrl;
    return this.http.get<Itinerario[]>(url);
  }

  // Crear un nuevo itinerario
  crearItinerario(itinerario: Itinerario): Observable<Itinerario> {
    return this.http.post<Itinerario>(this.apiUrl, itinerario);
  }

  // Actualizar un itinerario
  actualizarItinerario(id: number, itinerario: Itinerario): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, itinerario);
  }

  // Eliminar un itinerario
  eliminarItinerario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}