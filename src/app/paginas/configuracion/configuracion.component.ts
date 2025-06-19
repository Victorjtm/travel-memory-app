import { Component } from '@angular/core';
import { RouterModule } from '@angular/router'; // 👈 AÑADIR ESTO

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [RouterModule], // 👈 AÑADIR ESTO TAMBIÉN
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent {

}

