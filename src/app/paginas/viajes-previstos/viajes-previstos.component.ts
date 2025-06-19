import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router'; // IMPORTANTE: RouterModule aquí
import { ViajesPrevistosService } from '../../servicios/viajes-previstos.service';
import { Observable } from 'rxjs';
import { HttpClientModule } from '@angular/common/http'; // 👈 IMPORTANTE

@Component({
  selector: 'app-viajes-previstos',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,  // 👈 AÑADIDO AQUÍ
    RouterModule       // IMPORTANTE: Asegúrate de incluir RouterModule aquí
  ],
  templateUrl: './viajes-previstos.component.html',
  styleUrls: ['./viajes-previstos.component.scss']
})
export class ViajesPrevistosComponent implements OnInit {
  viajesPrevistos: any[] = [];

  constructor(
    private viajesPrevistosService: ViajesPrevistosService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.viajesPrevistosService.obtenerViajes().subscribe((viajes) => {
      this.viajesPrevistos = viajes;
    });
  }

  eliminarViaje(id: number) {
    this.viajesPrevistosService.eliminarViaje(id).subscribe(() => {
      this.viajesPrevistos = this.viajesPrevistos.filter((viaje) => viaje.id !== id);
    });
  }

  actualizarViaje(id: number, viaje: any) {
    this.viajesPrevistosService.actualizarViaje(id, viaje).subscribe(() => {
      const index = this.viajesPrevistos.findIndex((v) => v.id === id);
      if (index !== -1) {
        this.viajesPrevistos[index] = viaje;
      }
    });
  }

  agregarViaje(viaje: any) {
    this.viajesPrevistosService.crearViaje(viaje).subscribe((nuevoViaje) => {
      this.viajesPrevistos.push(nuevoViaje);
    });
  }

  irAlFormulario() {
    this.router.navigate(['/formulario-viaje-previsto']);
  }

  irAEditarViaje(id: number) {
    this.router.navigate(['/formulario-viaje-previsto', id]);
  }
}
