// travel-memory-app/src/app/modelos/archivo.model.ts
export interface Archivo {
    id: number;
    actividadId: number;                // FK a actividades.id
    tipo: 'foto' | 'video' | 'audio' | 'texto' | 'imagen';
    nombreArchivo: string;
    rutaArchivo: string;
    descripcion?: string;
    fechaCreacion?: string;            // ISO string o fecha en formato texto
    fechaActualizacion?: string;
    horaCaptura?: string;              // ⬅️ Nuevo campo para registrar la hora (formato HH:mm)
    version?: number;
    geolocalizacion?: string;          // JSON o texto con lat/lng
    metadatos?: string;                // JSON u otro texto con metadatos
  }
  
  