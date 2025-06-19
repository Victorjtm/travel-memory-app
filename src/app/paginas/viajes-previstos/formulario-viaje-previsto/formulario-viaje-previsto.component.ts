import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViajesPrevistosService } from '../../../servicios/viajes-previstos.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-formulario-viaje-previsto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './formulario-viaje-previsto.component.html',
  styleUrls: ['./formulario-viaje-previsto.component.scss']
})
export class FormularioViajePrevistoComponent implements OnInit, OnDestroy {
  viaje = { destino: '', fecha: '', descripcion: '' };
  index: number | null = null;
  viajeSubscription!: Subscription;  // Usamos "!" para indicar que se inicializará más tarde

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private viajesPrevistosService: ViajesPrevistosService
  ) {}

  ngOnInit(): void {
    const indexParam = this.route.snapshot.paramMap.get('index');
    if (indexParam !== null) {
      this.index = +indexParam;
      this.viajeSubscription = this.viajesPrevistosService.obtenerViaje(this.index).subscribe(
        (viaje) => {
          if (viaje) {
            this.viaje = { ...viaje };
          }
        },
        (error) => {
          console.error('Error al obtener el viaje', error);
        }
      );
    }
  }

  ngOnDestroy(): void {
    // Verificamos si hay una suscripción activa y la cancelamos
    if (this.viajeSubscription) {
      this.viajeSubscription.unsubscribe();
    }
  }

  guardar(): void {
    if (this.index !== null) {
      this.viajesPrevistosService.actualizarViaje(this.index, this.viaje).subscribe(
        () => {
          this.router.navigate(['/viajes-previstos']);
        },
        (error) => {
          console.error('Error al actualizar el viaje', error);
        }
      );
    } else {
      this.viajesPrevistosService.crearViaje(this.viaje).subscribe(
        () => {
          this.router.navigate(['/viajes-previstos']);
        },
        (error) => {
          console.error('Error al crear el viaje', error);
        }
      );
    }
  }
}
