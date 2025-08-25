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

  getArchivos(): Observable<Archivo[]> {
  return this.http.get<Archivo[]>(this.apiUrl);
}

  getArchivosPorActividad(actividadId: number): Observable<Archivo[]> {
    return this.http.get<Archivo[]>(`${this.apiUrl}?actividadId=${actividadId}`);
  }

  getArchivosPorViaje(viajeId: number): Observable<Archivo[]> {
  const url = `${this.apiUrl}/viaje/${viajeId}`;
  console.log('🌐 Endpoint llamado:', url);
  return this.http.get<Archivo[]>(url);
}

  getArchivosPorItinerario(itinerarioId: number): Observable<Archivo[]> {
  return this.http.get<Archivo[]>(`${this.apiUrl}?itinerarioId=${itinerarioId}`);
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

  asignarArchivoAActividad(archivoId: number, actividadId: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/${archivoId}`, { actividadId });
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

  // ✅ AÑADIR al ArchivoService - Método para buscar coincidencias sin archivo

buscarCoincidenciasPorMetadatos(datos: {
  viajePrevistoId: number;
  actividadId?: number;
  nombreArchivo: string;
  fechaArchivo?: string;
  horaArchivo?: string;
}): Observable<{
  metadata: { fecha: string; hora: string };
  actividadesCoincidentes: any[];
  actividadActual: any | null;
}> {
  // ✅ Enviar solo metadatos, NO el archivo físico
  return this.http.post<{
    metadata: { fecha: string; hora: string };
    actividadesCoincidentes: any[];
    actividadActual: any | null;
  }>(
    `${this.apiUrl}/buscar-coincidencias-metadatos`,
    datos
  );
}

  // ✅ NUEVO MÉTODO - Añadir al final de la clase ArchivoService
  subirArchivosConProgreso(formData: FormData, onProgress?: (porcentaje: number) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // 🎯 Evento de progreso - aquí capturamos el porcentaje
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const porcentaje = Math.round((event.loaded / event.total) * 100);
          onProgress(porcentaje); // 👈 Aquí enviamos el progreso al component
        }
      });
      
      // 🎯 Cuando termina exitosamente
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Error HTTP: ${xhr.status}`));
        }
      });
      
      // 🎯 Si hay error
      xhr.addEventListener('error', () => {
        reject(new Error('Error de red'));
      });
      
      // 🎯 Configurar y enviar - USAR TU ENVIRONMENT
      xhr.open('POST', `${environment.apiUrl}/archivos/subir`);
      xhr.send(formData);
    });
  }
}


