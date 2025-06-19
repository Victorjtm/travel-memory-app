import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // Importa el environment

@Injectable({
  providedIn: 'root'
})
export class ViajesPrevistosService {

  private apiUrl = `${environment.apiUrl}/viajes`;

  constructor(private http: HttpClient) {}

  // Obtener un viaje por id
  obtenerViaje(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Obtener todos los viajes previstos
  obtenerViajes(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Crear un nuevo viaje previsto
  crearViaje(viaje: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, viaje);
  }

  // Actualizar un viaje previsto
  actualizarViaje(id: number, viaje: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, viaje);
  }

  // Eliminar un viaje previsto
  eliminarViaje(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}