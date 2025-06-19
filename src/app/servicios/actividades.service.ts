import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Archivo } from '../modelos/archivo';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ArchivoService {

  private apiUrl = `${environment.apiUrl}/archivos`;

  constructor(private http: HttpClient) {}

  // Obtener archivo individual
  getArchivo(id: number): Observable<Archivo> {
    return this.http.get<Archivo>(`${this.apiUrl}/${id}`);
  }

  // Obtener archivos por actividad
  getArchivosPorActividad(actividadId: number): Observable<Archivo[]> {
    return this.http.get<Archivo[]>(`${this.apiUrl}?actividadId=${actividadId}`);
  }

  // Subir múltiples archivos (formData con varios archivos)
  subirArchivos(formData: FormData): Observable<Archivo[]> {
    return this.http.post<Archivo[]>(`${this.apiUrl}/subir`, formData);
  }

  // Actualizar metadatos y archivo físico (formData con archivo + campos)
  actualizarArchivoConArchivo(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/archivo`, formData);
  }

  // Actualizar solo metadatos
  actualizarArchivo(id: number, datos: Partial<Archivo>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, datos);
  }

  // Descargar archivo
  descargarArchivo(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/descargar`, {
      responseType: 'blob'
    });
  }

  // Eliminar archivo
  eliminarArchivo(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}