import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchivoService } from '../../../../servicios/archivo.service';
import { ViajesPrevistosService } from '../../../../servicios/viajes-previstos.service'; // Para nombres de viajes
import { ItinerarioService } from '../../../../servicios/itinerario.service'; // Para nombres de itinerarios
import { ActividadesItinerariosService } from '../../../../servicios/actividades-itinerarios.service'; // Para nombres de actividades
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { environment } from '../../../../../environments/environment';
import { Archivo } from '../../../../modelos/archivo';
import { Subject, takeUntil } from 'rxjs';
import { firstValueFrom } from 'rxjs';

interface PaginaAlbum {
  imagen: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  fechaOriginal?: string;
  imagenCargada?: boolean;
  esIndice?: boolean;
}

interface ContextoViaje {
  viajeId: number;            // El viaje siempre debe estar presente
  itinerarioId?: number;      // El itinerario puede estar presente, pero es opcional
  actividadId?: number;       // La actividad también es opcional
  
}

/*interface DatosViaje {
  viajeId: number;
  itinerarioId?: number;
  actividadId?: number;
}*/

interface InfoViaje {
  nombre: string;
  fechaInicio?: string;
  fechaFin?: string;
}



@Component({
  selector: 'app-album-libro',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './album-libro.component.html',
  styleUrls: ['./album-libro.component.scss']
})
export class AlbumLibroComponent implements OnInit, OnDestroy {
  paginas: PaginaAlbum[] = [];
  paginaActual = 0;
  estado: 'portada' | 'abierto' | 'contraportada' = 'portada';
  //datosViaje: DatosViaje | null = null;
  infoViaje: InfoViaje | null = null;
  contextoViaje: ContextoViaje | null = null;
  imagenFullscreen = '';
  mostrarFullscreen = false;

  isLoading = false;
  error: string | null = null;
  noImagenesEncontradas = false;

  private destroy$ = new Subject<void>();

  constructor(
  private router: Router,
  private route: ActivatedRoute,
  private archivoService: ArchivoService,
  private viajesPrevistosService: ViajesPrevistosService,
  private itinerarioService: ItinerarioService,
  private actividadesItinerariosService: ActividadesItinerariosService
) {}

  async ngOnInit(): Promise<void> {
  await this.inicializarComponente();
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

  private async inicializarComponente(): Promise<void> {
    const params = this.route.snapshot.paramMap;
    const viajeId = Number(params.get('viajeId'));
    const itinerarioId = params.get('itinerarioId') ? Number(params.get('itinerarioId')) : undefined;
    const actividadId = params.get('actividadId') ? Number(params.get('actividadId')) : undefined;

    if (!this.validarParametros(viajeId, itinerarioId, actividadId)) {
      this.manejarErrorParametros();
      return;
    }

    // Configurar contexto según los parámetros disponibles
    this.contextoViaje = { viajeId, itinerarioId, actividadId };
    //this.datosViaje = { viajeId, itinerarioId, actividadId };
    this.cargarInfoViaje(viajeId);
    this.cargarDatosAlbum();
  }

private async cargarInfoViaje(viajeId: number): Promise<void> {
  try {
    const viaje = await firstValueFrom(
      this.viajesPrevistosService.obtenerViaje(viajeId).pipe(takeUntil(this.destroy$))
    );

    this.infoViaje = {
      nombre: viaje.nombre || `Viaje #${viajeId}`,
      fechaInicio: viaje.fechaInicio || '',
      fechaFin: viaje.fechaFin || ''
    };
    console.log(this.infoViaje);

  } catch (error) {
    console.error('❌ Error al cargar información del viaje:', error);
    this.infoViaje = {
      nombre: `Viaje #${viajeId}`,
      fechaInicio: '',
      fechaFin: ''
    };
  }
}
  

  private validarParametros(viajeId: number, itinerarioId?: number, actividadId?: number): boolean {
    // El viaje es obligatorio
    if (!viajeId || viajeId <= 0 || isNaN(viajeId)) {
      return false;
    }

    // Si hay itinerarioId, debe ser válido
    if (itinerarioId !== undefined && (itinerarioId <= 0 || isNaN(itinerarioId))) {
      return false;
    }

    // Si hay actividadId, debe ser válido Y debe haber itinerarioId
    if (actividadId !== undefined) {
      if (actividadId <= 0 || isNaN(actividadId) || itinerarioId === undefined) {
        return false;
      }
    }

    return true;
  }


  private manejarErrorParametros(): void {
    this.error = 'Parámetros de navegación inválidos';
    setTimeout(() => this.router.navigate(['/viajes-previstos']), 2000);
  }

  async cargarDatosAlbum(): Promise<void> {
  console.log('=== DATOS PARA FILTRO ===');
  console.log('contextoViaje:', this.contextoViaje);
  console.log('viajeId:', this.contextoViaje?.viajeId);
  console.log('itinerarioId:', this.contextoViaje?.itinerarioId);
  console.log('actividadId:', this.contextoViaje?.actividadId);
  console.log('========================');

  this.isLoading = true;
  this.error = null;
  this.noImagenesEncontradas = false;

  try {
    if (!this.archivoService) throw new Error('ArchivoService no disponible');

    let archivos: Archivo[] = [];

    // Cargar archivos según el contexto disponible
    if (this.contextoViaje?.actividadId) {
      console.log('🎯 Llamando getArchivosPorActividad con:', this.contextoViaje.actividadId);
      archivos = await firstValueFrom(
        this.archivoService
          .getArchivosPorActividad(this.contextoViaje.actividadId)
          .pipe(takeUntil(this.destroy$))
      );
    } else {
      console.log('🎯 Llamando getArchivosPorViaje con:', this.contextoViaje!.viajeId);
      archivos = await firstValueFrom(
        this.archivoService
          .getArchivosPorViaje(this.contextoViaje!.viajeId)
          .pipe(takeUntil(this.destroy$))
      );
    }

    console.log('📁 Archivos recibidos:', archivos);
    console.log('📊 Total archivos:', archivos?.length || 0);

    if (!archivos || archivos.length === 0) {
      this.noImagenesEncontradas = true;
      return;
    }

    await this.procesarArchivos(archivos);
  } catch (error) {
    console.error('❌ Error:', error);
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

    const paginasNormales: PaginaAlbum[] = archivosImagen.map(archivo => ({
      imagen: this.getFileUrl(archivo),
      titulo: archivo.descripcion || archivo.nombreArchivo || 'Sin título',
      descripcion: archivo.descripcion || '',
      fecha: archivo.fechaCreacion || '',
      fechaOriginal: archivo.fechaCreacion || '',
      imagenCargada: false
    }));

    const paginaIndice: PaginaAlbum = {
      imagen: '',
      titulo: 'Índice del álbum',
      descripcion: '',
      fecha: '',
      esIndice: true
    };

    this.paginas = [paginaIndice, ...paginasNormales];

    await this.precargarImagenes();
  }

  private manejarErrorCarga(error: any): void {
    if (error?.status === 404) {
      this.error = 'No se encontraron archivos para este viaje';
    } else if (error?.status === 0) {
      this.error = 'Error de conexión. Verifica tu conexión a internet';
    } else {
      this.error = 'Error al cargar el álbum. Inténtalo de nuevo';
    }
  }

  private async precargarImagenes(): Promise<void> {
    const promesasCarga = this.paginas.map((pagina, index) =>
      pagina.imagen ? this.precargarImagen(pagina.imagen, index) : Promise.resolve()
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

  // Navegación
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
    } else if (this.contextoViaje) {
      // Navegación inteligente según el contexto
      if (this.contextoViaje.actividadId) {
        // Volver a la actividad específica
        this.router.navigate(['/viajes-previstos', this.contextoViaje.viajeId, 'itinerario', this.contextoViaje.itinerarioId, 'actividad', this.contextoViaje.actividadId]);
      } else if (this.contextoViaje.itinerarioId) {
        // Volver al itinerario específico
        this.router.navigate(['/viajes-previstos', this.contextoViaje.viajeId, 'itinerario', this.contextoViaje.itinerarioId]);
      } else {
        // Volver al viaje
        this.router.navigate(['/viajes-previstos', this.contextoViaje.viajeId]);
      }
    } else {
      this.router.navigate(['/viajes-previstos']);
    }
  }

  // Pantalla completa
  abrirFullscreen(imagenUrl: string): void {
    this.imagenFullscreen = imagenUrl;
    this.mostrarFullscreen = true;
    document.body.style.overflow = 'hidden';
  }

  cerrarFullscreen(): void {
    this.mostrarFullscreen = false;
    document.body.style.overflow = '';
  }

  

  // Getters
  get hayPaginaAnterior(): boolean {
    return this.paginaActual > 0;
  }

  get hayPaginaSiguiente(): boolean {
    return this.paginaActual < this.paginas.length - 1;
  }

  get paginaActualData(): PaginaAlbum | null {
    return this.paginas[this.paginaActual] || null;
  }

  get numeroPaginaDisplay(): string {
    return `${this.paginaActual + 1} / ${this.paginas.length}`;
  }

  // Métodos para el HTML
  getTituloContextual(): string {
    if (!this.contextoViaje) return 'Álbum de Fotos';

    if (this.contextoViaje.actividadId) {
      return `Álbum de la Actividad #${this.contextoViaje.actividadId}`;
    } else if (this.contextoViaje.itinerarioId) {
      return `Álbum del Itinerario #${this.contextoViaje.itinerarioId}`;
    } else {
      return `Álbum del Viaje #${this.contextoViaje.viajeId}`;
    }
  }

  getDescripcionContextual(): string {
    const totalImagenes = this.paginas.length > 0 ? this.paginas.length - 1 : 0;
    
    if (!this.contextoViaje) return `${totalImagenes} imágenes`;

    if (this.contextoViaje.actividadId) {
      return `${totalImagenes} imágenes de la actividad`;
    } else if (this.contextoViaje.itinerarioId) {
      return `${totalImagenes} imágenes del itinerario`;
    } else {
      return `${totalImagenes} imágenes del viaje`;
    }
  }

  getNivelContexto(): string {
    if (!this.contextoViaje) return 'Desconocido';

    if (this.contextoViaje.actividadId) {
      return 'Actividad';
    } else if (this.contextoViaje.itinerarioId) {
      return 'Itinerario';
    } else {
      return 'Viaje';
    }
  }

  // Método para navegación directa a una página
  irAPagina(index: number): void {
    if (index >= 0 && index < this.paginas.length) {
      this.paginaActual = index;
    }
  }

  // Métodos para manejar eventos de carga de imágenes
  onImageLoad(index: number): void {
    if (this.paginas[index]) {
      this.paginas[index].imagenCargada = true;
    }
  }

  onImageError(index: number): void {
    if (this.paginas[index]) {
      this.paginas[index].imagenCargada = false;
      // Opcionalmente, establecer una imagen por defecto
      this.paginas[index].imagen = '/assets/images/no-image.jpg';
    }
  }

  // Navegación en modo pantalla completa
  navegarEnFullscreen(direccion: number): void {
    const nuevaPagina = this.paginaActual + direccion;
    if (nuevaPagina >= 0 && nuevaPagina < this.paginas.length) {
      this.paginaActual = nuevaPagina;
      
      // Solo cambiar la imagen si no es la página índice
      if (!this.paginas[this.paginaActual].esIndice) {
        this.imagenFullscreen = this.paginas[this.paginaActual].imagen;
      } else {
        // Si llegamos al índice, cerrar pantalla completa
        this.cerrarFullscreen();
      }
    }
  }
}