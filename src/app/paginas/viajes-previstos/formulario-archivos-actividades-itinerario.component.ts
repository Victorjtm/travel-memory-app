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
      MatProgressBarModule,        // ✅ NUEVO
      MatProgressSpinnerModule,
      MatIconModule     // ✅ NUEVO
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

    cargarArchivoParaEdicion(id: number): void {
      this.archivoService.getArchivo(id).subscribe({
        next: (archivo) => {
          this.nuevoArchivo = {
            tipo: archivo.tipo,
            descripcion: archivo.descripcion || '',
            horaCaptura: archivo.horaCaptura || this.getHoraActual(),
            geolocalizacion: archivo.geolocalizacion || ''
          };
        },
        error: (err) => console.error('[cargarArchivoParaEdicion] Error cargando archivo:', err)
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

      if (match) {
        const tipoRaw = match[1]?.toLowerCase() || '';
        const año = match[2];
        const mes = match[3];
        const dia = match[4];
        const hora = match[5];
        const minuto = match[6];
        const segundo = match[7];

        const horaCaptura = `${hora}:${minuto}`;
        const fechaISO = `${año}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;

        this.nuevoArchivo = {
          ...this.nuevoArchivo,
          descripcion: `Archivo importado automáticamente: ${nombre}`,
          horaCaptura: horaCaptura,
          fechaCreacion: new Date(fechaISO).toISOString(),
          tipo: this.detectarTipoDesdeNombre(tipoRaw),
          geolocalizacion: this.nuevoArchivo.geolocalizacion || ''
        };
      }
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
        return;
      }

      if (this.archivoNuevoSeleccionado) {
        const formData = new FormData();
        formData.append('archivo', this.archivoNuevoSeleccionado, this.archivoNuevoSeleccionado.name);
        Object.keys(this.nuevoArchivo).forEach(key => {
          const value = this.nuevoArchivo[key as keyof Archivo];
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });

        this.archivoService.actualizarArchivoConArchivo(this.archivoEditandoId, formData).subscribe({
          next: () => {
            alert('Archivo y metadatos actualizados correctamente');
            this.router.navigate([
              '/viajes-previstos',
              this.viajePrevistoId,
              'itinerarios',
              this.itinerarioId,
              'actividades',
              this.actividadId,
              'archivos'
            ]);
          },
          error: (err) => console.error('[actualizarArchivoExistente] Error actualizando archivo con archivo:', err)
        });
      } else {
        this.archivoService.actualizarArchivo(
          this.archivoEditandoId,
          this.nuevoArchivo
        ).subscribe({
          next: () => {
            alert('Metadatos actualizados correctamente');
            this.router.navigate([
              '/viajes-previstos',
              this.viajePrevistoId,
              'itinerarios',
              this.itinerarioId,
              'actividades',
              this.actividadId,
              'archivos'
            ]);
          },
          error: (err) => console.error('[actualizarArchivoExistente] Error actualizando metadatos:', err)
        });
      }
    }

    // ✅ Método corregido para parsear metadatos específicos de cada archivo
  private parsearMetadatosArchivo(nombreArchivo: string): Partial<Archivo> {
    const regex = /(IMG|VID|AUDIO)?(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/i;
    const match = nombreArchivo.match(regex);

    // Metadatos base con fecha actual como fallback
    const metadatos: Partial<Archivo> = {
      tipo: this.nuevoArchivo.tipo || 'foto',
      descripcion: `Archivo importado automáticamente: ${nombreArchivo}`,
      horaCaptura: this.getHoraActual(),
      geolocalizacion: this.nuevoArchivo.geolocalizacion || '',
      fechaCreacion: new Date().toISOString() // Fallback a fecha actual
    };

    if (match) {
      const tipoRaw = match[1]?.toLowerCase() || '';
      const año = match[2];
      const mes = match[3];
      const dia = match[4];
      const hora = match[5];
      const minuto = match[6];
      const segundo = match[7];

      // ✅ CORREGIDO: Construir fecha ISO completa
      const fechaISO = `${año}-${mes}-${dia}T${hora}:${minuto}:${segundo}.000Z`;
      const horaCaptura = `${hora}:${minuto}:${segundo}`;

      console.log(`[📅 PARSEANDO] ${nombreArchivo}:`);
      console.log(`  - Fecha ISO construida: ${fechaISO}`);
      console.log(`  - Hora captura: ${horaCaptura}`);

      // Validar que la fecha sea válida
      const fechaParseada = new Date(fechaISO);
      if (!isNaN(fechaParseada.getTime())) {
        metadatos.fechaCreacion = fechaParseada.toISOString();
        metadatos.horaCaptura = horaCaptura;
        
        console.log(`  - ✅ Fecha válida asignada: ${metadatos.fechaCreacion}`);
      } else {
        console.log(`  - ❌ Fecha inválida, usando fecha actual como fallback`);
      }

      // Actualizar descripción y tipo
      metadatos.descripcion = `Archivo importado automáticamente: ${nombreArchivo}`;
      
      const tipoDetectado = this.detectarTipoDesdeNombre(tipoRaw);
      if (tipoDetectado) {
        metadatos.tipo = tipoDetectado;
      }
    } else {
      console.log(`[❌ NO MATCH] ${nombreArchivo} no coincide con el patrón de fecha`);
    }

    return metadatos;
  }

  // ✅ NUEVO: Método de subida con lógica mejorada para coincidencias
 private async subirNuevosArchivos(): Promise<void> {
  if (this.archivosSeleccionados.length === 0) {
    return;
  }

  console.log(`[🚀 INICIO SUBIDA] Procesando ${this.archivosSeleccionados.length} archivo(s)`);

  for (const file of this.archivosSeleccionados) {
    console.log(`\n[🔍 PROCESANDO] ${file.name}`);

    // Buscar coincidencias
    const resultado = await this.archivoService
      .buscarCoincidencias(file, this.viajePrevistoId, this.actividadId)
      .toPromise();

    if (!resultado || !Array.isArray(resultado.actividadesCoincidentes)) {
      console.warn(`[⚠️ ERROR] Respuesta inválida al buscar coincidencias para: ${file.name}`);
      continue;
    }

    console.log(`[📊 COINCIDENCIAS] ${resultado.actividadesCoincidentes.length} encontradas`);

    let actividadElegidaId = this.actividadId;

    // ✅ Si hay solo 1 coincidencia → asignar directamente
    if (resultado.actividadesCoincidentes.length === 1) {
      const primeraCoincidencia = resultado.actividadesCoincidentes[0];
      console.log(`[🔍 ESTRUCTURA REAL]:`, Object.keys(primeraCoincidencia));
      console.log(`[🔍 COINCIDENCIA COMPLETA]:`, primeraCoincidencia);

      const actividadId = primeraCoincidencia.id ||
                          primeraCoincidencia.actividadId ||
                          primeraCoincidencia.actividad_id ||
                          primeraCoincidencia.ID;

      if (actividadId && !isNaN(Number(actividadId))) {
        actividadElegidaId = Number(actividadId);
        console.log(`[✅ AUTO-ASIGNADA] ${file.name} → Actividad ID: ${actividadElegidaId}`);
      } else {
        console.error(`[❌ ERROR] No se encontró ID válido en:`, primeraCoincidencia);
        actividadElegidaId = this.actividadId; // fallback
      }
    }
    // ✅ Si hay más de una coincidencia → mostrar diálogo
    else if (resultado.actividadesCoincidentes.length > 1) {
      const coincidenciasValidas = resultado.actividadesCoincidentes.filter(act => {
        const id = act.id || act.actividadId || act.actividad_id || act.ID;
        return id && !isNaN(Number(id));
      });

      if (coincidenciasValidas.length === 0) {
        console.error(`[❌ ERROR] Ninguna coincidencia tiene ID válido`);
        actividadElegidaId = this.actividadId; // fallback
      } else {
        const actividadElegida = await this.mostrarDialogoSeleccion(
          coincidenciasValidas,
          resultado.actividadActual
        );

        if (actividadElegida) {
          const id = actividadElegida.id || actividadElegida.actividadId || actividadElegida.actividad_id || actividadElegida.ID;
          actividadElegidaId = Number(id);
          console.log(`[✅ ACTIVIDAD] Seleccionada ID: ${actividadElegidaId}`);
        } else {
          console.log(`[❌ CANCELADO] Usuario canceló la selección para: ${file.name}`);
          continue; // saltar a siguiente archivo
        }
      }
    }
    // ✅ Si no hay coincidencias → usar actividad actual
    else {
      console.log(`[ℹ️ SIN COINCIDENCIAS] Usando actividad actual ID: ${actividadElegidaId}`);
    }

    // ✅ Parsear metadatos
const metadatosArchivo = this.parsearMetadatosArchivo(file.name);

// Sobrescribir o añadir la fecha real del archivo
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


    try {
      await this.archivoService.subirArchivos(formData).toPromise();
      console.log(`[✅ SUBIDO] ${file.name} procesado correctamente`);
    } catch (error) {
      console.error(`[❌ ERROR SUBIDA] ${file.name}:`, error);
      alert(`Error subiendo ${file.name}: ${error}`);
      this.porcentajeArchivoActual = 0;
      this.nombreArchivoActual = `❌ Error: ${file.name}`;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`[🏁 FIN SUBIDA] Todos los archivos procesados`);
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

    resetFormulario(): void {
      this.archivosSeleccionados = [];
      this.nuevoArchivo = {
        tipo: 'foto',
        descripcion: '',
        horaCaptura: this.getHoraActual(),
        geolocalizacion: '',
        fechaCreacion: new Date().toISOString()
      };
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

