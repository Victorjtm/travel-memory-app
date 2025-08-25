  import { Component, OnInit, Inject } from '@angular/core';
  import { ActivatedRoute, Router } from '@angular/router';
  import { CommonModule } from '@angular/common';
  import { FormsModule } from '@angular/forms';
  import { RouterModule } from '@angular/router';

  // Servicios y modelos
  import { Archivo } from '../../modelos/archivo';
  import { ArchivoService } from '../../servicios/archivo.service';
  import { FilesizePipe } from '../../pipes/filesize.pipe';

  // Angular Material
  import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
  import { MatDialogModule } from '@angular/material/dialog';
  import { MatRadioModule } from '@angular/material/radio';
  import { MatButtonModule } from '@angular/material/button';
  import { MatIconModule } from '@angular/material/icon';
  import { MatProgressBarModule } from '@angular/material/progress-bar'; 
  import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
  import { MatInputModule } from '@angular/material/input';
  import { MatFormFieldModule } from '@angular/material/form-field';
  import { MatSelectModule } from '@angular/material/select';
  import { MatCardModule } from '@angular/material/card';
  import { MatListModule } from '@angular/material/list';
  import { MatExpansionModule } from '@angular/material/expansion';

  import * as EXIF from 'exif-js';

  // Tipos
  type TipoArchivo = 'foto' | 'video' | 'audio' | 'texto' | 'imagen';

  interface Activity {
    actividadId: number;
    actividadNombre: string;
    horaInicio: string;
    horaFin: string;
    fechaInicio?: string;
  }

  interface DialogData {
    actividadesCoincidentes: Activity[];
    actividadActual: Activity | null;
  }

  @Component({
    selector: 'app-formulario-archivos',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      FilesizePipe,
      RouterModule,
      MatDialogModule,
      MatRadioModule,
      MatButtonModule,
      MatProgressBarModule,        
      MatProgressSpinnerModule,
      MatIconModule,
      MatInputModule,
      MatFormFieldModule, 
      MatSelectModule,
      MatCardModule,
      MatListModule,
      MatExpansionModule
    ],
    templateUrl: './formulario-archivos-actividades-itinerario.component.html',
    styleUrls: ['./formulario-archivos-actividades-itinerario.component.scss']
  })
  export class FormularioArchivosComponent implements OnInit {
    
    // ═══════════════════════════════════════════════════════════════
    // PROPIEDADES PRINCIPALES
    // ═══════════════════════════════════════════════════════════════
    
    // Datos de archivos
    archivos: Archivo[] = [];
    archivosSeleccionados: File[] = [];
    
    // Control de modo de edición
    modoEdicion: boolean = false;
    archivoEditandoId: number | null = null;
    archivoNuevoSeleccionado: File | null = null;
    archivoOriginal: Archivo | null = null;
    
    // Estados de carga
    cargandoArchivo: boolean = false;
    guardandoArchivo: boolean = false;
    subiendoArchivos: boolean = false;
    
    // Control de progreso de subida múltiple
    archivoActualIndex: number = 0;
    totalArchivos: number = 0;
    porcentajeArchivoActual: number = 0;
    nombreArchivoActual: string = '';
    
    // Debug
    mostrarDebug: boolean = false;
    
    // IDs de navegación
    viajePrevistoId!: number;
    itinerarioId!: number;
    actividadId!: number;
    
    // Formulario de nuevo archivo
    nuevoArchivo: Partial<Archivo> = {
      tipo: 'foto',
      horaCaptura: this.getHoraActual(),
      fechaCreacion: new Date().toISOString()
    };
    
    // Opciones de tipo de archivo
    tiposArchivo = [
      { value: 'foto', label: 'Foto' },
      { value: 'video', label: 'Vídeo' },
      { value: 'audio', label: 'Audio' },
      { value: 'texto', label: 'Texto' },
      { value: 'imagen', label: 'Imagen' }
    ];
    
    // ═══════════════════════════════════════════════════════════════
    // GETTERS COMPUTADOS
    // ═══════════════════════════════════════════════════════════════
    
    get progresoGlobal(): number {
      if (this.totalArchivos === 0) return 0;
      
      const archivosCompletados = this.archivoActualIndex;
      const progresoActual = this.porcentajeArchivoActual / 100;
      
      return Math.round(((archivosCompletados + progresoActual) / this.totalArchivos) * 100);
    }
    
    get tituloFormulario(): string {
      return this.modoEdicion ? 'Editar Archivo' : 'Subir Nuevos Archivos';
    }
    
    get hayCambios(): boolean {
      if (!this.modoEdicion || !this.archivoOriginal) return false;
      
      return (
        this.archivoNuevoSeleccionado !== null ||
        this.nuevoArchivo.tipo !== this.archivoOriginal.tipo ||
        this.nuevoArchivo.descripcion !== this.archivoOriginal.descripcion ||
        this.nuevoArchivo.horaCaptura !== this.archivoOriginal.horaCaptura ||
        this.nuevoArchivo.geolocalizacion !== this.archivoOriginal.geolocalizacion
      );
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CONSTRUCTOR E INICIALIZACIÓN
    // ═══════════════════════════════════════════════════════════════
    
    constructor(
      private archivoService: ArchivoService,
      private route: ActivatedRoute,
      private router: Router,
      private dialog: MatDialog
    ) {}

    ngOnInit() {
      this.route.paramMap.subscribe(params => {
        this.viajePrevistoId = +params.get('viajePrevistoId')!;
        this.itinerarioId = +params.get('itinerarioId')!;
        this.actividadId = +params.get('actividadId')!;

        const archivoId = params.get('archivoId');
        if (archivoId) {
          this.modoEdicion = true;
          this.archivoEditandoId = +archivoId;
          this.cargarArchivoParaEdicion(+archivoId);
        } else {
          this.modoEdicion = false;
          this.cargarArchivos();
        }
      });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE CARGA DE DATOS
    // ═══════════════════════════════════════════════════════════════
    
    cargarArchivos(): void {
      this.archivoService.getArchivosPorActividad(this.actividadId)
        .subscribe(archivos => {
          this.archivos = archivos;
        });
    }
    
    cargarArchivoParaEdicion(id: number): void {
      this.cargandoArchivo = true;
      
      this.archivoService.getArchivo(id).subscribe({
        next: (archivo) => {
          console.log('[📄 CARGANDO ARCHIVO]', archivo);
          
          this.archivoOriginal = { ...archivo };
          
          this.nuevoArchivo = {
            tipo: archivo.tipo,
            descripcion: archivo.descripcion || '',
            horaCaptura: archivo.horaCaptura || this.getHoraActual(),
            geolocalizacion: archivo.geolocalizacion || '',
            fechaCreacion: archivo.fechaCreacion || new Date().toISOString()
          };
          
          this.cargandoArchivo = false;
          console.log('[✅ ARCHIVO CARGADO]', this.nuevoArchivo);
        },
        error: (err) => {
          console.error('[❌ ERROR] Cargando archivo:', err);
          this.cargandoArchivo = false;
          alert('Error al cargar el archivo para edición');
          this.volverAActividad();
        }
      });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE MANEJO DE EVENTOS DE FORMULARIO
    // ═══════════════════════════════════════════════════════════════
    
    onFormSubmit(): void {
      console.log('[📝 FORM SUBMIT] Datos a enviar:', this.nuevoArchivo);
      console.log('[📝 FORM SUBMIT] Modo edición:', this.modoEdicion);
      console.log('[📝 FORM SUBMIT] ID archivo:', this.archivoEditandoId);
      
      if (this.modoEdicion) {
        this.debugearDatosEdicion();
      }
      
      this.subirArchivos();
    }
    
/**
 * Versión optimizada para móviles - procesa archivos de forma más eficiente
 */
async onFileSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const files = Array.from(input.files);
  console.log(`[📁 ARCHIVOS SELECCIONADOS] ${files.length} archivo(s)`);

  // ✅ PREVENIR que Android mate el proceso
  this.mostrarIndicadorCarga(true);
  
  try {
    // ✅ Procesar archivos con throttling (uno por vez, con delay)
    const archivosProcessados: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`[🔄 PROCESANDO ${i + 1}/${files.length}] ${file.name}`);
      
      // ✅ Mostrar progreso al usuario
      this.mostrarProgresoArchivo(`Procesando ${file.name}...`, i + 1, files.length);
      
      // ✅ Procesamiento optimizado para móviles
      const archivoCorregido = await this.procesarArchivoParaMovil(file);
      archivosProcessados.push(archivoCorregido);
      
      // ✅ IMPORTANTE: Pequeña pausa entre archivos para no saturar memoria
      if (i < files.length - 1) {
        await this.pausa(100); // 100ms de pausa
      }
    }

    // ✅ Asignar archivos procesados
    if (this.modoEdicion) {
      this.archivoNuevoSeleccionado = archivosProcessados[0];
    } else {
      this.archivosSeleccionados = archivosProcessados;
    }

    console.log(`[✅ PROCESAMIENTO COMPLETO] ${archivosProcessados.length} archivo(s) listos`);
    
  } catch (error) {
    console.error('[❌ ERROR PROCESANDO]', error);
    alert('Error procesando archivos. Inténtalo de nuevo.');
    
    // ✅ Fallback: usar archivos originales
    if (this.modoEdicion) {
      this.archivoNuevoSeleccionado = files[0];
    } else {
      this.archivosSeleccionados = files;
    }
  } finally {
    this.mostrarIndicadorCarga(false);
  }
}
    
    // Eventos de cambio en formulario
    onTipoChange(event: any): void {
      console.log('[🔄 TIPO CAMBIADO]', event.value);
    }

    onDescripcionChange(): void {
      console.log('[🔄 DESCRIPCIÓN CAMBIADA]', this.nuevoArchivo.descripcion);
    }

    onHoraChange(): void {
      console.log('[🔄 HORA CAMBIADA]', this.nuevoArchivo.horaCaptura);
    }

    onUbicacionChange(): void {
      console.log('[🔄 UBICACIÓN CAMBIADA]', this.nuevoArchivo.geolocalizacion);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE SUBIDA Y PROCESAMIENTO DE ARCHIVOS
    // ═══════════════════════════════════════════════════════════════

/**
 * Procesamiento de archivos optimizado para móviles
 */
private async procesarArchivoParaMovil(file: File): Promise<File> {
  // ✅ Si el archivo es muy grande, reducir calidad automáticamente
  if (file.size > 5 * 1024 * 1024) { // > 5MB
    console.log(`[📉 ARCHIVO GRANDE] ${file.name} (${(file.size/1024/1024).toFixed(2)}MB) - aplicando compresión`);
    return this.comprimirImagenParaMovil(file);
  }
  
  // ✅ Para archivos normales, procesamiento ligero
  return this.procesarOrientacionLigero(file);
}

/**
 * Compresión agresiva para archivos grandes en móviles
 */
private async comprimirImagenParaMovil(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // ✅ Reducir resolución para móviles (máximo 1920x1080)
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1080;
      
      let { width, height } = img;
      
      if (width > MAX_WIDTH) {
        height = (height * MAX_WIDTH) / width;
        width = MAX_WIDTH;
      }
      
      if (height > MAX_HEIGHT) {
        width = (width * MAX_HEIGHT) / height;
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;

      // ✅ Dibujar imagen redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // ✅ Comprimir más agresivamente para móviles (60% calidad)
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, {
            type: 'image/jpeg', // Convertir todo a JPEG para mejor compresión
            lastModified: file.lastModified
          });
          console.log(`[✅ COMPRIMIDO] ${file.name}: ${(file.size/1024/1024).toFixed(2)}MB → ${(newFile.size/1024/1024).toFixed(2)}MB`);
          resolve(newFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', 0.6); // 60% calidad
    };

    img.onerror = () => {
      console.error(`[❌ ERROR COMPRESIÓN] ${file.name}`);
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
}


/**
 * Procesamiento de orientación ligero (sin EXIF pesado)
 */
private async procesarOrientacionLigero(file: File): Promise<File> {
  // ✅ En móviles, skip procesamiento EXIF pesado
  // Solo hacer correcciones básicas si es necesario
  
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // ✅ Solo rotar si parece obvio que está mal
      const aspectRatio = img.width / img.height;
      
      // Si es muy vertical pero grande, probablemente necesita rotación
      if (aspectRatio < 0.7 && img.width > 2000) {
        console.log(`[🔄 ROTACIÓN SIMPLE] ${file.name}`);
        this.rotarImagen90Grados(img, file).then(resolve);
      } else {
        console.log(`[✅ SIN ROTACIÓN] ${file.name}`);
        resolve(file);
      }
    };

    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Rotación simple de 90 grados
 */
private async rotarImagen90Grados(img: HTMLImageElement, file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // Intercambiar dimensiones
    canvas.width = img.height;
    canvas.height = img.width;
    
    // Rotar 90° horario
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(img, 0, -img.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const newFile = new File([blob], file.name, {
          type: file.type,
          lastModified: file.lastModified
        });
        resolve(newFile);
      } else {
        resolve(file);
      }
    }, file.type, 0.8);
  });
}

    
    subirArchivos(): void {
      if (this.modoEdicion) {
        this.actualizarArchivoExistente();
      } else {
        this.subirNuevosArchivos();
      }
    }
    
    /**
     * Actualiza un archivo existente con nuevos metadatos y/o archivo
     */
    private actualizarArchivoExistente(): void {
      if (!this.archivoEditandoId) {
        console.error('[❌ ERROR] ID de archivo no válido');
        alert('Error: ID de archivo no válido');
        return;
      }

      if (!this.validarDatosArchivo()) {
        return;
      }

      console.log('[🚀 INICIANDO ACTUALIZACIÓN]');
      console.log('  - ID:', this.archivoEditandoId);
      console.log('  - Datos originales:', this.archivoOriginal);
      console.log('  - Datos nuevos:', this.nuevoArchivo);
      console.log('  - Archivo nuevo:', this.archivoNuevoSeleccionado?.name);

      this.guardandoArchivo = true;

      if (this.archivoNuevoSeleccionado) {
        // Actualizar archivo + metadatos
        console.log('[📤 MODO] Actualizando archivo y metadatos');
        
        const formData = new FormData();
        formData.append('archivo', this.archivoNuevoSeleccionado, this.archivoNuevoSeleccionado.name);
        
        const camposAEnviar = {
          tipo: this.nuevoArchivo.tipo,
          descripcion: this.nuevoArchivo.descripcion || '',
          horaCaptura: this.nuevoArchivo.horaCaptura,
          geolocalizacion: this.nuevoArchivo.geolocalizacion || '',
          fechaCreacion: this.nuevoArchivo.fechaCreacion || new Date().toISOString()
        };

        console.log('[📋 CAMPOS A ENVIAR]', camposAEnviar);

        Object.keys(camposAEnviar).forEach(key => {
          const value = camposAEnviar[key as keyof typeof camposAEnviar];
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
            console.log(`  - ${key}: ${value}`);
          }
        });

        this.archivoService.actualizarArchivoConArchivo(this.archivoEditandoId, formData).subscribe({
          next: (response) => {
            console.log('[✅ ÉXITO] Respuesta del servidor:', response);
            this.mostrarMensajeExito('Archivo y metadatos actualizados correctamente');
            this.guardandoArchivo = false;
            this.volverAListaArchivos();
          },
          error: (err) => {
            console.error('[❌ ERROR] Actualizando archivo completo:', err);
            this.mostrarMensajeError('Error al actualizar el archivo: ' + this.extraerMensajeError(err));
            this.guardandoArchivo = false;
          }
        });
      } else {
        // Solo actualizar metadatos
        console.log('[📝 MODO] Actualizando solo metadatos');
        
        const metadatosLimpios = {
          tipo: this.nuevoArchivo.tipo,
          descripcion: this.nuevoArchivo.descripcion || '',
          horaCaptura: this.nuevoArchivo.horaCaptura,
          geolocalizacion: this.nuevoArchivo.geolocalizacion || '',
          fechaCreacion: this.nuevoArchivo.fechaCreacion || this.archivoOriginal?.fechaCreacion || new Date().toISOString()
        };

        console.log('[📋 METADATOS A ENVIAR]', metadatosLimpios);
        
        this.archivoService.actualizarArchivo(this.archivoEditandoId, metadatosLimpios).subscribe({
          next: (response) => {
            console.log('[✅ ÉXITO] Respuesta del servidor:', response);
            this.mostrarMensajeExito('Metadatos actualizados correctamente');
            this.guardandoArchivo = false;
            this.volverAListaArchivos();
          },
          error: (err) => {
            console.error('[❌ ERROR] Actualizando metadatos:', err);
            this.mostrarMensajeError('Error al actualizar los metadatos: ' + this.extraerMensajeError(err));
            this.guardandoArchivo = false;
          }
        });
      }
    }
    

  // ✅ VERSIÓN CORREGIDA - Cambiar el método subirNuevosArchivos()

  private async subirNuevosArchivos(): Promise<void> {
    if (this.archivosSeleccionados.length === 0) {
      return;
    }

    this.subiendoArchivos = true;
    this.totalArchivos = this.archivosSeleccionados.length;
    this.archivoActualIndex = 0;

    console.log(`[🚀 INICIO SUBIDA] Procesando ${this.totalArchivos} archivo(s)`);

    for (const file of this.archivosSeleccionados) {
      this.nombreArchivoActual = file.name;
      this.porcentajeArchivoActual = 0;

      console.log(`\n[🔍 PROCESANDO] ${file.name}`);

      // ✅ CAMBIO PRINCIPAL: Buscar coincidencias SIN enviar el archivo
      const coincidencias = await this.buscarCoincidenciasSinArchivo(file);
      
      let actividadElegidaId = this.actividadId;

      // Lógica de selección de actividad (igual que antes)
      if (coincidencias && Array.isArray(coincidencias.actividadesCoincidentes)) {
        if (coincidencias.actividadesCoincidentes.length === 1) {
          const act = coincidencias.actividadesCoincidentes[0];
          actividadElegidaId = Number(act.actividadId) || this.actividadId;
          console.log(`[✅ AUTO-ASIGNADA] ${file.name} → Actividad ID: ${actividadElegidaId}`);
        } else if (coincidencias.actividadesCoincidentes.length > 1) {
          const actividadElegida = await this.mostrarDialogoSeleccion(
            coincidencias.actividadesCoincidentes, 
            coincidencias.actividadActual
          );
          if (actividadElegida) {
            actividadElegidaId = Number(actividadElegida.actividadId);
            console.log(`[✅ ACTIVIDAD] Seleccionada ID: ${actividadElegidaId}`);
          } else {
            console.log(`[❌ CANCELADO] Usuario canceló la selección para: ${file.name}`);
            continue;
          }
        }
      }

      // ✅ Preparar FormData con metadatos
      const metadatosArchivo = this.parsearMetadatosArchivo(file.name);
      metadatosArchivo.fechaCreacion = new Date(file.lastModified).toISOString();
      metadatosArchivo.horaCaptura = new Date(file.lastModified).toLocaleTimeString("es-ES", {
        hour12: false
      });

      const formData = new FormData();
      formData.append('actividadId', actividadElegidaId.toString());
      
      // ✅ Agregar metadatos al FormData
      Object.keys(metadatosArchivo).forEach(key => {
        const value = metadatosArchivo[key as keyof Archivo];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // ✅ IMPORTANTE: Solo agregar el archivo UNA VEZ aquí
      formData.append('archivos', file, file.name);

      // ✅ Subir con progreso real
      try {
        await this.archivoService.subirArchivosConProgreso(formData, (porcentaje) => {
          this.porcentajeArchivoActual = porcentaje;
        });
        
        console.log(`[✅ SUBIDO] ${file.name} correctamente`);
      } catch (error) {
        console.error(`[❌ ERROR SUBIDA] ${file.name}:`, error);
        alert(`Error subiendo ${file.name}: ${this.extraerMensajeError(error)}`);
        this.porcentajeArchivoActual = 0;
        this.nombreArchivoActual = `❌ Error: ${file.name}`;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      this.archivoActualIndex++;
      this.porcentajeArchivoActual = 0;
    }

    console.log(`[🏁 FIN SUBIDA] Todos los archivos procesados`);
    this.subiendoArchivos = false;
    this.resetFormulario();
    this.cargarArchivos();
  }

  // ✅ NUEVO MÉTODO: Buscar coincidencias sin enviar archivo físico
  private async buscarCoincidenciasSinArchivo(file: File): Promise<any> {
    // Parsear metadatos del nombre del archivo
    const metadatos = this.parsearMetadatosArchivo(file.name);
    
    // Crear objeto con solo metadatos (sin archivo físico)
    const datosConsulta = {
      viajePrevistoId: this.viajePrevistoId,
      actividadId: this.actividadId,
      nombreArchivo: file.name,
      fechaArchivo: metadatos.fechaCreacion,
      horaArchivo: metadatos.horaCaptura
    };

    // ✅ Llamar a nuevo endpoint que NO procese archivos
    return this.archivoService.buscarCoincidenciasPorMetadatos(datosConsulta).toPromise();
  }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE PARSEO Y PROCESAMIENTO DE METADATOS
    // ═══════════════════════════════════════════════════════════════

    // ✅ UTILIDADES PARA MEJORAR UX EN MÓVILES

private mostrarIndicadorCarga(mostrar: boolean): void {
  // Mostrar/ocultar indicador de carga
  this.cargandoArchivo = mostrar;
}

private mostrarProgresoArchivo(mensaje: string, actual: number, total: number): void {
  console.log(`[📊 PROGRESO] ${actual}/${total}: ${mensaje}`);
  // Opcional: actualizar UI con progreso
}

private async pausa(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ✅ DETECTOR DE PROBLEMAS DE MEMORIA
private verificarMemoriaDisponible(): boolean {
  // @ts-ignore - performance.memory no está en todos los tipos
  const memory = (performance as any).memory;
  
  if (memory) {
    const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    console.log(`[🧠 MEMORIA] Uso actual: ${(memoryUsage * 100).toFixed(1)}%`);
    
    if (memoryUsage > 0.8) {
      console.warn('⚠️ Memoria alta, aplicando procesamiento conservativo');
      return false;
    }
  }
  
  return true;
}
    
    /**
     * Parsea metadatos desde el nombre del archivo usando regex
     */
    private parsearMetadatosArchivo(nombreArchivo: string): Partial<Archivo> {
      const regex = /(IMG|VID|AUDIO)?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i;
      const match = nombreArchivo.match(regex);

      const metadatos: Partial<Archivo> = {
        tipo: this.nuevoArchivo.tipo || 'foto',
        descripcion: `Archivo importado automáticamente: ${nombreArchivo}`,
        horaCaptura: this.getHoraActual(),
        geolocalizacion: this.nuevoArchivo.geolocalizacion || '',
        fechaCreacion: new Date().toISOString()
      };

      if (match) {
        const tipoRaw = match[1]?.toLowerCase() || '';
        const año = parseInt(match[2], 10);
        const mes = parseInt(match[3], 10);
        const dia = parseInt(match[4], 10);
        const hora = parseInt(match[5], 10);
        const minuto = parseInt(match[6], 10);
        const segundo = parseInt(match[7], 10);

        if (this.validarFechaHora(año, mes, dia, hora, minuto, segundo)) {
          const fechaLocal = new Date(año, mes - 1, dia, hora, minuto, segundo);

          const fechaISO = fechaLocal.getFullYear() + '-' +
            String(fechaLocal.getMonth() + 1).padStart(2, '0') + '-' +
            String(fechaLocal.getDate()).padStart(2, '0') + 'T' +
            String(fechaLocal.getHours()).padStart(2, '0') + ':' +
            String(fechaLocal.getMinutes()).padStart(2, '0') + ':' +
            String(fechaLocal.getSeconds()).padStart(2, '0');

          metadatos.fechaCreacion = fechaISO;
          metadatos.horaCaptura = String(hora).padStart(2, '0') + ':' + 
                                String(minuto).padStart(2, '0') + ':' + 
                                String(segundo).padStart(2, '0');

          const tipoDetectado = this.detectarTipoDesdeNombre(tipoRaw);
          if (tipoDetectado) {
            metadatos.tipo = tipoDetectado;
          }

          console.log(`[📅 PARSEANDO] ${nombreArchivo}`);
          console.log(`  - Fecha local: ${fechaLocal}`);
          console.log(`  - Fecha ISO (local): ${metadatos.fechaCreacion}`);
          console.log(`  - Hora captura: ${metadatos.horaCaptura}`);
        } else {
          console.log(`[❌ FECHA INVÁLIDA] ${nombreArchivo} contiene fecha/hora inválida`);
        }
      } else {
        console.log(`[❌ NO MATCH] ${nombreArchivo} no coincide con el patrón de fecha`);
      }

      return metadatos;
    }
    
    private detectarTipoDesdeNombre(tipo: string): TipoArchivo | undefined {
      switch (tipo) {
        case 'img': return 'foto';
        case 'vid': return 'video';
        case 'audio': return 'audio';
        default: return undefined;
      }
    }
    
    private validarFechaHora(año: number, mes: number, dia: number, hora: number, minuto: number, segundo: number): boolean {
      if (año < 1900 || año > 2100) return false;
      if (mes < 1 || mes > 12) return false;
      if (dia < 1 || dia > 31) return false;
      if (hora < 0 || hora > 23) return false;
      if (minuto < 0 || minuto > 59) return false;
      if (segundo < 0 || segundo > 59) return false;

      const fechaTest = new Date(año, mes - 1, dia);
      return fechaTest.getFullYear() === año && 
            fechaTest.getMonth() === mes - 1 && 
            fechaTest.getDate() === dia;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE VALIDACIÓN
    // ═══════════════════════════════════════════════════════════════
    
    private validarDatosArchivo(): boolean {
      const errores: string[] = [];

      if (!this.nuevoArchivo.tipo) {
        errores.push('El tipo de archivo es obligatorio');
      }

      if (!this.nuevoArchivo.horaCaptura) {
        errores.push('La hora de captura es obligatoria');
      } else {
        const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!horaRegex.test(this.nuevoArchivo.horaCaptura)) {
          errores.push('El formato de hora no es válido (HH:mm o HH:mm:ss)');
        }
      }

      if (this.nuevoArchivo.descripcion && this.nuevoArchivo.descripcion.trim().length < 3) {
        errores.push('La descripción debe tener al menos 3 caracteres');
      }

      if (errores.length > 0) {
        console.error('[❌ VALIDACIÓN] Errores encontrados:', errores);
        this.mostrarMensajeError('Errores de validación:\n' + errores.join('\n'));
        return false;
      }

      console.log('[✅ VALIDACIÓN] Datos válidos');
      return true;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE DIÁLOGOS Y UI
    // ═══════════════════════════════════════════════════════════════
    
    private mostrarDialogoSeleccion(actividadesCoincidentes: any[], actividadActual: any | null): Promise<any | null> {
      return new Promise(resolve => {
        const dialogRef = this.dialog.open(ActivityMatchDialogComponent, {
          width: '400px',
          data: {
            actividadesCoincidentes,
            actividadActual
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          console.log('📌 Resultado del diálogo:', result);
          resolve(result || null);
        });
      });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE NAVEGACIÓN Y CONTROL
    // ═══════════════════════════════════════════════════════════════
    
    cancelarEdicion(): void {
      if (this.hayCambios) {
        if (confirm('¿Descartar los cambios realizados?')) {
          this.volverAListaArchivos();
        }
      } else {
        this.volverAListaArchivos();
      }
    }
    
    cancelarSubida(): void {
      if (confirm('¿Estás seguro de cancelar la subida?')) {
        this.subiendoArchivos = false;
        this.porcentajeArchivoActual = 0;
        this.archivoActualIndex = 0;
        this.nombreArchivoActual = '';
        console.log('[🛑 CANCELADO] Subida cancelada por el usuario');
      }
    }
    
    volverAActividad(): void {
      this.router.navigate([
        '/viajes-previstos',
        this.viajePrevistoId,
        'itinerarios',
        this.itinerarioId,
        'actividades'
      ]);
    }
    
    volverAListaArchivos(): void {
      this.router.navigate([
        '/viajes-previstos',
        this.viajePrevistoId,
        'itinerarios',
        this.itinerarioId,
        'actividades',
        this.actividadId,
        'archivos'
      ]);
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE UTILIDAD Y HELPERS
    // ═══════════════════════════════════════════════════════════════
    
    resetFormulario(): void {
      this.archivosSeleccionados = [];
      this.archivoNuevoSeleccionado = null;
      this.archivoOriginal = null;
      this.guardandoArchivo = false;
      
      this.nuevoArchivo = {
        tipo: 'foto',
        descripcion: '',
        horaCaptura: this.getHoraActual(),
        geolocalizacion: '',
        fechaCreacion: new Date().toISOString()
      };
    }
    
    limpiarArchivoSeleccionado(): void {
      this.archivoNuevoSeleccionado = null;
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      console.log('[🗑️ ARCHIVO LIMPIADO]');
    }
    
    getHoraActual(): string {
      const ahora = new Date();
      return ahora.toTimeString().substring(0,5); // HH:mm
    }
    
    capturarGeolocalizacion(): void {
      if (!navigator.geolocation) {
        alert('❌ Este navegador no soporta geolocalización');
        return;
      }

      const isSecureOrigin = location.protocol === 'https:' || location.hostname === 'localhost';

      if (!isSecureOrigin) {
        alert('⚠️ Geolocalización bloqueada: solo funciona en HTTPS o localhost por seguridad del navegador');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          this.nuevoArchivo.geolocalizacion = `${lat}, ${lng}`;
        },
        (error) => {
          alert('Error al obtener la ubicación: ' + error.message);
        }
      );
    }
    
    eliminarArchivo(id: number): void {
      if (confirm('¿Estás seguro de eliminar este archivo?')) {
        this.archivoService.eliminarArchivo(id).subscribe({
          next: () => {
            this.archivos = this.archivos.filter(a => a.id !== id);
          },
          error: (err) => console.error('[eliminarArchivo] Error eliminando archivo:', err)
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS DE DEBUG Y MENSAJES
    // ═══════════════════════════════════════════════════════════════
    
    private debugearDatosEdicion(): void {
      console.log('=== DEBUG EDICIÓN ===');
      console.log('Archivo Original:', this.archivoOriginal);
      console.log('Datos nuevos:', this.nuevoArchivo);
      console.log('Hay cambios:', this.hayCambios);
      console.log('Archivo nuevo seleccionado:', this.archivoNuevoSeleccionado?.name);
      console.log('ID de archivo editando:', this.archivoEditandoId);
    }
    
    getDebugInfo(): any {
      return {
        modoEdicion: this.modoEdicion,
        archivoEditandoId: this.archivoEditandoId,
        archivoOriginal: this.archivoOriginal,
        nuevoArchivo: this.nuevoArchivo,
        hayCambios: this.hayCambios,
        archivoNuevoSeleccionado: this.archivoNuevoSeleccionado ? {
          name: this.archivoNuevoSeleccionado.name,
          size: this.archivoNuevoSeleccionado.size
        } : null,
        cargandoArchivo: this.cargandoArchivo,
        guardandoArchivo: this.guardandoArchivo
      };
    }
    
    private extraerMensajeError(error: any): string {
      if (error?.error?.message) {
        return error.error.message;
      }
      if (error?.message) {
        return error.message;
      }
      if (typeof error === 'string') {
        return error;
      }
      return 'Error desconocido';
    }
    
    private mostrarMensajeExito(mensaje: string): void {
      alert('✅ ' + mensaje);
      console.log('[✅ ÉXITO]', mensaje);
    }

    private mostrarMensajeError(mensaje: string): void {
      alert('❌ ' + mensaje);
      console.error('[❌ ERROR]', mensaje);
    }
    
    private hayCambiosManuales(): boolean {
      if (!this.archivoOriginal) return false;
      
      return (
        this.nuevoArchivo.descripcion !== this.archivoOriginal.descripcion ||
        this.nuevoArchivo.tipo !== this.archivoOriginal.tipo
      );
    }
    
    // ═══════════════════════════════════════════════════════════════
    // MÉTODOS AUXILIARES NO UTILIZADOS (MANTENER POR COMPATIBILIDAD)
    // ═══════════════════════════════════════════════════════════════
    
    private exifTimestampToISO(timestamp: number): string {
      const fecha = new Date(timestamp * 1000);
      return fecha.toISOString();
    }
    
    private logFormData(formData: FormData): void {
      console.log('[🔍 FORM DATA CONTENTS]:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPONENTE DE DIÁLOGO PARA SELECCIÓN DE ACTIVIDAD
  // ═══════════════════════════════════════════════════════════════

  @Component({
    selector: 'app-activity-match-dialog',
    standalone: true,
    imports: [
      CommonModule,
      FormsModule,
      MatDialogModule,
      MatRadioModule,
      MatButtonModule
    ],
    template: `
      <div class="dialog-container">
        <h2 class="dialog-title">Asociar archivo</h2>

        <mat-radio-group [(ngModel)]="selectedActivityId" name="activityGroup">
          <!-- Actividad actual -->
          <mat-radio-button *ngIf="data.actividadActual" [value]="data.actividadActual.actividadId">
            <div class="activity-option">
              <span class="activity-option-name">{{data.actividadActual.actividadNombre}}</span>
              <span class="activity-option-details">
                {{data.actividadActual.horaInicio}} - {{data.actividadActual.horaFin}}
              </span>
            </div>
          </mat-radio-button>

          <!-- Otras actividades -->
          <mat-radio-button *ngFor="let act of data.actividadesCoincidentes" [value]="act.actividadId">
            <div class="activity-option">
              <span class="activity-option-name">{{act.actividadNombre}}</span>
              <span class="activity-option-details">
                <span *ngIf="act.fechaInicio">{{formatFecha(act.fechaInicio)}}</span>
                <span>{{act.horaInicio}} - {{act.horaFin}}</span>
              </span>
            </div>
          </mat-radio-button>

          <!-- No asociar -->
          <mat-radio-button [value]="NO_ASSOCIATION_VALUE">
            <div class="activity-option">
              <span class="activity-option-name">No asociar a ninguna actividad</span>
            </div>
          </mat-radio-button>
        </mat-radio-group>

        <div class="dialog-actions">
          <button mat-button class="btn-cancelar" (click)="onCancelar()">
            <i class="fa fa-times"></i> Cancelar
          </button>
          <button mat-button class="btn-aceptar" (click)="onAceptar()">
            <i class="fa fa-check"></i> Aceptar
          </button>
        </div>
      </div>
    `,
    styleUrls: ['./itinerario/activity-match-dialog.component.scss']
  })
  export class ActivityMatchDialogComponent implements OnInit {
    readonly NO_ASSOCIATION_VALUE = -1;
    selectedActivityId: number = this.NO_ASSOCIATION_VALUE;

    constructor(
      public dialogRef: MatDialogRef<ActivityMatchDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: DialogData
    ) {}

    ngOnInit() {
      console.log('🔹 Datos recibidos en el diálogo:', this.data);

      // Selección por defecto
      if (this.data.actividadActual?.actividadId) {
        this.selectedActivityId = this.data.actividadActual.actividadId;
      } else if (this.data.actividadesCoincidentes?.length === 1) {
        this.selectedActivityId = this.data.actividadesCoincidentes[0].actividadId;
      }

      console.log('🔹 Selección inicial:', this.selectedActivityId, 'Tipo:', typeof this.selectedActivityId);
    }

    formatFecha(fecha: string): string {
      try {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch (e) {
        console.error('Error formateando fecha:', e);
        return fecha;
      }
    }

    onAceptar() {
      console.log('🔹 Aceptar pulsado. ID seleccionado antes de conversión:', this.selectedActivityId);

      const idNum = Number(this.selectedActivityId);
      console.log('🔹 ID convertido a number:', idNum, 'Tipo:', typeof idNum);

      if (idNum === this.NO_ASSOCIATION_VALUE) {
        console.log('🔹 No se asociará ninguna actividad');
        this.dialogRef.close(null);
        return;
      }

      let actividadSeleccionada: Activity | null = null;

      if (this.data.actividadActual?.actividadId === idNum) {
        actividadSeleccionada = this.data.actividadActual;
      } else {
        actividadSeleccionada = this.data.actividadesCoincidentes.find(a => a.actividadId === idNum) || null;
      }

      console.log('🔹 Actividad seleccionada que se enviará al backend:', actividadSeleccionada);
      this.dialogRef.close(actividadSeleccionada);
    }

    onCancelar() {
      console.log('🔹 Cancelar pulsado');
      this.dialogRef.close(null);
    }
  }