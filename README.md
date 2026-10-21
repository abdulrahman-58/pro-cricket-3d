# Pro Cricket 3D Championship (Mobile)

> **Next-Gen 3D Mobile Cricket Simulation** with physics-driven ball flight, 360-degree shot timing matrices, broadcast TV HUD overlays, and cloud progression.

---

## 🏏 Core Features & Architecture

### 1. Aerodynamic Ball Physics (`ProCricket3D.Physics`)
* **Real-time Trajectory Integration**: Accounts for gravity, atmospheric air drag, and **Magnus Effect** for realistic conventional and reverse swing.
* **Pitch Surface Restitution**: Dynamic bounce and seam grip variations across Green, Dusty, Hard/Flat, and Damp pitches.

### 2. 360° Batting Matrix (`ProCricket3D.Batting`)
* **Radial Shot Selector**: Directional mapping supporting straight drives, cover drives, cuts, pulls, sweeps, scoops, and upper cuts.
* **Dynamic Timing Window**: Real-time evaluation of sweet spot impact ($t_{\text{swing}} - t_{\text{ball}}$) distinguishing between *Missed, Early, Good, Perfect, Late, Inside Edge, Outside Edge*.
* **Footwork Optimization**: Front-foot vs. Back-foot posture bonuses.

### 3. Precision Bowling Engine (`ProCricket3D.Bowling`)
* **Styles**: Right-Arm Fast, Left-Arm Fast, Off-Spin, Leg-Spin.
* **Delivery Variations**: Outswinger, Inswinger, Yorker, Bouncer, Slower Ball, Googly, Doosra, Top-spinner.
* **Release Accuracy Meter**: Oscillating meter determining line/length deviation and wide/no-ball chances.

### 4. Official ICC Laws & State Machine (`ProCricket3D.Core`)
* Full rules enforcement: Bowled, Caught, LBW (Hawk-Eye pitch/impact/hitting checks), Run Out, Stumped, Hit Wicket.
* Free Hit rules on front-foot No-Balls.
* Dynamic strike rotation and Over completion handling.

### 5. Broadcast TV Presentation (`ProCricket3D.UI`)
* International sports broadcast style score bugs (Star Sports / Sky Sports aesthetic).
* Live Ball Speed Radar (KM/H & MPH).
* Ultra-Edge (Snickometer) spike visualizer for catches and LBW reviews.

### 6. Cloud LiveOps & Leaderboards (`ProCricket3D.Backend`)
* Integrated **Supabase** backend for player profiles, card collections, and real-time global leaderboards.

---

## 🛠 Project Structure

```
Assets/
└── _Project/
    ├── Scripts/
    │   ├── Physics/       # BallAerodynamics.cs
    │   ├── Batting/       # BattingSystem.cs
    │   ├── Bowling/       # BowlingSystem.cs
    │   ├── Core/          # CricketRuleEngine.cs, MatchScoreboardManager.cs
    │   ├── UI/            # BroadcastHUDController.cs
    │   └── Backend/       # SupabaseGameManager.cs
    ├── Prefabs/
    ├── Materials/
    ├── Scenes/
    └── Shaders/
Documentation/
└── supabase_schema.sql
```

---

## 🚀 Getting Started

1. Open **Unity Hub** and select **Add project from disk**.
2. Select this directory (`C:\own creation\app_dev`).
3. Set Target Platform to **Android** or **iOS**.
4. Open the starter scene in `Assets/_Project/Scenes`.
