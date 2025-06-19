import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterModule], // 👈 importante
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.scss']
})
export class InicioComponent {
  mensajeBienvenida = "¡Bienvenido a la aplicación de recuerdos de viajes!";
}

