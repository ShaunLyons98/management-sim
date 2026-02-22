import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-main-menu',
  standalone: true,
  template: `
    <div class="menu-container">
      <div class="menu-bg"></div>
      <div class="menu-content animate-fade-in">
        <div class="logo">
          <div class="logo-icon">✈</div>
          <h1>AirSim</h1>
          <p class="tagline">Airline Management Simulator</p>
        </div>
        <div class="menu-buttons">
          <button class="btn btn-primary menu-btn" (click)="startGame()">
            <span>▶</span> New Game
          </button>
          <button class="btn btn-secondary menu-btn" disabled>
            <span>💾</span> Load Game
          </button>
          <button class="btn btn-secondary menu-btn" disabled>
            <span>⚙</span> Settings
          </button>
        </div>
        <div class="version">v1.0.0</div>
      </div>
    </div>
  `,
  styles: [`
    .menu-container {
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #e3f2fd 0%, #f0f4f8 50%, #e8eaf6 100%);
    }

    .menu-bg {
      position: absolute;
      inset: 0;
      background-image:
        radial-gradient(circle at 20% 50%, rgba(21, 101, 192, 0.08) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(41, 182, 246, 0.1) 0%, transparent 40%),
        radial-gradient(circle at 60% 80%, rgba(21, 101, 192, 0.06) 0%, transparent 40%);
    }

    .menu-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 48px;
    }

    .logo {
      text-align: center;
    }

    .logo-icon {
      font-size: 72px;
      line-height: 1;
      margin-bottom: 12px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(-5deg); }
      50% { transform: translateY(-10px) rotate(5deg); }
    }

    h1 {
      font-size: 56px;
      font-weight: 800;
      color: var(--primary-dark);
      letter-spacing: -2px;
      margin-bottom: 8px;
    }

    .tagline {
      font-size: 18px;
      color: var(--text-secondary);
      font-weight: 400;
      letter-spacing: 0.5px;
    }

    .menu-buttons {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 280px;
    }

    .menu-btn {
      width: 100%;
      padding: 16px 24px;
      font-size: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(21, 101, 192, 0.15);
    }

    .version {
      color: var(--text-secondary);
      font-size: 13px;
    }
  `]
})
export class MainMenuComponent {
  constructor(private router: Router) {}
  startGame() { this.router.navigate(['/game']); }
}
