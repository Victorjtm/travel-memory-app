import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormularioArchivosActividadesItinerarioComponent } from './formulario-archivos-actividades-itinerario.component';

describe('FormularioArchivosActividadesItinerarioComponent', () => {
  let component: FormularioArchivosActividadesItinerarioComponent;
  let fixture: ComponentFixture<FormularioArchivosActividadesItinerarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormularioArchivosActividadesItinerarioComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormularioArchivosActividadesItinerarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
