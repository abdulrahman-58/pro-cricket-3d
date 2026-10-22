import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { StadiumScene } from './graphics/stadiumScene.js';
import { PlayerRigs } from './graphics/playerRigs.js';
import { BallPhysicsEngine, DeliveryTypes } from './physics/ballPhysics.js';
import { SoundEngine } from './audio/soundEngine.js';
import { MatchEngine } from './cricket/matchEngine.js';

class ProCricketGame {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.shotAngleDeg = 0; // 0 = straight down ground, 45 = cover drive, 90 = cut, 270 = pull
    this.isLofted = false;
    this.isBallInPlay = false;

    this.initThree();
    this.initSystems();
    this.initControls();
    this.initUI();

    window.addEventListener('resize', () => this.onWindowResize());
    this.animate(0);
  }

  initThree() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060c18); // Night sky
    this.scene.fog = new THREE.FogExp2(0x060c18, 0.008);

    // Camera: Broadcast batsman shoulder view looking down 22 yards
    this.camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 300);
    this.defaultCamPos = new THREE.Vector3(0, 3.2, 14.8);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(0, 1.4, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
  }

  initSystems() {
    this.stadium = new StadiumScene(this.scene);
    this.players = new PlayerRigs(this.scene);
    this.ballPhysics = new BallPhysicsEngine(this.scene);
    this.sound = new SoundEngine();
    this.match = new MatchEngine();

    // Stumps collision callback
    this.ballPhysics.onPitchBounce = (pos) => {
      // Check if it bounced on pitch
    };
  }

  initControls() {
    // 1. Bowl Ball Trigger
    const bowlBtn = document.getElementById('bowl-trigger-btn');
    bowlBtn.addEventListener('click', () => this.deliverNextBall());

    // 2. Lofted / Grounded Switch
    const loftBtn = document.getElementById('loft-toggle-btn');
    loftBtn.addEventListener('click', () => {
      this.isLofted = !this.isLofted;
      loftBtn.classList.toggle('active', this.isLofted);
      loftBtn.textContent = this.isLofted ? 'LOFTED [6]' : 'GROUNDED [4]';
    });

    // 3. Batting Hit Trigger
    const hitBtn = document.getElementById('hit-shot-btn');
    const executeHit = (e) => {
      e.preventDefault();
      this.handleBatSwing();
    };
    hitBtn.addEventListener('mousedown', executeHit);
    hitBtn.addEventListener('touchstart', executeHit);

    // Keyboard shortcuts (Space = Swing, B = Bowl, L = Loft, Arrows = Aim)
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.handleBatSwing();
      } else if (e.code === 'KeyB') {
        this.deliverNextBall();
      } else if (e.code === 'KeyL') {
        loftBtn.click();
      } else if (e.code === 'ArrowLeft') {
        this.setShotAngle(270, 'MID-WICKET / PULL');
      } else if (e.code === 'ArrowRight') {
        this.setShotAngle(60, 'COVER DRIVE');
      } else if (e.code === 'ArrowUp') {
        this.setShotAngle(0, 'STRAIGHT DRIVE');
      }
    });

    // 4. 360 Radial Joystick Aiming Wheel
    this.initJoystick();
  }

  initJoystick() {
    const wheel = document.getElementById('shot-wheel');
    const handle = document.getElementById('wheel-handle');
    let isDragging = false;

    const onPointerMove = (clientX, clientY) => {
      const rect = wheel.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 42);
      const angleRad = Math.atan2(dy, dx);

      handle.style.transform = `translate(${Math.cos(angleRad) * dist}px, ${Math.sin(angleRad) * dist}px)`;

      // Convert angle: Up (dy < 0) is Straight (0 deg), Right is Off-side (90 deg), Left is Leg-side (270 deg)
      let deg = THREE.MathUtils.radToDeg(Math.atan2(dx, -dy));
      if (deg < 0) deg += 360;

      const shotName = this.match.getShotName(deg, this.isLofted);
      this.setShotAngle(deg, shotName);
    };

    wheel.addEventListener('pointerdown', (e) => {
      isDragging = true;
      onPointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e) => {
      if (isDragging) onPointerMove(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        handle.style.transform = 'translate(0px, 0px)';
      }
    });
  }

  setShotAngle(deg, name) {
    this.shotAngleDeg = deg;
    const label = document.getElementById('shot-direction-name');
    if (label) label.textContent = name.toUpperCase();
  }

  deliverNextBall() {
    if (this.isBallInPlay) return;

    this.isBallInPlay = true;
    this.stadium.resetBails();
    this.players.reset();

    const select = document.getElementById('delivery-select');
    const delivery = select ? select.value : DeliveryTypes.OUTSWING;

    // Speed variation between 136 and 152 km/h for fast, or 84-94 for spin
    let speed = 144 + Math.round((Math.random() - 0.5) * 12);
    if (delivery.includes('Spin') || delivery.includes('Googly') || delivery.includes('Break')) {
      speed = 88 + Math.round((Math.random() - 0.5) * 8);
    }

    // Pitch bounce target (length)
    let targetZ = 6.2 + (Math.random() - 0.5) * 1.5;
    let targetX = (Math.random() - 0.5) * 0.45;

    this.sound.playBowlingWhoosh();
    this.ballPhysics.bowlDelivery(delivery, targetZ, targetX, speed);

    // Show speed radar
    this.displaySpeedRadar(speed);
  }

  displaySpeedRadar(speed) {
    const radar = document.getElementById('speed-radar');
    const val = document.getElementById('speed-val');
    if (radar && val) {
      val.textContent = speed.toFixed(1);
      radar.classList.add('active');
      setTimeout(() => radar.classList.remove('active'), 3200);
    }
  }

  handleBatSwing() {
    this.players.triggerBatSwing(this.shotAngleDeg, this.isLofted);
    this.sound.playBatCrack(this.isLofted ? 1.2 : 0.85);

    if (!this.isBallInPlay || !this.ballPhysics.isInFlight) return;

    // Evaluate timing based on ball Z coordinate relative to batting crease (z = 9.15m)
    const ballZ = this.ballPhysics.position.z;
    let timingGrade = 'MISSED';

    const deltaZ = Math.abs(ballZ - 9.15);

    if (deltaZ <= 0.45) {
      timingGrade = 'PERFECT';
    } else if (deltaZ <= 0.95) {
      timingGrade = 'GOOD';
    } else if (ballZ < 8.2) {
      timingGrade = 'EARLY';
    } else if (ballZ > 10.1) {
      timingGrade = 'LATE';
    } else {
      timingGrade = Math.random() < 0.5 ? 'EDGED' : 'GOOD';
    }

    if (timingGrade !== 'MISSED') {
      this.isBallInPlay = false; // Ball struck

      // Calculate exit velocity
      const power = timingGrade === 'PERFECT' ? (this.isLofted ? 46 : 38) : (timingGrade === 'GOOD' ? 32 : 18);
      const rad = THREE.MathUtils.degToRad(this.shotAngleDeg);

      // Shot direction vector (facing toward outfield)
      // In Three.js: 0 deg = -Z (straight back to bowler), 90 deg = +X (off-side), 270 deg = -X (leg-side)
      const vx = Math.sin(rad) * power;
      const vz = -Math.cos(rad) * power;
      const elevation = this.isLofted ? (timingGrade === 'PERFECT' ? 34 : 48) : 4;

      this.ballPhysics.applyBatHit(new THREE.Vector3(vx, 0, vz), elevation);

      // Process match score outcome
      const outcome = this.match.processShot(timingGrade, this.shotAngleDeg, this.isLofted, power * 3.6);
      this.triggerOutcomeCelebration(outcome);
    }
  }

  triggerOutcomeCelebration(outcome) {
    const alertBox = document.getElementById('event-alert');
    const badge = document.getElementById('event-badge');
    const sub = document.getElementById('event-sub');

    badge.className = 'event-badge';

    if (outcome.runs === 6) {
      badge.classList.add('six');
      badge.textContent = 'MAXIMUM 6';
      sub.textContent = `${outcome.shotName.toUpperCase()} - SOARING HIGH!`;
      this.sound.playCrowdRoar(true);

      // Fireworks Confetti!
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else if (outcome.runs === 4) {
      badge.classList.add('four');
      badge.textContent = 'FOUR RUNS!';
      sub.textContent = `${outcome.shotName.toUpperCase()} TO THE BOUNDARY!`;
      this.sound.playCrowdRoar(false);
    } else if (outcome.isWicket) {
      badge.classList.add('wicket');
      badge.textContent = outcome.wicketType;
      sub.textContent = outcome.commentary;
      this.sound.playStumpsShatter();
    } else {
      return; // No big alert for 0, 1, 2 runs
    }

    alertBox.classList.add('active');
    setTimeout(() => alertBox.classList.remove('active'), 2800);
  }

  checkStumpsCollision() {
    if (!this.isBallInPlay || !this.ballPhysics.isInFlight) return;

    const pos = this.ballPhysics.position;

    // Batsman stumps are at z = 10.06m, x in [-0.15, 0.15], y <= 0.72m
    if (pos.z >= 10.0 && pos.z <= 10.25) {
      if (Math.abs(pos.x) <= 0.16 && pos.y <= 0.73) {
        this.isBallInPlay = false;
        this.stadium.breakBails();
        this.sound.playStumpsShatter();
        this.ballPhysics.stopFlight();

        const outcome = this.match.processBowled();
        this.triggerOutcomeCelebration(outcome);
      }
    }

    // Ball passed batsman without contact and without hitting stumps (Dot ball)
    if (pos.z > 12.0 && this.isBallInPlay) {
      this.isBallInPlay = false;
      this.match.processShot('MISSED', 0, false, 140);
    }
  }

  initUI() {
    this.match.subscribe((state) => {
      document.getElementById('main-score').textContent = `${state.runs}/${state.wickets}`;
      document.getElementById('main-overs').textContent = `(${state.oversStr})`;
      document.getElementById('crr-text').textContent = `CRR: ${state.crr}`;

      const targetEl = document.getElementById('target-text');
      if (state.target) {
        targetEl.style.display = 'inline';
        targetEl.textContent = `Target: ${state.target} (RRR: ${state.rrr})`;
      }

      // Striker
      document.getElementById('striker-name').textContent = `${state.striker.name}*`;
      document.getElementById('striker-runs').textContent = `${state.striker.runs} (${state.striker.balls})`;

      // Non-striker
      document.getElementById('non-striker-name').textContent = state.nonStriker.name;
      document.getElementById('non-striker-runs').textContent = `${state.nonStriker.runs} (${state.nonStriker.balls})`;

      // Bowler
      document.getElementById('bowler-name').textContent = state.bowler.name;
      document.getElementById('bowler-figs').textContent = `${state.bowler.overs}-${state.bowler.wickets}-${state.bowler.runs}`;

      // Commentary
      if (state.lastOutcome) {
        document.getElementById('commentary-text').textContent = state.lastOutcome.commentary;
      }

      // Recent balls pills
      const ballsContainer = document.getElementById('recent-balls');
      ballsContainer.innerHTML = '';
      state.recentOvers.slice(-6).forEach((ball) => {
        const pill = document.createElement('div');
        pill.className = 'ball-pill';
        if (ball === '4') pill.classList.add('four');
        else if (ball === '6') pill.classList.add('six');
        else if (ball === 'W') pill.classList.add('wicket');
        pill.textContent = ball;
        ballsContainer.appendChild(pill);
      });
    });
  }

  animate(time) {
    requestAnimationFrame((t) => this.animate(t));

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.ballPhysics.update(dt);
    this.players.update(dt);
    this.checkStumpsCollision();

    // Subtle broadcast camera dynamic tracking
    if (this.ballPhysics.isInFlight && this.ballPhysics.position.z < 8.0) {
      this.camera.position.x = this.defaultCamPos.x + this.ballPhysics.position.x * 0.15;
    } else {
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.defaultCamPos.x, dt * 2.0);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

// Boot up game on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  new ProCricketGame();
});
