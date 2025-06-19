import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ItinerarioService } from '../../../../servicios/itinerario.service';
import { Itinerario } from '../../../../modelos/viaje-previsto.model';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-formulario-itinerario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './formulario-itinerario.component.html',
  styleUrls: ['./formulario-itinerario.component.scss']
})
export class FormularioItinerarioComponent implements OnInit {

  viajePrevistoId!: number;

  nuevoItinerario: Itinerario = {
    id: 0,
    viajePrevistoId: 0,
    fechaInicio: '',
    fechaFin: '',
    duracionDias: 0,
    destinosPorDia: '',
    descripcionGeneral: '',
    horaInicio: '',
    horaFin: '',
    climaGeneral: '',
    tipoDeViaje: 'costa'
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private itinerarioService: ItinerarioService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('viajePrevistoId');
      if (idParam) {
        this.viajePrevistoId = +idParam;
        this.nuevoItinerario.viajePrevistoId = this.viajePrevistoId;
      }
    });
  }

  agregarItinerario(): void {
    const itinerarioAEnviar = { ...this.nuevoItinerario, viajePrevistoId: this.viajePrevistoId };
    this.itinerarioService.crearItinerario(itinerarioAEnviar).subscribe(() => {
      console.log('✅ Itinerario agregado con éxito');
      this.router.navigate(['/itinerarios', this.viajePrevistoId]);
    });
  }
}
