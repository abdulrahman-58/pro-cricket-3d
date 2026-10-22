import * as THREE from 'three';

export const DeliveryTypes = {
  OUTSWING: 'Outswinger',
  INSWING: 'Inswinger',
  YORKER: 'Inswinging Yorker',
  BOUNCER: 'Heavy Bouncer',
  OFFSPIN: 'Off Break',
  LEGSPIN: 'Leg Break',
  GOOGLY: 'Wrong-Un (Googly)',
  SLOWER: 'Back-of-Hand Slower'
};

export class BallPhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    this.mass = 0.160; // 160g cricket ball
    this.radius = 0.036; // 3.6cm
    this.airDensity = 1.225;
    this.dragCoeff = 0.45;
    this.gravity = -9.81;

    // Pitch dimensions (standard 22 yards = 20.12m)
    this.pitchZMin = -10.06;
    this.pitchZMax = 10.06;
    this.pitchHalfWidth = 1.52; // 3.05m pitch width

    // State
    this.isInFlight = false;
    this.hasPitched = false;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.spin = new THREE.Vector3(); // angular velocity (rad/s)
    this.currentDelivery = DeliveryTypes.OUTSWING;

    // 3D Mesh
    this.mesh = this.createBallMesh();
    this.scene.add(this.mesh);

    // Ball trail
    this.trailPoints = [];
    this.maxTrailLength = 40;
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.7,
      linewidth: 3
    });
    this.trailLine = new THREE.Line(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailLine);

    this.onPitchBounce = null;
    this.onWicketsHit = null;
  }

  createBallMesh() {
    const group = new THREE.Group();

    // Red Kookaburra/Dukes ball body
    const sphereGeo = new THREE.SphereGeometry(this.radius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xba131a, // Rich international cricket red
      roughness: 0.35,
      metalness: 0.1
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.castShadow = true;
    group.add(sphere);

    // Raised white seam
    const seamGeo = new THREE.TorusGeometry(this.radius * 0.99, 0.002, 12, 48);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.rotation.x = Math.PI / 2;
    group.add(seam);

    group.position.set(0, -10, 0); // Hide until bowled
    return group;
  }

  bowlDelivery(deliveryType, targetPitchZ = 6.0, targetPitchX = 0.0, speedKmh = 142) {
    this.currentDelivery = deliveryType;
    this.hasPitched = false;
    this.isInFlight = true;
    this.trailPoints = [];

    // Bowler release coordinates (from bowler end: z = -10.0m, height = 2.15m)
    const releasePos = new THREE.Vector3(0.35, 2.15, -10.0);
    this.position.copy(releasePos);
    this.mesh.position.copy(releasePos);

    // Calculate release speed in m/s
    let speedMs = (speedKmh * 1000) / 3600;

    // Delivery specific adjustments
    let seamTilt = 0;
    let spinRpm = 1400;

    switch (deliveryType) {
      case DeliveryTypes.OUTSWING:
        seamTilt = 18; // Lateral swing away from right hander
        break;
      case DeliveryTypes.INSWING:
        seamTilt = -18; // Inward swing into right hander
        break;
      case DeliveryTypes.YORKER:
        targetPitchZ = 8.5; // Very full at batsman toes
        speedMs *= 1.02;
        break;
      case DeliveryTypes.BOUNCER:
        targetPitchZ = 2.0; // Short pitch
        speedMs *= 1.04;
        break;
      case DeliveryTypes.SLOWER:
        speedMs *= 0.78;
        spinRpm = 800;
        break;
      case DeliveryTypes.LEGSPIN:
        speedMs = (88 * 1000) / 3600;
        spinRpm = 2400;
        seamTilt = -45;
        break;
      case DeliveryTypes.OFFSPIN:
        speedMs = (92 * 1000) / 3600;
        spinRpm = 2200;
        seamTilt = 45;
        break;
      case DeliveryTypes.GOOGLY:
        speedMs = (86 * 1000) / 3600;
        spinRpm = 2500;
        seamTilt = 55;
        break;
    }

    // Direction to pitch bounce target
    const targetPos = new THREE.Vector3(targetPitchX, 0.036, targetPitchZ);
    const toTarget = new THREE.Vector3().subVectors(targetPos, releasePos);
    const horizontalDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z);
    const timeToPitch = horizontalDist / speedMs;

    // Initial velocity components
    const vy = (toTarget.y - 0.5 * this.gravity * timeToPitch * timeToPitch) / timeToPitch;
    const vx = toTarget.x / timeToPitch;
    const vz = toTarget.z / timeToPitch;

    this.velocity.set(vx, vy, vz);

    // Spin vector (radians/sec)
    const spinRadSec = (spinRpm * 2 * Math.PI) / 60;
    const seamRad = THREE.MathUtils.degToRad(seamTilt);
    this.spin.set(Math.sin(seamRad) * spinRadSec, Math.cos(seamRad) * spinRadSec, 0);

    return { speedKmh, deliveryType, releasePos };
  }

  update(dt) {
    if (!this.isInFlight) return;

    const speed = this.velocity.length();
    if (speed < 0.1) {
      this.isInFlight = false;
      return;
    }

    // 1. Aerodynamic Air Drag: Fd = -0.5 * rho * v^2 * Cd * A * v_hat
    const area = Math.PI * this.radius * this.radius;
    const dragMagnitude = 0.5 * this.airDensity * speed * speed * this.dragCoeff * area;
    const dragForce = this.velocity.clone().normalize().multiplyScalar(-dragMagnitude);

    // 2. Magnus Effect (Aerodynamic Swing in flight): Fm = S * (spin x velocity)
    const spinCrossV = new THREE.Vector3().crossVectors(this.spin, this.velocity);
    const magnusFactor = 0.00015; // Tuned for authentic international cricket swing
    const magnusForce = spinCrossV.multiplyScalar(magnusFactor);

    // 3. Gravity
    const gravityForce = new THREE.Vector3(0, this.mass * this.gravity, 0);

    // Net Acceleration = F / m
    const totalForce = new THREE.Vector3()
      .add(dragForce)
      .add(magnusForce)
      .add(gravityForce);
    const acceleration = totalForce.divideScalar(this.mass);

    // Verlet integration step
    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    // Check Pitch Ground Collision (y <= radius)
    if (this.position.y <= this.radius && this.velocity.y < 0) {
      this.handlePitchImpact();
    }

    // Update 3D mesh
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x += this.spin.x * dt * 0.1;
    this.mesh.rotation.y += this.spin.y * dt * 0.1;

    // Update Trail
    this.updateTrail();

    // Check boundary / out of bounds limits
    if (this.position.length() > 85 || this.position.y < -1) {
      this.isInFlight = false;
    }
  }

  handlePitchImpact() {
    this.position.y = this.radius;
    this.hasPitched = true;

    // Pitch Restitution (bounce factor)
    const restitution = 0.58; // Standard 22-yard turf pitch
    this.velocity.y = -this.velocity.y * restitution;

    // Friction slows down forward slide
    this.velocity.z *= 0.88;

    // Spin / Seam Deviation off pitch
    if (this.currentDelivery === DeliveryTypes.OFFSPIN || this.currentDelivery === DeliveryTypes.GOOGLY) {
      // Turns in towards right handed batsman (negative X)
      this.velocity.x -= 1.8;
    } else if (this.currentDelivery === DeliveryTypes.LEGSPIN) {
      // Turns away from right handed batsman (positive X)
      this.velocity.x += 1.8;
    } else if (this.currentDelivery === DeliveryTypes.OUTSWING) {
      this.velocity.x += 0.45; // Seam away movement
    } else if (this.currentDelivery === DeliveryTypes.INSWING) {
      this.velocity.x -= 0.45; // Nip backer
    }

    if (this.onPitchBounce) {
      this.onPitchBounce(this.position.clone(), this.velocity.clone());
    }
  }

  applyBatHit(exitVelocity, elevationAngleDeg) {
    this.velocity.copy(exitVelocity);
    // Impart elevation
    const horizontalSpeed = Math.sqrt(exitVelocity.x * exitVelocity.x + exitVelocity.z * exitVelocity.z);
    const rad = THREE.MathUtils.degToRad(elevationAngleDeg);
    this.velocity.y = Math.sin(rad) * horizontalSpeed * 1.1;

    this.spin.set(0, 180, 0); // Backspin
    this.trailPoints = [];
    this.hasPitched = false;
  }

  updateTrail() {
    this.trailPoints.push(this.position.clone());
    if (this.trailPoints.length > this.maxTrailLength) {
      this.trailPoints.shift();
    }
    this.trailGeometry.setFromPoints(this.trailPoints);
  }

  reset() {
    this.isInFlight = false;
    this.hasPitched = false;
    this.position.set(0, -10, 0);
    this.mesh.position.copy(this.position);
    this.trailPoints = [];
    this.trailGeometry.setFromPoints([]);
  }
}
