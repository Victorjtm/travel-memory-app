import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ArchivoService } from '../../../../servicios/archivo.service';
import { Archivo } from '../../../../modelos/archivo';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { FormsModule } from '@angular/forms';
import { ActividadesItinerariosService} from '../../../../servicios/actividades-itinerarios.service';
import { Actividad } from '../../../../modelos/actividad.model';

// ...
@Component({
  selector: 'app-archivos-sin-asignacion',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    FormsModule
  ],
  templateUrl: './crud-archivos-sin-asignacion.component.html',
  styleUrls: ['./crud-archivos-sin-asignacion.component.scss']
})
export class CrudArchivosSinAsignacionComponent implements OnInit {
  archivos: Archivo[] = [];
  archivosFiltrados: Archivo[] = [];
  actividades: Actividad[] = [];
  archivoSeleccionado: Archivo | null = null;
  archivoParaAsignar: Archivo | null = null;
  mostrarModalAsignacion = false;
  actividadSeleccionada: number | null = null;
  terminoBusqueda = '';
  filtroTipo = '';

  constructor(
    private archivoService: ArchivoService,
    private actividadService: ActividadesItinerariosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarTodosLosArchivos(); // Cambiado para cargar todos y luego filtrar
    this.cargarActividades();
  }

  cargarTodosLosArchivos(): void {
    this.archivoService.getArchivos().subscribe({
      next: archivos => {
        // Filtrar archivos con actividadId === 0 (sin asignar)
        this.archivos = (archivos ?? []).filter(archivo => archivo.actividadId === 0);
        this.filtrarArchivos();
      },
      error: err => {
        console.error('Error cargando archivos:', err);
        this.archivos = [];
        this.archivosFiltrados = [];
      }
    });
  }

  cargarActividades(): void {
    this.actividadService.getActividades().subscribe({
      next: actividades => {
        this.actividades = actividades ?? [];
      },
      error: err => {
        console.error('Error cargando actividades:', err);
        this.actividades = [];
      }
    });
  }

  filtrarArchivos(): void {
    this.archivosFiltrados = this.archivos.filter(archivo => {
      // Filtrar por término de búsqueda
      const coincideBusqueda = !this.terminoBusqueda || 
        archivo.nombreArchivo.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        (archivo.descripcion && archivo.descripcion.toLowerCase().includes(this.terminoBusqueda.toLowerCase()));
      
      // Filtrar por tipo
      const coincideTipo = !this.filtroTipo || archivo.tipo === this.filtroTipo;
      
      return coincideBusqueda && coincideTipo;
    });
  }

  esImagen(archivo: Archivo): boolean {
    return archivo.tipo === 'imagen' || archivo.tipo === 'foto';
  }

  esVideo(archivo: Archivo): boolean {
    return archivo.tipo === 'video';
  }

  esAudio(archivo: Archivo): boolean {
    return archivo.tipo === 'audio';
  }

  esDocumento(archivo: Archivo): boolean {
    return !this.esImagen(archivo) && !this.esVideo(archivo) && !this.esAudio(archivo);
  }

  abrirModal(archivo: Archivo): void {
    this.archivoSeleccionado = archivo;
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.archivoSeleccionado = null;
    document.body.style.overflow = 'auto';
  }

  getFileUrl(archivo: Archivo): string {
    if (!archivo.rutaArchivo) return '';
    const nombre = archivo.rutaArchivo.split(/[\\/]/).pop() || '';
    if (environment.production) {
      return `/uploads/${nombre}`;
    } else {
      return `http://192.168.1.22:3000/uploads/${nombre}`;
    }
  }

  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  contarArchivosAsignados(): number {
  // Archivos que tienen actividadId distinto de 0 o null
  return this.archivos.filter(a => a.actividadId && a.actividadId !== 0).length;
}

  desasignarDeActividad(id: number): void {
  this.archivoService.asignarArchivoAActividad(id, 0).subscribe({
    next: () => {
      this.cargarTodosLosArchivos();
      alert('Archivo desasignado correctamente.');
    },
    error: err => {
      console.error('Error al desasignar archivo:', err);
      alert('No se pudo desasignar el archivo. Inténtalo de nuevo.');
    }
  });
}

  descargarArchivo(id: number): void {
    this.archivoService.descargarArchivo(id).subscribe(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const archivo = this.archivos.find(a => a.id === id);
      a.href = url;
      a.download = archivo?.nombreArchivo || 'archivo';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    });
  }

  eliminarArchivo(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar permanentemente este archivo?')) {
      this.archivoService.eliminarArchivo(id).subscribe({
        next: () => {
          this.archivos = this.archivos.filter(a => a.id !== id);
          this.filtrarArchivos();
          if (this.archivoSeleccionado && this.archivoSeleccionado.id === id) {
            this.cerrarModal();
          }
        },
        error: err => {
          console.error('Error al eliminar archivo:', err);
          alert('No se pudo eliminar el archivo. Inténtalo de nuevo.');
        }
      });
    }
  }

  asignarAActividad(archivo: Archivo): void {
    this.archivoParaAsignar = archivo;
    this.actividadSeleccionada = null;
    this.mostrarModalAsignacion = true;
    document.body.style.overflow = 'hidden';
  }

  confirmarAsignacion(): void {
    if (this.archivoParaAsignar && this.actividadSeleccionada) {
      this.archivoService.asignarArchivoAActividad(
        this.archivoParaAsignar.id, 
        this.actividadSeleccionada
      ).subscribe({
        next: () => {
          this.cerrarModalAsignacion();
          // Recargar la lista de archivos sin asignar
          this.cargarTodosLosArchivos();
          alert('Archivo asignado correctamente a la actividad.');
        },
        error: err => {
          console.error('Error al asignar archivo:', err);
          alert('No se pudo asignar el archivo a la actividad. Inténtalo de nuevo.');
        }
      });
    } else {
      alert('Por favor, selecciona una actividad para asignar el archivo.');
    }
  }

  cerrarModalAsignacion(): void {
    this.mostrarModalAsignacion = false;
    this.archivoParaAsignar = null;
    this.actividadSeleccionada = null;
    document.body.style.overflow = 'auto';
  }

  volverAConfiguracion(): void {
    this.router.navigate(['/configuracion']);
  }

  contarArchivosSinAsignar(): number {
    return this.archivos.length; // Todos los archivos aquí tienen actividadId = 0
  }

  // Pipe personalizado para formatear bytes
  formatBytes(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}