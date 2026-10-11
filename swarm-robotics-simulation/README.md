# Swarm Robotics Simulation

An interactive university-level research presentation app for exploring swarm robotics and collective behavior. Run a 2D swarm, guide its leader, build obstacle courses, map text or images to a drone light show, and inspect the formation in an orbitable Three.js viewer.

## Features

- Swarm Simulation with five formations: Circular, V, Y, Scatter, and Decoy Shield.
- Transfer Leadership to a random drone or a selected drone number.
- Obstacle Course editor with waypoints, route planning, and mission telemetry.
- 3D Text Display for words rendered by a fixed drone formation.
- Image mode for mapping uploaded or built-in images to drone lights.
- 3D Viewer with Front, Angled, Side, and Top views, orbit controls, playback, telemetry, and quality settings.

## Screenshots

Screenshot placeholders for the Swarm Simulation and the 3D Viewer displaying `HI` will be added here.

## Requirements and setup

Install Node.js 20 or newer. From the repository root:

```sh
npm install
npm run dev
```

Vite prints the local address, normally `http://localhost:5173`.

## Build and preview

```sh
npm run build
npm run typecheck
npm run preview
```

For environments where the development preview cannot reach Vite, `npm run start` builds the app and serves the production bundle on `0.0.0.0:4173`.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `T` | Transfer leadership in Swarm Simulation |
| `H` | Toggle reveal effect |
| `F` | Front view in Text Display or 3D Viewer |
| `A` | Angled view in Text Display or 3D Viewer |
| `T` | Top view in 2D Text Display; Top view in 3D Viewer |
| `S` | Side view in 3D Viewer; Start tool in Obstacle Course |
| `O` | Toggle auto-orbit in the 3D Viewer |
| `Space` | Pause or resume the course mission or 3D Viewer playback |
| `Escape` | Return from the 3D Viewer to the 2D display |
| `Enter` | Start the obstacle course mission |
| `R` | Reset the obstacle course mission |
| `C`, `W`, `G`, `N`, `E` | Circle, wall, goal, waypoint, or erase tool in Obstacle Course |

Keyboard shortcuts are ignored while typing in form controls.

## Project structure

```text
swarm-robotics-simulation/
├── .github/workflows/deploy.yml
├── docs/
├── src/
│   ├── components/       # Controls, 2D display, and 3D viewer
│   ├── engine/           # Swarm, image-grid, and mission logic
│   ├── styles/           # Shared design tokens
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Boid rules

The simulation combines local steering behaviors. **Attraction** guides each agent toward its assigned formation position around the leader. **Separation** steers agents away from nearby neighbors to prevent collisions and clumping. **Avoidance** steers them around obstacles. The app combines these forces, limits speed, and updates the agents each frame; coordinated shapes emerge without a central controller directing every drone.

## How the light show works

Text and image sources are converted into a grid of lit and unlit drone positions. In the 3D viewer, each grid cell becomes a drone in a fixed formation; lit positions glow while the sequence reveals the pattern. Depth layers add dimension, and orbit controls let you inspect the formation from different angles. The 2D Text Display provides the corresponding top-down view.

## GitHub Pages deployment

The workflow builds and deploys `dist` to GitHub Pages when changes are pushed to `main`. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.

## Troubleshooting

- **Preview unreachable:** run `npm run start` and open `http://localhost:4173`, or run `npm run dev` and open `http://localhost:5173`.
- **Port already in use:** stop the other development server using the configured port, then restart the app.
- **3D viewer unavailable:** the viewer reports WebGL initialization errors in the viewer. Enable hardware acceleration and use a browser with WebGL support; the 2D display remains available.
- **Dependencies fail to install:** use Node.js 20 or newer and run `npm install` again from this folder.

## License

MIT. See [LICENSE](LICENSE); replace the `[Your Name]` placeholder with your name before publishing.
