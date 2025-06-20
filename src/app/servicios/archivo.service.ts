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

  constructor(private http: HttpClient) { }

  getArchivosPorActividad(actividadId: number): Observable<Archivo[]> {
    return this.http.get<Archivo[]>(`${this.apiUrl}?actividadId=${actividadId}`);
  }

  getArchivo(id: number): Observable<Archivo> {
    return this.http.get<Archivo>(`${this.apiUrl}/${id}`);
  }

  crearArchivo(archivo: Omit<Archivo, 'id'>): Observable<Archivo> {
    return this.http.post<Archivo>(this.apiUrl, archivo);
  }

  subirArchivos(formData: FormData): Observable<Archivo[]> {
    return this.http.post<Archivo[]>(`${this.apiUrl}/subir`, formData);
  }

  actualizarArchivo(id: number, archivo: Partial<Archivo>): Observable<{updated: number}> {
    return this.http.put<{updated: number}>(`${this.apiUrl}/${id}`, archivo);
  }

  actualizarArchivoConArchivo(id: number, formData: FormData): Observable<{updated: number}> {
    return this.http.put<{updated: number}>(`${this.apiUrl}/${id}/archivo`, formData);
  }

  eliminarArchivo(id: number): Observable<{deleted: number}> {
    return this.http.delete<{deleted: number}>(`${this.apiUrl}/${id}`);
  }

  descargarArchivo(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/descargar`, { responseType: 'blob' });
  }

  buscarCoincidencias(
  file: File,
  viajePrevistoId: number,
  actividadId?: number
): Observable<{
  metadata: { fecha: string; hora: string };
  actividadesCoincidentes: any[];
  actividadActual: any | null;
}> {
  const formData = new FormData();
  formData.append('archivo', file);
  formData.append('viajePrevistoId', viajePrevistoId.toString());
  if (actividadId) formData.append('actividadId', actividadId.toString());

  return this.http.post<{
    metadata: { fecha: string; hora: string };
    actividadesCoincidentes: any[];
    actividadActual: any | null;
  }>(
    `${this.apiUrl}/buscar-coincidencias`,
    formData
  );
}
}