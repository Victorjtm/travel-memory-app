import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { Actividad } from '../../../modelos/actividad.model';
import { ActividadesItinerariosService } from '../../../servicios/actividades-itinerarios.service';

@Component({
  selector: 'app-actividades-itinerarios',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './actividades-itinerarios.component.html',
  styleUrls: ['./actividades-itinerarios.component.scss']
})
export class ActividadesItinerariosComponent implements OnInit {

  actividades: Actividad[] = [];
  viajePrevistoId!: number;
  itinerarioId!: number;

  actividadActualizada: Actividad = {
    id: 0,
    viajePrevistoId: 0,
    itinerarioId: 0,
    tipoActividadId: 0,
    actividadDisponibleId: undefined,
    nombre: '',
    descripcion: '',
    horaInicio: '',
    horaFin: ''
  };

  constructor(
    private actividadService: ActividadesItinerariosService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const viajeId = params.get('viajePrevistoId');
      const itinId = params.get('itinerarioId');
      if (viajeId && itinId) {
        this.viajePrevistoId = +viajeId;
        this.itinerarioId = +itinId;
        this.cargarActividades();
        this.resetearFormulario();
      }
    });
  }

  cargarActividades(): void {
    if (!this.viajePrevistoId || !this.itinerarioId) return;
  
    this.actividadService.getByViajeYItinerario(this.viajePrevistoId, this.itinerarioId)
      .subscribe({
        next: actividades => {
          console.log('Actividades cargadas:', actividades);
          this.actividades = actividades;
          console.log('Número de actividades:', this.actividades.length);
        },
        error: err => console.error('Error cargando actividades:', err)
      });
  }

  agregarActividad(): void {
    if (!this.viajePrevistoId || !this.itinerarioId) return;

    const actividadEnviar: Actividad = {
      ...this.actividadActualizada,
      viajePrevistoId: this.viajePrevistoId,
      itinerarioId: this.itinerarioId
    };

    this.actividadService.create(actividadEnviar)
      .subscribe({
        next: nueva => {
          this.actividades.push(nueva);
          this.resetearFormulario();
        },
        error: err => console.error('Error creando actividad:', err)
      });
  }

  eliminarActividad(id: number): void {
    this.actividadService.delete(id)
      .subscribe({
        next: () => {
          this.actividades = this.actividades.filter(a => a.id !== id);
        },
        error: err => console.error('Error eliminando actividad:', err)
      });
  }

  actualizarActividad(actividad: Actividad): void {
    this.actividadActualizada = { ...actividad };
    console.log('Actividad lista para actualizar:', this.actividadActualizada);
  }

  guardarActualizacion(): void {
    this.actividadService.update(this.actividadActualizada.id, this.actividadActualizada)
      .subscribe({
        next: () => {
          console.log('Actividad actualizada correctamente');
          this.cargarActividades();
          this.resetearFormulario();
        },
        error: err => console.error('Error actualizando actividad:', err)
      });
  }

  cancelarActualizacion(): void {
    this.resetearFormulario();
  }

  volverAItinerarios(): void {
    this.router.navigate(['/viajes-previstos', this.viajePrevistoId, 'itinerarios']);
  }

  verArchivos(actividadId: number, event: Event): void {
    console.log('CLICK detectado - ID:', actividadId);
    
    if (!actividadId) return;
  
    event.stopPropagation();
    
    const { viajePrevistoId, itinerarioId } = this.route.snapshot.params;
    
    const url = [
      'viajes-previstos',
      viajePrevistoId,
      'itinerarios',
      itinerarioId,
      'actividades',
      actividadId,
      'archivos'
    ];

    console.log('Navegando a URL:', url.join('/'));

    this.router.navigate(url).catch(err => {
      console.error('Error en navegación:', err);
    });
  }

  consoleLogTest(id: number): void {
    console.log('CLICK detectado - ID:', id);
  }

  private resetearFormulario(): void {
    this.actividadActualizada = {
      id: 0,
      viajePrevistoId: this.viajePrevistoId,
      itinerarioId: this.itinerarioId,
      tipoActividadId: 0,
      actividadDisponibleId: undefined,
      nombre: '',
      descripcion: '',
      horaInicio: '',
      horaFin: ''
    };
  }
}
