import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  { path: 'menu', loadComponent: () => import('./components/main-menu/main-menu.component').then(m => m.MainMenuComponent) },
  { path: 'game', loadComponent: () => import('./components/game/game.component').then(m => m.GameComponent) },
  { path: 'buy-aircraft', loadComponent: () => import('./components/buy-aircraft/buy-aircraft.component').then(m => m.BuyAircraftComponent) },
  { path: 'manage-aircraft', loadComponent: () => import('./components/manage-aircraft/manage-aircraft.component').then(m => m.ManageAircraftComponent) },
  { path: 'configure-aircraft/:id', loadComponent: () => import('./components/aircraft-configurator/aircraft-configurator.component').then(m => m.AircraftConfiguratorComponent) },
  { path: 'manage-routes', loadComponent: () => import('./components/manage-routes/manage-routes.component').then(m => m.ManageRoutesComponent) },
  { path: 'scheduler', loadComponent: () => import('./components/scheduler/scheduler.component').then(m => m.SchedulerComponent) },
];
