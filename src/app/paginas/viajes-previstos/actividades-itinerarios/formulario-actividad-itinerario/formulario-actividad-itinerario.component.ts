import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TiposActividadService } from '../../../../servicios/tipos-actividad.service';
import { ActividadesDisponiblesService } from '../../../../servicios/actividades-disponibles.service';
import { ActividadesItinerariosService } from '../../../../servicios/actividades-itinerarios.service';

@Component({
  selector: 'app-formulario-actividad-itinerario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './formulario-actividad-itinerario.component.html',
  styleUrls: ['./formulario-actividad-itinerario.component.scss']
})
export class FormularioActividadItinerarioComponent implements OnInit {
  viajePrevistoId!: number;
  itinerarioId!: number;
  actividadId!: number;

  actividad: any = {
    id: 0,
    viajePrevistoId: 0,
    itinerarioId: 0,
    tipoActividadId: 0,
    actividadDisponibleId: null,
    nombre: '',
    descripcion: '',
    horaInicio: '09:00',
    horaFin: '10:00'
  };

  tiposActividad: any[] = [];
  actividadesDisponibles: any[] = [];
  tipoActividadSeleccionado: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tiposActividadService: TiposActividadService,
    private actividadesDisponiblesService: ActividadesDisponiblesService,
    private actividadesItinerariosService: ActividadesItinerariosService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.viajePrevistoId = +params['viajePrevistoId'];
      this.itinerarioId = +params['itinerarioId'];
      this.actividadId = +params['actividadId'];

      this.actividad.viajePrevistoId = this.viajePrevistoId;
      this.actividad.itinerarioId = this.itinerarioId;

      this.cargarTiposActividad();

      if (this.actividadId) {
        this.cargarActividadExistente();
      }
    });
  }

  cargarTiposActividad(): void {
    this.tiposActividadService.getTiposActividad().subscribe(
      (tipos) => {
        this.tiposActividad = tipos;
      },
      (error) => {
        console.error('Error cargando tipos de actividad:', error);
      }
    );
  }

  cargarActividadesDisponibles(): void {
    if (this.tipoActividadSeleccionado) {
      this.actividad.tipoActividadId = this.tipoActividadSeleccionado;

      this.actividadesDisponiblesService.getActividadesDisponibles(this.tipoActividadSeleccionado).subscribe(
        (actividades) => {
          this.actividadesDisponibles = actividades;
        },
        (error) => {
          console.error('Error cargando actividades disponibles:', error);
        }
      );
    }
  }

  actualizarCamposDesdeActividad(): void {
    const actividadSeleccionada = this.actividadesDisponibles.find(
      a => a.id === this.actividad.actividadDisponibleId
    );

    if (actividadSeleccionada) {
      if (!this.actividad.nombre) {
        this.actividad.nombre = actividadSeleccionada.descripcion.substring(0, 30);
      }
      if (!this.actividad.descripcion) {
        this.actividad.descripcion = actividadSeleccionada.descripcion;
      }
    }
  }

  cargarActividadExistente(): void {
    this.actividadesItinerariosService.getById(this.actividadId).subscribe(
      (actividad) => {
        this.actividad = actividad;
        this.tipoActividadSeleccionado = actividad.tipoActividadId;
        this.cargarActividadesDisponibles();
      },
      (error) => {
        console.error('Error cargando actividad:', error);
      }
    );
  }

  guardarActividad(): void {
    if (this.actividad.id) {
      this.actividadesItinerariosService.update(this.actividad.id, this.actividad).subscribe(
        () => {
          this.router.navigate(['/itinerarios', this.viajePrevistoId]);
        },
        (error) => {
          console.error('Error actualizando actividad:', error);
        }
      );
    } else {
      this.actividadesItinerariosService.create(this.actividad).subscribe(
        () => {
          this.router.navigate(['/itinerarios', this.viajePrevistoId]);
        },
        (error) => {
          console.error('Error creando actividad:', error);
        }
      );
    }
  }

  cancelar(): void {
    this.router.navigate(['/itinerarios', this.viajePrevistoId]);
  }
}
