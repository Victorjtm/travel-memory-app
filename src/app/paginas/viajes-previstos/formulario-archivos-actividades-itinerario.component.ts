import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Archivo } from '../../modelos/archivo';
import { ArchivoService } from '../../servicios/archivo.service';
import { FilesizePipe } from '../../pipes/filesize.pipe';
import { RouterModule } from '@angular/router';

type TipoArchivo = 'foto' | 'video' | 'audio' | 'texto' | 'imagen';

@Component({
  selector: 'app-formulario-archivos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FilesizePipe,
    RouterModule
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
    private router: Router
  ) {}

  ngOnInit() {
    console.log('[ngOnInit] Inicializando componente'); // LOG
    this.route.paramMap.subscribe(params => {
      this.viajePrevistoId = +params.get('viajePrevistoId')!;
      this.itinerarioId = +params.get('itinerarioId')!;
      this.actividadId = +params.get('actividadId')!;
      console.log('[ngOnInit] Params:', {
        viajePrevistoId: this.viajePrevistoId,
        itinerarioId: this.itinerarioId,
        actividadId: this.actividadId
      }); // LOG

      const archivoId = params.get('archivoId');
      if (archivoId) {
        this.modoEdicion = true;
        this.archivoEditandoId = +archivoId;
        console.log('[ngOnInit] Modo edición activado. archivoEditandoId:', this.archivoEditandoId); // LOG
        this.cargarArchivoParaEdicion(+archivoId);
      } else {
        this.modoEdicion = false;
        console.log('[ngOnInit] Modo creación de archivos'); // LOG
        this.cargarArchivos();
      }
    });
  }

  cargarArchivoParaEdicion(id: number): void {
    console.log('[cargarArchivoParaEdicion] Cargando archivo para edición. ID:', id); // LOG
    this.archivoService.getArchivo(id).subscribe({
      next: (archivo) => {
        console.log('[cargarArchivoParaEdicion] Archivo recibido:', archivo); // LOG
        this.nuevoArchivo = {
          tipo: archivo.tipo,
          descripcion: archivo.descripcion || '',
          horaCaptura: archivo.horaCaptura || this.getHoraActual(),
          geolocalizacion: archivo.geolocalizacion || ''
        };
      },
      error: (err) => console.error('[cargarArchivoParaEdicion] Error cargando archivo:', err) // LOG
    });
  }

  cargarArchivos(): void {
    console.log('[cargarArchivos] Cargando archivos de la actividad:', this.actividadId); // LOG
    this.archivoService.getArchivosPorActividad(this.actividadId)
      .subscribe(archivos => {
        console.log('[cargarArchivos] Archivos recibidos:', archivos); // LOG
        this.archivos = archivos;
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    console.log('[onFileSelected] Evento de selección de archivo:', event); // LOG
    if (input.files && input.files.length > 0) {
      if (this.modoEdicion) {
        this.archivoNuevoSeleccionado = input.files[0];
        console.log('[onFileSelected] Archivo seleccionado para edición:', this.archivoNuevoSeleccionado); // LOG
        this.parsearNombreArchivo(this.archivoNuevoSeleccionado.name);
      } else {
        this.archivosSeleccionados = Array.from(input.files);
        console.log('[onFileSelected] Archivos seleccionados para subida:', this.archivosSeleccionados); // LOG
        this.parsearNombreArchivo(this.archivosSeleccionados[0].name);
      }
    }
  }

  private parsearNombreArchivo(nombre: string): void {
    console.log('[parsearNombreArchivo] Analizando nombre:', nombre); // LOG
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

      console.log('[parsearNombreArchivo] Metadatos extraídos:', {
        tipoRaw, año, mes, dia, hora, minuto, segundo, horaCaptura, fechaISO
      }); // LOG

      this.nuevoArchivo = {
        ...this.nuevoArchivo,
        descripcion: `Archivo importado automáticamente: ${nombre}`,
        horaCaptura: horaCaptura,
        fechaCreacion: new Date(fechaISO).toISOString(),
        tipo: this.detectarTipoDesdeNombre(tipoRaw),
        geolocalizacion: this.nuevoArchivo.geolocalizacion || ''
      };
      console.log('[parsearNombreArchivo] nuevoArchivo actualizado:', this.nuevoArchivo); // LOG
    }
  }

  private detectarTipoDesdeNombre(tipo: string): TipoArchivo | undefined {
    console.log('[detectarTipoDesdeNombre] Tipo detectado:', tipo); // LOG
    switch (tipo) {
      case 'img': return 'foto';
      case 'vid': return 'video';
      case 'audio': return 'audio';
      default: return undefined;
    }
  }

  subirArchivos(): void {
    console.log('[subirArchivos] Subiendo archivos. modoEdicion:', this.modoEdicion); // LOG
    if (this.modoEdicion) {
      this.actualizarArchivoExistente();
    } else {
      this.subirNuevosArchivos();
    }
  }

  private actualizarArchivoExistente(): void {
    if (!this.archivoEditandoId) {
      console.warn('[actualizarArchivoExistente] No hay archivoEditandoId'); // LOG
      return;
    }
    console.log('[actualizarArchivoExistente] Actualizando archivo ID:', this.archivoEditandoId); // LOG

    if (this.archivoNuevoSeleccionado) {
      const formData = new FormData();
      formData.append('archivo', this.archivoNuevoSeleccionado, this.archivoNuevoSeleccionado.name);
      Object.keys(this.nuevoArchivo).forEach(key => {
        const value = this.nuevoArchivo[key as keyof Archivo];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      console.log('[actualizarArchivoExistente] FormData preparado para archivo y metadatos:', formData); // LOG

      this.archivoService.actualizarArchivoConArchivo(this.archivoEditandoId, formData).subscribe({
        next: () => {
          console.log('[actualizarArchivoExistente] Archivo y metadatos actualizados correctamente'); // LOG
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
        error: (err) => console.error('[actualizarArchivoExistente] Error actualizando archivo con archivo:', err) // LOG
      });
    } else {
      console.log('[actualizarArchivoExistente] Solo se actualizarán metadatos:', this.nuevoArchivo); // LOG
      this.archivoService.actualizarArchivo(
        this.archivoEditandoId,
        this.nuevoArchivo
      ).subscribe({
        next: () => {
          console.log('[actualizarArchivoExistente] Metadatos actualizados correctamente'); // LOG
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
        error: (err) => console.error('[actualizarArchivoExistente] Error actualizando metadatos:', err) // LOG
      });
    }
  }

  private subirNuevosArchivos(): void {
    if (this.archivosSeleccionados.length === 0) {
      console.warn('[subirNuevosArchivos] No hay archivos seleccionados'); // LOG
      return;
    }
    console.log('[subirNuevosArchivos] Subiendo nuevos archivos:', this.archivosSeleccionados); // LOG

    const formData = new FormData();
    formData.append('actividadId', this.actividadId.toString());

    Object.keys(this.nuevoArchivo).forEach(key => {
      if (key === 'fechaCreacion') return;
      const value = this.nuevoArchivo[key as keyof Archivo];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    this.archivosSeleccionados.forEach(file => {
      formData.append('archivos', file, file.name);
    });
    console.log('[subirNuevosArchivos] FormData preparado:', formData); // LOG

    this.archivoService.subirArchivos(formData).subscribe({
      next: (archivosSubidos) => {
        console.log('[subirNuevosArchivos] Archivos subidos:', archivosSubidos); // LOG
        this.archivos = [...this.archivos, ...archivosSubidos];
        this.resetFormulario();
      },
      error: (err) => console.error('[subirNuevosArchivos] Error subiendo archivos:', err) // LOG
    });
  }

  eliminarArchivo(id: number): void {
    console.log('[eliminarArchivo] Solicitando eliminación de archivo ID:', id); // LOG
    if (confirm('¿Estás seguro de eliminar este archivo?')) {
      this.archivoService.eliminarArchivo(id).subscribe({
        next: () => {
          console.log('[eliminarArchivo] Archivo eliminado:', id); // LOG
          this.archivos = this.archivos.filter(a => a.id !== id);
        },
        error: (err) => console.error('[eliminarArchivo] Error eliminando archivo:', err) // LOG
      });
    } else {
      console.log('[eliminarArchivo] Eliminación cancelada por el usuario'); // LOG
    }
  }

  volverAActividad(): void {
    console.log('[volverAActividad] Navegando a la actividad'); // LOG
    this.router.navigate([
      '/viajes-previstos',
      this.viajePrevistoId,
      'itinerarios',
      this.itinerarioId,
      'actividades'
    ]);
  }

  resetFormulario(): void {
    console.log('[resetFormulario] Reseteando formulario'); // LOG
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
    const hora = ahora.toTimeString().substring(0,5); // HH:mm
    console.log('[getHoraActual] Hora actual:', hora); // LOG
    return hora;
  }

  capturarGeolocalizacion(): void {
    console.log('[capturarGeolocalizacion] Intentando capturar geolocalización'); // LOG
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
        console.log('[capturarGeolocalizacion] Geolocalización capturada:', this.nuevoArchivo.geolocalizacion); // LOG
      },
      (error) => {
        console.error('[capturarGeolocalizacion] Error obteniendo ubicación:', error); // LOG
        alert('Error al obtener la ubicación: ' + error.message);
      }
    );
  }
}
