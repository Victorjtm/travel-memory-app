import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ArchivoService } from '../../servicios/archivo.service';
import { Archivo } from '../../modelos/archivo';
import { HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
// ...existing code...
// ...existing code...

@Component({
  selector: 'app-archivos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './archivos-actividades-itinerario.component.html',
  styleUrls: ['./archivos-actividades-itinerario.component.scss']
})
export class ArchivosComponent implements OnInit {
  archivos: Archivo[] = [];
  actividadId = 0;
  viajePrevistoId = 0;
  itinerarioId = 0;
  archivoSeleccionado: Archivo | null = null;

  constructor(
    private archivoService: ArchivoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;

    this.viajePrevistoId = Number(params.get('viajePrevistoId')) || 0;
    this.itinerarioId = Number(params.get('itinerarioId')) || 0;

    const actividadIdParam = params.get('actividadId');
    if (actividadIdParam) {
      this.actividadId = Number(actividadIdParam);
      this.cargarArchivos();
    } else {
      console.error('actividadId no proporcionado en la ruta');
      this.archivos = [];
    }
  }

  cargarArchivos(): void {
    this.archivoService.getArchivosPorActividad(this.actividadId).subscribe({
      next: archivos => {
        this.archivos = archivos ?? [];
      },
      error: err => {
        console.error('Error cargando archivos:', err);
        this.archivos = [];
      }
    });
  }

  abrirModal(archivo: Archivo): void {
    this.archivoSeleccionado = archivo;
    // Bloquear el scroll del body cuando el modal está abierto
    document.body.style.overflow = 'hidden';
  }

  cerrarModal(): void {
    this.archivoSeleccionado = null;
    // Restaurar el scroll del body
    document.body.style.overflow = 'auto';
  }

  editarArchivo(archivo: Archivo): void {
    this.router.navigate([
      '/viajes-previstos',
      this.viajePrevistoId,
      'itinerarios',
      this.itinerarioId,
      'actividades',
      this.actividadId,
      'archivos',
      'editar',
      archivo.id
    ]);
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

  formatDate(dateString?: string): string {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleString();
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
    if (confirm('¿Estás seguro de que quieres eliminar este archivo?')) {
      this.archivoService.eliminarArchivo(id).subscribe({
        next: () => {
          this.archivos = this.archivos.filter(a => a.id !== id);
          // Si el archivo eliminado era el que estaba en el modal, cerrarlo
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

  volverAItinerario(): void {
    this.router.navigate([
      '/viajes-previstos',
      this.viajePrevistoId,
      'itinerarios',
      this.itinerarioId,
      'actividades'
    ]);
  }
}