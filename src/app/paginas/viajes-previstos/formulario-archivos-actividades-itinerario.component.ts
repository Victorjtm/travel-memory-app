import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // necesario para [(ngModel)]
import { Archivo } from '../../modelos/archivo';
import { ArchivoService } from '../../servicios/archivo.service';
import { FilesizePipe } from '../../pipes/filesize.pipe';
import { RouterModule } from '@angular/router';

// Angular Material
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio'; // para mat-radio-group y mat-radio-button
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // para iconos
import { MatProgressBarModule } from '@angular/material/progress-bar'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

// ✅ Corrección principal: si vas a usar [(ngModel)] en mat-radio-group, FormsModule debe estar importado
// y NO usar ngValue en mat-radio-button. Solo usar [value] como en el código reescrito previamente.


  type TipoArchivo = 'foto' | 'video' | 'audio' | 'texto' | 'imagen';


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
    archivos: Archivo[] = [];
    archivosSeleccionados: File[] = [];
    modoEdicion: boolean = false;
    archivoEditandoId: number | null = null;
    archivoNuevoSeleccionado: File | null = null;
    archivoOriginal: Archivo | null = null;
    cargandoArchivo: boolean = false;
    guardandoArchivo: boolean = false;
    mostrarDebug: boolean = false;

    viajePrevistoId!: number;
    itinerarioId!: number;
    actividadId!: number;

    nuevoArchivo: Partial<Archivo> = {
      tipo: 'foto',
      horaCaptura: this.getHoraActual(),
      fechaCreacion: new Date().toISOString()
    };

    // ✅ NUEVAS VARIABLES - Añadir después de las propiedades existentes
  // Variables para control de progreso de subida
  subiendoArchivos: boolean = false;           // ¿Está subiendo actualmente?
  archivoActualIndex: number = 0;              // ¿Cuál archivo está subiendo? (0, 1, 2...)
  totalArchivos: number = 0;                   // ¿Cuántos archivos en total?
  porcentajeArchivoActual: number = 0;         // ¿Qué % lleva el archivo actual?
  nombreArchivoActual: string = '';            // ¿Cómo se llama el archivo que está subiendo?

  // ✅ PROPIEDAD CALCULADA - El progreso global
  get progresoGlobal(): number {
    if (this.totalArchivos === 0) return 0;
    
    // Archivos ya completados + progreso del archivo actual
    const archivosCompletados = this.archivoActualIndex;
    const progresoActual = this.porcentajeArchivoActual / 100;
    
    return Math.round(((archivosCompletados + progresoActual) / this.totalArchivos) * 100);
  }

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

    // Método que se ejecuta cuando se envía el formulario
onFormSubmit(): void {
  console.log('[📝 FORM SUBMIT] Datos a enviar:', this.nuevoArchivo);
  console.log('[📝 FORM SUBMIT] Modo edición:', this.modoEdicion);
  console.log('[📝 FORM SUBMIT] ID archivo:', this.archivoEditandoId);
  
  if (this.modoEdicion) {
    this.debugearDatosEdicion();
  }
  
  this.subirArchivos();
}

// Método para debugear datos en edición
private debugearDatosEdicion(): void {
  console.log('=== DEBUG EDICIÓN ===');
  console.log('Archivo Original:', this.archivoOriginal);
  console.log('Datos nuevos:', this.nuevoArchivo);
  console.log('Hay cambios:', this.hayCambios);
  console.log('Archivo nuevo seleccionado:', this.archivoNuevoSeleccionado?.name);
  console.log('ID de archivo editando:', this.archivoEditandoId);
}

// Métodos para detectar cambios específicos
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

// Método para cancelar edición
cancelarEdicion(): void {
  if (this.hayCambios) {
    if (confirm('¿Descartar los cambios realizados?')) {
      this.volverAListaArchivos();
    }
  } else {
    this.volverAListaArchivos();
  }
}

// ✅ NUEVO: Método para extraer mensaje de error legible
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

// Método para obtener información de debug
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


  cargarArchivoParaEdicion(id: number): void {
    this.cargandoArchivo = true;
    
    this.archivoService.getArchivo(id).subscribe({
      next: (archivo) => {
        console.log('[📄 CARGANDO ARCHIVO]', archivo);
        
        this.archivoOriginal = { ...archivo }; // Guardar copia original
        
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

    cargarArchivos(): void {
      this.archivoService.getArchivosPorActividad(this.actividadId)
        .subscribe(archivos => {
          this.archivos = archivos;
        });
    }

    onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      if (this.modoEdicion) {
        this.archivoNuevoSeleccionado = input.files[0];
        this.parsearNombreArchivo(this.archivoNuevoSeleccionado.name);
      } else {
        this.archivosSeleccionados = Array.from(input.files);
        // ✅ Solo parsear el primer archivo para mostrar preview, 
        // los metadatos reales se procesarán individualmente en subirNuevosArchivos()
        if (this.archivosSeleccionados.length > 0) {
          this.parsearNombreArchivo(this.archivosSeleccionados[0].name);
        }
      }
    }
  }

private parsearNombreArchivo(nombre: string): void {
  const regex = /(IMG|VID|AUDIO)?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i;
  const match = nombre.match(regex);

  if (!match) {
    console.log(`[❌ NO MATCH] ${nombre} no coincide con el patrón de fecha`);
    return;
  }

  const tipoRaw = match[1]?.toLowerCase() || '';
  const año = match[2];
  const mes = match[3];
  const dia = match[4];
  const hora = match[5];
  const minuto = match[6];
  const segundo = match[7];

  // Crear fecha local
  const fechaLocal = new Date(Number(año), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));
  const horaCaptura = `${hora}:${minuto}:${segundo}`;

  // Construir ISO local para evitar desfase UTC
  const fechaISO = `${fechaLocal.getFullYear()}-${(fechaLocal.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${fechaLocal.getDate().toString().padStart(2, '0')}T${fechaLocal
    .getHours()
    .toString()
    .padStart(2, '0')}:${fechaLocal.getMinutes().toString().padStart(2, '0')}:${fechaLocal
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;

  const tipoDetectado = this.detectarTipoDesdeNombre(tipoRaw);

  // Solo actualizar si no estamos en modo edición o si es la primera vez
  if (!this.modoEdicion) {
    this.nuevoArchivo = {
      ...this.nuevoArchivo,
      descripcion: this.nuevoArchivo.descripcion || `Archivo importado automáticamente: ${nombre}`,
      fechaCreacion: fechaISO,
      horaCaptura: horaCaptura,
      tipo: tipoDetectado || this.nuevoArchivo.tipo,
      geolocalizacion: this.nuevoArchivo.geolocalizacion || ''
    };
  } else {
    // En modo edición, solo sugerir cambios si el usuario no ha modificado manualmente
    if (!this.hayCambiosManuales()) {
      this.nuevoArchivo.fechaCreacion = fechaISO;
      this.nuevoArchivo.horaCaptura = horaCaptura;
      if (tipoDetectado) {
        this.nuevoArchivo.tipo = tipoDetectado;
      }
    }
  }

  console.log(`[📅 PARSEANDO] ${nombre}`);
  console.log(`  - Fecha local: ${fechaLocal}`);
  console.log(`  - Fecha ISO (local): ${this.nuevoArchivo.fechaCreacion}`);
  console.log(`  - Hora captura: ${horaCaptura}`);
}



    private detectarTipoDesdeNombre(tipo: string): TipoArchivo | undefined {
      switch (tipo) {
        case 'img': return 'foto';
        case 'vid': return 'video';
        case 'audio': return 'audio';
        default: return undefined;
      }
    }

    subirArchivos(): void {
      if (this.modoEdicion) {
        this.actualizarArchivoExistente();
      } else {
        this.subirNuevosArchivos();
      }
    }

private actualizarArchivoExistente(): void {
  if (!this.archivoEditandoId) {
    console.error('[❌ ERROR] ID de archivo no válido');
    alert('Error: ID de archivo no válido');
    return;
  }

  // Validaciones
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
    
    // ✅ IMPORTANTE: Asegurar que todos los campos se envían
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
    
    // ✅ CREAR OBJETO LIMPIO con solo los campos necesarios
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

    // ✅ Método corregido para parsear metadatos específicos de cada archivo
private parsearMetadatosArchivo(nombreArchivo: string): Partial<Archivo> {
  const regex = /(IMG|VID|AUDIO)?[-_]?(\d{4})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})[-_]?(\d{2})/i;

  const match = nombreArchivo.match(regex);

  // Metadatos base como fallback
  const metadatos: Partial<Archivo> = {
    tipo: this.nuevoArchivo.tipo || 'foto',
    descripcion: `Archivo importado automáticamente: ${nombreArchivo}`,
    horaCaptura: this.getHoraActual(), // fallback si no hay match
    geolocalizacion: this.nuevoArchivo.geolocalizacion || '',
    fechaCreacion: new Date().toISOString() // fallback a fecha actual
  };

  if (match) {
    const tipoRaw = match[1]?.toLowerCase() || '';
    const año = parseInt(match[2], 10);
    const mes = parseInt(match[3], 10);
    const dia = parseInt(match[4], 10);
    const hora = parseInt(match[5], 10);
    const minuto = parseInt(match[6], 10);
    const segundo = parseInt(match[7], 10);

    // Validar que los valores extraídos sean válidos
    if (this.validarFechaHora(año, mes, dia, hora, minuto, segundo)) {
      // Crear fecha local según nombre del archivo
      const fechaLocal = new Date(año, mes - 1, dia, hora, minuto, segundo);

      // Formatear ISO local sin "Z" para mantener la hora exacta
      const fechaISO = fechaLocal.getFullYear() + '-' +
        String(fechaLocal.getMonth() + 1).padStart(2, '0') + '-' +
        String(fechaLocal.getDate()).padStart(2, '0') + 'T' +
        String(fechaLocal.getHours()).padStart(2, '0') + ':' +
        String(fechaLocal.getMinutes()).padStart(2, '0') + ':' +
        String(fechaLocal.getSeconds()).padStart(2, '0');

      // Actualizar metadatos con valores parseados
      metadatos.fechaCreacion = fechaISO;
      metadatos.horaCaptura = String(hora).padStart(2, '0') + ':' + 
                             String(minuto).padStart(2, '0') + ':' + 
                             String(segundo).padStart(2, '0');

      // Detectar tipo de archivo desde el nombre
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

// Método auxiliar para validar fecha y hora
private validarFechaHora(año: number, mes: number, dia: number, hora: number, minuto: number, segundo: number): boolean {
  // Validar rangos básicos
  if (año < 1900 || año > 2100) return false;
  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;
  if (hora < 0 || hora > 23) return false;
  if (minuto < 0 || minuto > 59) return false;
  if (segundo < 0 || segundo > 59) return false;

  // Validar que la fecha sea válida (ej: no 31 de febrero)
  const fechaTest = new Date(año, mes - 1, dia);
  return fechaTest.getFullYear() === año && 
         fechaTest.getMonth() === mes - 1 && 
         fechaTest.getDate() === dia;
}



  // ✅ NUEVO: Método de subida con lógica mejorada para coincidencias
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

    // 1️⃣ Buscar coincidencias de actividad
    const resultado = await this.archivoService
      .buscarCoincidencias(file, this.viajePrevistoId, this.actividadId)
      .toPromise();

    let actividadElegidaId = this.actividadId;

    if (resultado && Array.isArray(resultado.actividadesCoincidentes)) {
      if (resultado.actividadesCoincidentes.length === 1) {
        const act = resultado.actividadesCoincidentes[0];
        actividadElegidaId = Number(act.id || act.actividadId || act.actividad_id || act.ID) || this.actividadId;
        console.log(`[✅ AUTO-ASIGNADA] ${file.name} → Actividad ID: ${actividadElegidaId}`);
      } else if (resultado.actividadesCoincidentes.length > 1) {
        const coincidenciasValidas = resultado.actividadesCoincidentes.filter(act => {
          const id = act.id || act.actividadId || act.actividad_id || act.ID;
          return id && !isNaN(Number(id));
        });
        if (coincidenciasValidas.length > 0) {
          const actividadElegida = await this.mostrarDialogoSeleccion(coincidenciasValidas, resultado.actividadActual);
          if (actividadElegida) {
            actividadElegidaId = Number(actividadElegida.id || actividadElegida.actividadId || actividadElegida.actividad_id || actividadElegida.ID);
            console.log(`[✅ ACTIVIDAD] Seleccionada ID: ${actividadElegidaId}`);
          } else {
            console.log(`[❌ CANCELADO] Usuario canceló la selección para: ${file.name}`);
            continue; // saltar a siguiente archivo
          }
        }
      } else {
        console.log(`[ℹ️ SIN COINCIDENCIAS] Usando actividad actual ID: ${actividadElegidaId}`);
      }
    }

    // 2️⃣ Parsear metadatos y preparar FormData
    const metadatosArchivo = this.parsearMetadatosArchivo(file.name);
    metadatosArchivo.fechaCreacion = new Date(file.lastModified).toISOString();
    metadatosArchivo.horaCaptura = new Date(file.lastModified).toLocaleTimeString("es-ES", {
      hour12: false
    });

    const formData = new FormData();
    formData.append('actividadId', actividadElegidaId.toString());
    Object.keys(metadatosArchivo).forEach(key => {
      const value = metadatosArchivo[key as keyof Archivo];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    formData.append('archivos', file, file.name);

    // 3️⃣ Simular progreso y subir archivo
    try {
      const pasos = 20; // pasos de progreso
      for (let i = 1; i <= pasos; i++) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms entre pasos
        this.porcentajeArchivoActual = (i / pasos) * 100;
      }

      await this.archivoService.subirArchivos(formData).toPromise();
      console.log(`[✅ SUBIDO] ${file.name} correctamente`);
    } catch (error) {
      console.error(`[❌ ERROR SUBIDA] ${file.name}:`, error);
      alert(`Error subiendo ${file.name}: ${this.extraerMensajeError(error)}`);
      this.porcentajeArchivoActual = 0;
      this.nombreArchivoActual = `❌ Error: ${file.name}`;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Archivo completado
    this.archivoActualIndex++;
    this.porcentajeArchivoActual = 0;
  }

  console.log(`[🏁 FIN SUBIDA] Todos los archivos procesados`);
  this.subiendoArchivos = false;
  this.resetFormulario();
  this.cargarArchivos();
}



  // ✅ MÉTODO AUXILIAR: Convertir timestamp EXIF a ISO (si necesitas usarlo)
  private exifTimestampToISO(timestamp: number): string {
    // Los timestamps EXIF suelen estar en segundos desde epoch
    const fecha = new Date(timestamp * 1000);
    return fecha.toISOString();
  }

  // ✅ MÉTODO DE DEBUG: Para verificar qué se está enviando
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

    
    // Abre un diálogo para que el usuario seleccione una actividad
private mostrarDialogoSeleccion(actividadesCoincidentes: any[], actividadActual: any | null): Promise<any | null> {
  return new Promise(resolve => {
    const dialogRef = this.dialog.open(ActivityMatchDialogComponent, {
      width: '400px',
      data: {
        actividadesCoincidentes,
        actividadActual
      }
    });

    // Se resuelve la promesa con el resultado del diálogo
    dialogRef.afterClosed().subscribe(result => {
      console.log('📌 Resultado del diálogo:', result);
      resolve(result || null); // null si el usuario cancela
    });
  });
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

    volverAActividad(): void {
      this.router.navigate([
        '/viajes-previstos',
        this.viajePrevistoId,
        'itinerarios',
        this.itinerarioId,
        'actividades'
      ]);
    }
// ✅ 6. AÑADIR NUEVOS MÉTODOS al final de la clase
  
  // Método para limpiar selección de archivo en edición
  limpiarArchivoSeleccionado(): void {
    this.archivoNuevoSeleccionado = null;
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    console.log('[🗑️ ARCHIVO LIMPIADO]');
  }

  // Verificar si el usuario ha hecho cambios manuales
  private hayCambiosManuales(): boolean {
    if (!this.archivoOriginal) return false;
    
    return (
      this.nuevoArchivo.descripcion !== this.archivoOriginal.descripcion ||
      this.nuevoArchivo.tipo !== this.archivoOriginal.tipo
    );
  }

  // Validación de datos del archivo
private validarDatosArchivo(): boolean {
  const errores: string[] = [];

  if (!this.nuevoArchivo.tipo) {
    errores.push('El tipo de archivo es obligatorio');
  }

  if (!this.nuevoArchivo.horaCaptura) {
    errores.push('La hora de captura es obligatoria');
  } else {
    // Validar formato de hora
    const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (!horaRegex.test(this.nuevoArchivo.horaCaptura)) {
      errores.push('El formato de hora no es válido (HH:mm o HH:mm:ss)');
    }
  }

  // Validar descripción (opcional pero si existe debe tener contenido útil)
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


  // Métodos para mostrar mensajes
private mostrarMensajeExito(mensaje: string): void {
  alert('✅ ' + mensaje);
  console.log('[✅ ÉXITO]', mensaje);
}

private mostrarMensajeError(mensaje: string): void {
  alert('❌ ' + mensaje);
  console.error('[❌ ERROR]', mensaje);
}

  // Navegar a la lista de archivos
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

  resetFormulario(): void {
    this.archivosSeleccionados = [];
    this.archivoNuevoSeleccionado = null; // ✅ AÑADIR esta línea
    this.archivoOriginal = null; // ✅ AÑADIR esta línea
    this.guardandoArchivo = false; // ✅ AÑADIR esta línea
    
    this.nuevoArchivo = {
      tipo: 'foto',
      descripcion: '',
      horaCaptura: this.getHoraActual(),
      geolocalizacion: '',
      fechaCreacion: new Date().toISOString()
    };
  }

  // ✅ NUEVOS GETTERS
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
    // ✅ NUEVO MÉTODO - Para cancelar subida (opcional)
    cancelarSubida(): void {
      if (confirm('¿Estás seguro de cancelar la subida?')) {
        this.subiendoArchivos = false;
        this.porcentajeArchivoActual = 0;
        this.archivoActualIndex = 0;
        this.nombreArchivoActual = '';
        console.log('[🛑 CANCELADO] Subida cancelada por el usuario');
      }
    }

    tiposArchivo = [
      { value: 'foto', label: 'Foto' },
      { value: 'video', label: 'Vídeo' },
      { value: 'audio', label: 'Audio' },
      { value: 'texto', label: 'Texto' },
      { value: 'imagen', label: 'Imagen' }
    ];
  }


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

