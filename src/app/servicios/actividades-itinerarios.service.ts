import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActividadesItinerariosService {
  private apiUrl = `${environment.apiUrl}/actividades`;

  constructor(private http: HttpClient) { }

  create(actividad: any): Observable<any> {
    return this.http.post(this.apiUrl, actividad);
  }

  update(id: number, actividad: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, actividad);
  }

  getById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getByItinerario(itinerarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?itinerarioId=${itinerarioId}`);
  }

  getByViajeYItinerario(viajePrevistoId: number, itinerarioId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}?viajePrevistoId=${viajePrevistoId}&itinerarioId=${itinerarioId}`);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}