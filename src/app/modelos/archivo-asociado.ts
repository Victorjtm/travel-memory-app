// travel-memory-app/src/app/modelos/archivo-asociado.model.ts
export interface ArchivoAsociado {
    id: number;
    archivoPrincipalId: number;        // FK a archivos.id
    tipo: 'audio' | 'texto';
    nombreArchivo: string;
    rutaArchivo: string;
    descripcion?: string;
    fechaCreacion?: string;
    fechaActualizacion?: string;
    version?: number;
  }
  
