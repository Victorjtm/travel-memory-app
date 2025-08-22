import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

  // Crear un nuevo viaje previsto CON IMAGEN
  crearViaje(viaje: any, imagen?: File): Observable<any> {
    const formData = new FormData();
    
    // Agregar todos los campos del viaje al FormData
    formData.append('nombre', viaje.nombre);
    formData.append('destino', viaje.destino);
    formData.append('fecha_inicio', viaje.fecha_inicio);
    formData.append('fecha_fin', viaje.fecha_fin);
    formData.append('descripcion', viaje.descripcion || '');
    
    // Si hay imagen, agregarla
    if (imagen) {
      formData.append('imagen', imagen);
    }

    return this.http.post<any>(this.apiUrl, formData);
  }

  // Actualizar un viaje previsto CON IMAGEN
  actualizarViaje(id: number, viaje: any, imagen?: File): Observable<any> {
    const formData = new FormData();
    
    // Agregar todos los campos del viaje al FormData
    formData.append('nombre', viaje.nombre);
    formData.append('destino', viaje.destino);
    formData.append('fecha_inicio', viaje.fecha_inicio);
    formData.append('fecha_fin', viaje.fecha_fin);
    formData.append('descripcion', viaje.descripcion || '');
    formData.append('imagen_actual', viaje.imagen || ''); // Para mantener imagen actual si no se cambia
    
    // Si hay nueva imagen, agregarla
    if (imagen) {
      formData.append('imagen', imagen);
    }

    return this.http.put<any>(`${this.apiUrl}/${id}`, formData);
  }

  // Eliminar un viaje previsto
  eliminarViaje(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}