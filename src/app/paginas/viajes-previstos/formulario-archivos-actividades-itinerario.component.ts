import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Archivo } from '../../modelos/archivo';
import { ArchivoService } from '../../servicios/archivo.service';
import { FilesizePipe } from '../../pipes/filesize.pipe';
import { RouterModule } from '@angular/router';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';

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
    MatButtonModule
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
        this.parsearNombreArchivo(this.archivosSeleccionados[0].name);
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

  // NUEVO: Subida de archivos con coincidencias y diálogo
  private async subirNuevosArchivos(): Promise<void> {
    if (this.archivosSeleccionados.length === 0) {
      return;
    }

    for (const file of this.archivosSeleccionados) {
  console.log(`[🔍 INICIO] Buscando coincidencias para: ${file.name}`);

  const resultado = await this.archivoService
    .buscarCoincidencias(file, this.viajePrevistoId, this.actividadId)
    .toPromise();

  if (resultado && Array.isArray(resultado.actividadesCoincidentes)) {
    if (resultado.actividadesCoincidentes.length > 0) {
      console.log(`[✅ COINCIDENCIAS] Se encontraron ${resultado.actividadesCoincidentes.length} para: ${file.name}`);
    } else {
      console.log(`[❌ SIN COINCIDENCIAS] No se encontraron coincidencias para: ${file.name}`);
    }
  } else {
    console.warn(`[⚠️ ERROR] Respuesta inválida o vacía al buscar coincidencias para: ${file.name}`);
    continue;
  }

  console.log(`[✅ FIN] Búsqueda de coincidencias terminada para: ${file.name}`);

  let actividadElegidaId = this.actividadId;

  if (resultado.actividadesCoincidentes.length > 0) {
    const actividadElegida = await this.mostrarDialogoSeleccion(
      resultado.actividadesCoincidentes,
      resultado.actividadActual
    );
    if (actividadElegida) {
      actividadElegidaId = actividadElegida.id;
    } else {
      continue;
    }
  }

  const formData = new FormData();
  formData.append('actividadId', actividadElegidaId.toString());
  Object.keys(this.nuevoArchivo).forEach(key => {
    if (key === 'fechaCreacion') return;
    const value = this.nuevoArchivo[key as keyof Archivo];
    if (value !== undefined && value !== null) {
      formData.append(key, value.toString());
    }
  });
  formData.append('archivos', file, file.name);

  await this.archivoService.subirArchivos(formData).toPromise();
}


    this.resetFormulario();
    this.cargarArchivos();
  }

  // NUEVO: Diálogo de selección de actividad
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
        resolve(result || null);
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
}

@Component({
  selector: 'app-activity-match-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatRadioModule,
    MatButtonModule,
    FormsModule
  ],
  template: `
    <div class="dialog-container">
  <h2 class="dialog-title">Asociar archivo</h2>

  

  <mat-radio-group [(ngModel)]="actividadSeleccionadaId">
    <!-- Actividad actual -->
    <mat-radio-button *ngIf="data.actividadActual" [value]="data.actividadActual.id">
      <div class="activity-option">
        <span class="activity-option-name">{{data.actividadActual.nombre}}</span>
        <span class="activity-option-details">
          {{data.actividadActual.horaInicio}} - {{data.actividadActual.horaFin}}
        </span>
      </div>
    </mat-radio-button>

    <!-- Otras actividades -->
    <ng-container *ngIf="data.actividadesCoincidentes?.length > 0">
      <mat-radio-button *ngFor="let act of data.actividadesCoincidentes" [value]="act.id">
        <div class="activity-option">
          <span class="activity-option-name">{{act.nombre}}</span>
          <span class="activity-option-details">
            <span>{{formatFecha(act.fechaInicio)}}</span>
            <span>{{act.horaInicio}} - {{act.horaFin}}</span>
          </span>
        </div>
      </mat-radio-button>
    </ng-container>

    <!-- No asociar -->
    <mat-radio-button [value]="null">
      <div class="activity-option">
        <span class="activity-option-name">No asociar a ninguna actividad</span>
      </div>
    </mat-radio-button>
  </mat-radio-group>

  <div class="dialog-actions">
    <button class="btn-cancelar" (click)="onCancelar()">
      <i class="fa fa-times"></i> Cancelar
    </button>
    <button class="btn-aceptar" (click)="onAceptar()">
      <i class="fa fa-check"></i> Aceptar
    </button>
  </div>
</div>

  `,
  styleUrls: ['./itinerario/activity-match-dialog.component.scss']
})
export class ActivityMatchDialogComponent implements OnInit {
  actividadSeleccionadaId: string | number | null = null;

  constructor(
    public dialogRef: MatDialogRef<ActivityMatchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    console.log('Datos recibidos en el diálogo:', this.data);

    if (this.data.actividadesCoincidentes?.length === 1) {
      this.actividadSeleccionadaId = this.data.actividadesCoincidentes[0].id;
      console.log('Solo una actividad coincidente, selección por defecto:', this.actividadSeleccionadaId);
    } else if (this.data.actividadActual) {
      // Si quieres que por defecto se seleccione la actividad actual si no hay coincidencias únicas
      this.actividadSeleccionadaId = this.data.actividadActual.id;
      console.log('Actividad actual seleccionada por defecto:', this.actividadSeleccionadaId);
    }
  }

  formatFecha(fecha: string): string {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  onAceptar() {
    console.log('Aceptar pulsado. ID seleccionado:', this.actividadSeleccionadaId);

    if (this.actividadSeleccionadaId === null) {
      console.log('No se asocia ninguna actividad.');
      this.dialogRef.close(null);
      return;
    }

    // Buscamos la actividad seleccionada por id
    let actividad = null;

    if (this.data.actividadActual?.id === this.actividadSeleccionadaId) {
      actividad = this.data.actividadActual;
    } else {
      actividad = this.data.actividadesCoincidentes.find((a: any) => a.id === this.actividadSeleccionadaId);
    }

    console.log('Actividad seleccionada:', actividad);

    this.dialogRef.close(actividad);
  }

  onCancelar() {
    console.log('Cancelar pulsado. Cerrando diálogo sin selección.');
    this.dialogRef.close(null);
  }
}