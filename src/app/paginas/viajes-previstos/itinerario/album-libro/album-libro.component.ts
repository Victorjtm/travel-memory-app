import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchivoService } from '../../../../servicios/archivo.service';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { environment } from '../../../../../environments/environment';
import { Archivo } from '../../../../modelos/archivo';
import { Subject, takeUntil } from 'rxjs';

interface PaginaAlbum {
  imagen: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  fechaOriginal?: string;
  imagenCargada?: boolean;
}

interface DatosViaje {
  actividadId: number;
  viajeId: number;
  itinerarioId: number;
}

@Component({
  selector: 'app-album-libro',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './album-libro.component.html',
  styleUrls: ['./album-libro.component.scss']
})
export class AlbumLibroComponent implements OnInit, OnDestroy {
  // Propiedades principales
  paginas: PaginaAlbum[] = [];
  paginaActual = 0;
  estado: 'portada' | 'abierto' | 'contraportada' = 'portada';
  datosViaje: DatosViaje | null = null;
  imagenFullscreen = '';
  mostrarFullscreen = false;

  // Estados
  isLoading = false;
  error: string | null = null;
  noImagenesEncontradas = false;

  private destroy$ = new Subject<void>();
  private wasFullscreen = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private archivoService: ArchivoService
  ) {}

  ngOnInit(): void {
    this.inicializarComponente();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.mostrarFullscreen) {
      this.cerrarFullscreen();
    }
  }

  @HostListener('document:touchmove', ['$event'])
  handleTouchMove(event: TouchEvent) {
    if (this.mostrarFullscreen) {
      event.preventDefault();
    }
  }

  private inicializarComponente(): void {
    const params = this.route.snapshot.paramMap;
    const actividadId = Number(params.get('actividadId'));
    const itinerarioId = Number(params.get('itinerarioId'));
    const viajeId = Number(params.get('viajeId'));

    if (!this.validarParametros(actividadId, itinerarioId, viajeId)) {
      this.manejarErrorParametros();
      return;
    }

    this.datosViaje = { actividadId, itinerarioId, viajeId };
    this.cargarDatosAlbum();
  }

  private validarParametros(actividadId: number, itinerarioId: number, viajeId: number): boolean {
    return [actividadId, itinerarioId, viajeId].every(
      param => param && param !== 0 && !isNaN(param)
    );
  }

  private manejarErrorParametros(): void {
    this.error = 'Parámetros de navegación inválidos';
    setTimeout(() => this.router.navigate(['/viajes-previstos']), 2000);
  }

  async cargarDatosAlbum(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.noImagenesEncontradas = false;

    try {
      if (!this.archivoService) throw new Error('ArchivoService no disponible');
      
      const archivos = await this.archivoService
        .getArchivosPorActividad(this.datosViaje!.actividadId)
        .pipe(takeUntil(this.destroy$))
        .toPromise();

      if (!archivos || archivos.length === 0) {
        this.noImagenesEncontradas = true;
        return;
      }

      await this.procesarArchivos(archivos);
    } catch (error) {
      this.manejarErrorCarga(error);
    } finally {
      this.isLoading = false;
    }
  }

  private async procesarArchivos(archivos: Archivo[]): Promise<void> {
    const archivosImagen = archivos.filter(archivo => 
      archivo.tipo === 'foto' || archivo.tipo === 'imagen'
    );

    if (archivosImagen.length === 0) {
      this.noImagenesEncontradas = true;
      return;
    }

    this.paginas = archivosImagen.map(archivo => ({
      imagen: this.getFileUrl(archivo),
      titulo: archivo.descripcion || archivo.nombreArchivo || 'Sin título',
      descripcion: archivo.descripcion || '',
      fecha: archivo.fechaCreacion || '',
      fechaOriginal: archivo.fechaCreacion || '',
      imagenCargada: false
    }));

    await this.precargarImagenes();
  }

  private manejarErrorCarga(error: any): void {
    if (error?.status === 404) {
      this.error = 'No se encontraron archivos para esta actividad';
    } else if (error?.status === 0) {
      this.error = 'Error de conexión. Verifica tu conexión a internet';
    } else {
      this.error = 'Error al cargar el álbum. Inténtalo de nuevo';
    }
  }

  private async precargarImagenes(): Promise<void> {
    const promesasCarga = this.paginas.map((pagina, index) => 
      this.precargarImagen(pagina.imagen, index)
    );
    await Promise.allSettled(promesasCarga);
  }

  private precargarImagen(url: string, index: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (this.paginas[index]) this.paginas[index].imagenCargada = true;
        resolve();
      };
      img.onerror = () => reject(`Error al cargar imagen: ${url}`);
      img.src = url;
    });
  }

  getFileUrl(archivo: Archivo): string {
    if (!archivo?.rutaArchivo) return '/assets/images/no-image.jpg';
    if (archivo.rutaArchivo.startsWith('http')) return archivo.rutaArchivo;
    
    const nombreArchivo = archivo.rutaArchivo.split(/[\\/]/).pop();
    return `${environment.apiUrl}/uploads/${nombreArchivo}`;
  }

  // Métodos de navegación
  abrirLibro(): void {
    if (this.paginas.length === 0) return;
    this.estado = 'abierto';
  }

  cambiarPagina(direccion: number): void {
    const nuevaPagina = this.paginaActual + direccion;
    if (nuevaPagina >= 0 && nuevaPagina < this.paginas.length) {
      this.paginaActual = nuevaPagina;
    }
  }

  cerrarLibro(): void {
    this.estado = 'portada';
    this.paginaActual = 0;
  }

  reintentar(): void {
    this.error = null;
    this.noImagenesEncontradas = false;
    this.cargarDatosAlbum();
  }

  volver(): void {
    if (this.estado === 'abierto') {
      this.cerrarLibro();
    } else if (this.datosViaje) {
      this.router.navigate([
        '/viajes-previstos',
        this.datosViaje.viajeId,
        'itinerarios',
        this.datosViaje.itinerarioId,
        'actividades',
        this.datosViaje.actividadId
      ]);
    } else {
      this.router.navigate(['/viajes-previstos']);
    }
  }

  // Métodos para pantalla completa
  abrirFullscreen(imagenUrl: string): void {
    this.imagenFullscreen = imagenUrl;
    this.mostrarFullscreen = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarFullscreen(): void {
    this.mostrarFullscreen = false;
    document.body.style.overflow = '';
  }

  // Getters para el template
  get hayPaginaAnterior(): boolean { return this.paginaActual > 0; }
  get hayPaginaSiguiente(): boolean { return this.paginaActual < this.paginas.length - 1; }
  get paginaActualData(): PaginaAlbum | null { return this.paginas[this.paginaActual] || null; }
  get numeroPaginaDisplay(): string { return `${this.paginaActual + 1} / ${this.paginas.length}`; }
}