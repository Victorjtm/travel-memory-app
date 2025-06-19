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
    RouterModule // ✅ necesario para inyectar Router en standalone
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
      error: (err) => console.error('Error cargando archivo:', err)
    });
  }

  cargarArchivos(): void {
    this.archivoService.getArchivosPorActividad(this.actividadId)
      .subscribe(archivos => this.archivos = archivos);
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
    if (!this.archivoEditandoId) return;

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
        error: (err) => console.error('Error actualizando archivo con archivo:', err)
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
        error: (err) => console.error('Error actualizando metadatos:', err)
      });
    }
  }

  private subirNuevosArchivos(): void {
    if (this.archivosSeleccionados.length === 0) return;

    const formData = new FormData();
    formData.append('actividadId', this.actividadId.toString());

    Object.keys(this.nuevoArchivo).forEach(key => {
      // ❌ No enviar fechaCreacion — deja que el backend la determine
      if (key === 'fechaCreacion') return;
    
      const value = this.nuevoArchivo[key as keyof Archivo];
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    

    this.archivosSeleccionados.forEach(file => {
      formData.append('archivos', file, file.name);
    });

    this.archivoService.subirArchivos(formData).subscribe({
      next: (archivosSubidos) => {
        this.archivos = [...this.archivos, ...archivosSubidos];
        this.resetFormulario();
      },
      error: (err) => console.error('Error subiendo archivos:', err)
    });
  }

  eliminarArchivo(id: number): void {
    if (confirm('¿Estás seguro de eliminar este archivo?')) {
      this.archivoService.eliminarArchivo(id).subscribe({
        next: () => {
          this.archivos = this.archivos.filter(a => a.id !== id);
        },
        error: (err) => console.error('Error eliminando archivo:', err)
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

  // Verificar si estamos en HTTPS o localhost
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
      console.error('❌ Error obteniendo ubicación:', error);
      alert('Error al obtener la ubicación: ' + error.message);
    }
  );
}
}
