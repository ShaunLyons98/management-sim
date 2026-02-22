import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import { GameStateService, GameState, Airport, Route, AIRPORTS } from '../../services/game-state.service';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="game-container">
      <!-- Top HUD -->
      <div class="hud-top animate-fade-in">
        <div class="hud-logo" (click)="goToMenu()">✈ AirSim</div>

        <div class="hud-stats">
          <div class="stat-item">
            <span class="stat-label">Cash</span>
            <span class="stat-value money">{{ state?.money | currency:'USD':'symbol':'1.0-0' }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Fleet</span>
            <span class="stat-value">{{ state?.aircraft?.length || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Routes</span>
            <span class="stat-value">{{ state?.routes?.length || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Hubs</span>
            <span class="stat-value">{{ state?.hubs?.length || 0 }}</span>
          </div>
        </div>

        <div class="hud-time">
          <div class="time-display">
            <span class="day">Day {{ state?.day }}</span>
            <span class="clock">{{ formatTime(state?.hour || 0, state?.minute || 0) }}</span>
          </div>
          <div class="time-controls">
            <button class="time-btn" (click)="togglePause()">
              {{ state?.paused ? '▶' : '⏸' }}
            </button>
            <button class="time-btn" [class.active]="state?.speed === 1" (click)="setSpeed(1)">1x</button>
            <button class="time-btn" [class.active]="state?.speed === 2" (click)="setSpeed(2)">2x</button>
            <button class="time-btn" [class.active]="state?.speed === 4" (click)="setSpeed(4)">4x</button>
          </div>
        </div>
      </div>

      <!-- Map -->
      <div #mapContainer class="map-container"></div>

      <!-- Side Panel -->
      <div class="side-panel animate-slide-in">
        <button class="panel-btn" (click)="navigate('/buy-aircraft')">
          <span class="panel-icon">🛒</span>
          <span>Buy Aircraft</span>
        </button>
        <button class="panel-btn" (click)="navigate('/manage-aircraft')">
          <span class="panel-icon">✈️</span>
          <span>Fleet</span>
        </button>
        <button class="panel-btn" (click)="navigate('/manage-routes')">
          <span class="panel-icon">🗺️</span>
          <span>Routes</span>
        </button>
      </div>

      <!-- Selected Airport Panel -->
      <div class="airport-panel animate-fade-in" *ngIf="selectedAirport">
        <div class="airport-panel-header">
          <div>
            <div class="airport-iata">{{ selectedAirport.iata }}</div>
            <div class="airport-name">{{ selectedAirport.name }}</div>
            <div class="airport-city">{{ selectedAirport.city }}, {{ selectedAirport.country }}</div>
          </div>
          <button class="close-btn" (click)="selectedAirport = null">✕</button>
        </div>
        <div class="airport-panel-body">
          <div class="hub-status" *ngIf="isHub(selectedAirport.id)">
            <span class="badge badge-success">✓ Hub Owned</span>
            <span class="chip">{{ getHubSlots(selectedAirport.id) }} slots</span>
          </div>
          <button class="btn btn-primary" style="width:100%;margin-top:8px" (click)="buyHub(selectedAirport)">
            {{ isHub(selectedAirport.id) ? '+ Add Slot ($2M)' : '🏢 Buy Hub ($10M)' }}
          </button>
          <div class="route-count" *ngIf="getRoutesFromAirport(selectedAirport.id).length > 0">
            <span>{{ getRoutesFromAirport(selectedAirport.id).length }} route(s) from here</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .game-container {
      width: 100vw;
      height: 100vh;
      position: relative;
      overflow: hidden;
    }

    .hud-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 2px 12px var(--shadow);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 16px;
      gap: 16px;
    }

    .hud-logo {
      font-size: 20px;
      font-weight: 800;
      color: var(--primary-dark);
      cursor: pointer;
      transition: color 0.2s;
      white-space: nowrap;
    }
    .hud-logo:hover { color: var(--primary-lighter); }

    .hud-stats {
      display: flex;
      gap: 24px;
      flex: 1;
      justify-content: center;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .stat-label {
      font-size: 11px;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
    }
    .stat-value.money { color: var(--success); }

    .hud-time {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .time-display {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .day {
      font-size: 13px;
      color: var(--text-secondary);
    }

    .clock {
      font-size: 18px;
      font-weight: 700;
      color: var(--primary-dark);
      font-variant-numeric: tabular-nums;
    }

    .time-controls {
      display: flex;
      gap: 4px;
    }

    .time-btn {
      padding: 3px 10px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .time-btn:hover, .time-btn.active {
      background: var(--primary-light);
      color: white;
      border-color: var(--primary-light);
    }

    .map-container {
      position: absolute;
      inset: 0;
      z-index: 1;
    }

    .side-panel {
      position: absolute;
      top: 50%;
      right: 16px;
      transform: translateY(-50%);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .panel-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      cursor: pointer;
      box-shadow: 0 2px 8px var(--shadow);
      transition: all 0.2s;
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      min-width: 72px;
    }
    .panel-btn:hover {
      background: var(--primary-light);
      color: white;
      transform: translateX(-2px);
      box-shadow: 0 4px 16px var(--shadow);
    }

    .panel-icon { font-size: 22px; }

    .airport-panel {
      position: absolute;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: rgba(255, 255, 255, 0.97);
      backdrop-filter: blur(10px);
      border-radius: var(--radius);
      box-shadow: 0 4px 20px var(--shadow);
      border: 1px solid var(--border);
      min-width: 300px;
      overflow: hidden;
    }

    .airport-panel-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px;
      background: linear-gradient(135deg, #1565c0, #1976d2);
      color: white;
    }

    .airport-iata {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
    }

    .airport-name {
      font-size: 14px;
      font-weight: 600;
      opacity: 0.9;
    }

    .airport-city {
      font-size: 12px;
      opacity: 0.75;
    }

    .close-btn {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      border-radius: 50%;
      width: 28px;
      height: 28px;
      cursor: pointer;
      font-size: 14px;
    }
    .close-btn:hover { background: rgba(255, 255, 255, 0.35); }

    .airport-panel-body {
      padding: 16px;
    }

    .hub-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .route-count {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-secondary);
    }
  `]
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  state?: GameState;
  selectedAirport: Airport | null = null;

  private map?: L.Map;
  private markerMap = new Map<string, L.CircleMarker>();
  private routeLines = new Map<string, L.Polyline>();
  private sub?: Subscription;

  constructor(
    private gameState: GameStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.sub = this.gameState.state$.subscribe(s => {
      this.state = s;
      this.updateMapOverlays();
    });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 8,
      zoomControl: false,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      subdomains: ['a', 'b', 'c']
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    AIRPORTS.forEach(airport => {
      const marker = L.circleMarker([airport.lat, airport.lng], {
        radius: 6,
        fillColor: '#1976d2',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(this.map!);

      marker.bindTooltip(`${airport.iata} - ${airport.city}`, {
        permanent: false,
        direction: 'top',
        offset: [0, -8]
      });

      marker.on('click', () => {
        this.selectedAirport = airport;
        this.highlightMarker(airport.id);
      });

      this.markerMap.set(airport.id, marker);
    });
  }

  private highlightMarker(airportId: string): void {
    this.markerMap.forEach((marker, id) => {
      const isHub = this.gameState.hasHub(id);
      const isSelected = id === airportId;
      marker.setStyle({
        radius: isSelected ? 10 : (isHub ? 8 : 6),
        fillColor: isSelected ? '#f57c00' : (isHub ? '#2e7d32' : '#1976d2'),
        fillOpacity: isSelected ? 1 : (isHub ? 0.9 : 0.8)
      });
    });
  }

  private updateMapOverlays(): void {
    if (!this.map || !this.state) return;

    this.markerMap.forEach((marker, id) => {
      const isHub = this.gameState.hasHub(id);
      const isSelected = this.selectedAirport?.id === id;
      marker.setStyle({
        radius: isSelected ? 10 : (isHub ? 8 : 6),
        fillColor: isSelected ? '#f57c00' : (isHub ? '#2e7d32' : '#1976d2'),
        fillOpacity: isSelected ? 1 : (isHub ? 0.9 : 0.8),
        weight: isHub ? 3 : 2
      });
    });

    const currentRouteIds = new Set(this.state.routes.map(r => r.id));

    this.routeLines.forEach((line, id) => {
      if (!currentRouteIds.has(id)) {
        line.remove();
        this.routeLines.delete(id);
      }
    });

    this.state.routes.forEach(route => {
      const from = AIRPORTS.find(a => a.id === route.fromAirportId);
      const to = AIRPORTS.find(a => a.id === route.toAirportId);
      if (!from || !to) return;

      if (!this.routeLines.has(route.id)) {
        const line = L.polyline([[from.lat, from.lng], [to.lat, to.lng]], {
          color: route.aircraftId ? '#1565c0' : '#90caf9',
          weight: route.aircraftId ? 2.5 : 1.5,
          opacity: 0.8,
          dashArray: route.aircraftId ? undefined : '5, 8'
        }).addTo(this.map!);

        line.bindTooltip(`${from.iata} → ${to.iata} | ${route.distance} km`, {
          direction: 'top'
        });

        this.routeLines.set(route.id, line);
      } else {
        this.routeLines.get(route.id)!.setStyle({
          color: route.aircraftId ? '#1565c0' : '#90caf9',
          weight: route.aircraftId ? 2.5 : 1.5,
          dashArray: route.aircraftId ? undefined : '5, 8'
        });
      }
    });
  }

  formatTime(h: number, m: number): string {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  togglePause(): void { this.gameState.setPaused(!this.state?.paused); }
  setSpeed(s: number): void { this.gameState.setSpeed(s); }

  isHub(airportId: string): boolean { return this.gameState.hasHub(airportId); }

  getHubSlots(airportId: string): number {
    return this.gameState.getHub(airportId)?.purchasedSlots || 0;
  }

  getRoutesFromAirport(airportId: string): Route[] {
    return this.state?.routes.filter(r => r.fromAirportId === airportId) || [];
  }

  buyHub(airport: Airport): void {
    this.gameState.buyHub(airport.id);
  }

  navigate(path: string): void { this.router.navigate([path]); }
  goToMenu(): void { this.router.navigate(['/menu']); }
}
