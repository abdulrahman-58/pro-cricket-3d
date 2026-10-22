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
    this.radius = 0.036; // 3.6cm radius
    this.airDensity = 1.225;
    this.dragCoeff = 0.45;
    this.gravity = -9.81;

    this.isInFlight = false;
    this.hasPitched = false;
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.seamAngleDeg = 0;
    this.spinRpm = 1200;
    this.currentDelivery = DeliveryTypes.OUTSWING;

    this.pitchRestitution = 0.58; // Standard turf
    this.pitchFriction = 0.88;

    this.mesh = this.createBallMesh();
    this.scene.add(this.mesh);

    this.trailPoints = [];
    this.maxTrailLength = 45;
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.LineBasicMaterial({
      color: 0xff3b30,
      transparent: true,
      opacity: 0.8,
      linewidth: 3
    });
    this.trailLine = new THREE.Line(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trailLine);

    this.onPitchBounce = null;
  }

  createBallMesh() {
    const group = new THREE.Group();
    const sphereGeo = new THREE.SphereGeometry(this.radius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: 0xba131a, // Red Kookaburra/Dukes
      roughness: 0.35,
      metalness: 0.1
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.castShadow = true;
    group.add(sphere);

    const seamGeo = new THREE.TorusGeometry(this.radius * 0.99, 0.002, 12, 48);
    const seamMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const seam = new THREE.Mesh(seamGeo, seamMat);
    seam.rotation.x = Math.PI / 2;
    group.add(seam);

    group.position.set(0, -10, 0);
    return group;
  }

  bowlDelivery(deliveryType, targetPitchZ = 6.2, targetPitchX = 0.0, speedKmh = 142) {
    this.currentDelivery = deliveryType;
    this.hasPitched = false;
    this.isInFlight = true;
    this.trailPoints = [];

    const releasePos = new THREE.Vector3(0.35, 2.15, -10.0);
    this.position.copy(releasePos);
    this.mesh.position.copy(releasePos);

    let speedMs = (speedKmh * 1000) / 3600;

    this.seamAngleDeg = 0;
    this.spinRpm = 1400;

    switch (deliveryType) {
      case DeliveryTypes.OUTSWING:
        this.seamAngleDeg = 15; // +15 deg = conventional swing away toward slips (+X)
        break;
      case DeliveryTypes.INSWING:
        this.seamAngleDeg = -15; // -15 deg = conventional swing into stumps (-X)
        break;
      case DeliveryTypes.YORKER:
        targetPitchZ = 8.6;
        this.seamAngleDeg = -8;
        speedMs *= 1.02;
        break;
      case DeliveryTypes.BOUNCER:
        targetPitchZ = 2.4;
        speedMs *= 1.05;
        break;
      case DeliveryTypes.SLOWER:
        speedMs *= 0.78;
        this.spinRpm = 800;
        break;
      case DeliveryTypes.LEGSPIN:
        speedMs = (88 * 1000) / 3600;
        this.spinRpm = 2400;
        this.seamAngleDeg = -45;
        break;
      case DeliveryTypes.OFFSPIN:
        speedMs = (92 * 1000) / 3600;
        this.spinRpm = 2200;
        this.seamAngleDeg = 45;
        break;
      case DeliveryTypes.GOOGLY:
        speedMs = (86 * 1000) / 3600;
        this.spinRpm = 2500;
        this.seamAngleDeg = 55;
        break;
    }

    const targetPos = new THREE.Vector3(targetPitchX, 0.036, targetPitchZ);
    const toTarget = new THREE.Vector3().subVectors(targetPos, releasePos);
    const horizontalDist = Math.sqrt(toTarget.x * toTarget.x + toTarget.z * toTarget.z);
    const timeToPitch = horizontalDist / speedMs;

    const vy = (toTarget.y - 0.5 * this.gravity * timeToPitch * timeToPitch) / timeToPitch;
    const vx = toTarget.x / timeToPitch;
    const vz = toTarget.z / timeToPitch;

    this.velocity.set(vx, vy, vz);
  }

  update(dt) {
    if (!this.isInFlight) return;

    const speed = this.velocity.length();
    if (speed < 0.1) {
      this.isInFlight = false;
      return;
    }

    const area = Math.PI * this.radius * this.radius;

    // 1. Aerodynamic Drag: Fd = -0.5 * rho * v^2 * Cd * A * v_hat
    const dragMagnitude = 0.5 * this.airDensity * speed * speed * this.dragCoeff * area;
    const dragForce = this.velocity.clone().normalize().multiplyScalar(-dragMagnitude);

    // 2. Aerodynamic Seam Lateral Force (Boundary Layer Tripping)
    const seamRad = THREE.MathUtils.degToRad(this.seamAngleDeg);
    const sideForceCoeff = Math.sin(seamRad) * 0.28;
    const sideForceMag = 0.5 * this.airDensity * speed * speed * sideForceCoeff * area;
    const sideForce = new THREE.Vector3(sideForceMag, 0, 0);

    // 3. Gravity
    const gravityForce = new THREE.Vector3(0, this.mass * this.gravity, 0);

    // Net Acceleration = Total Force / mass
    const totalForce = new THREE.Vector3().add(dragForce).add(sideForce).add(gravityForce);
    const acceleration = totalForce.divideScalar(this.mass);

    this.velocity.addScaledVector(acceleration, dt);
    this.position.addScaledVector(this.velocity, dt);

    // Pitch Collision
    if (this.position.y <= this.radius && this.velocity.y < 0) {
      this.handlePitchImpact();
    }

    this.mesh.position.copy(this.position);
    this.mesh.rotation.x += dt * 15.0;
    this.mesh.rotation.y += THREE.MathUtils.degToRad(this.seamAngleDeg) * dt * 5.0;

    this.updateTrail();

    if (this.position.length() > 85 || this.position.y < -1) {
      this.isInFlight = false;
    }
  }

  handlePitchImpact() {
    this.position.y = this.radius;
    this.hasPitched = true;

    // Vertical Restitution
    this.velocity.y = -this.velocity.y * this.pitchRestitution;

    // Horizontal Pitch Friction
    this.velocity.z *= this.pitchFriction;

    // Spin / Seam Lateral Bite off Pitch
    if (this.currentDelivery === DeliveryTypes.OFFSPIN || this.currentDelivery === DeliveryTypes.GOOGLY) {
      this.velocity.x -= 1.6; // Bites and turns inside into right-hander
    } else if (this.currentDelivery === DeliveryTypes.LEGSPIN) {
      this.velocity.x += 1.6; // Bites and turns outside away from right-hander
    } else if (this.currentDelivery === DeliveryTypes.OUTSWING) {
      this.velocity.x += 0.35; // Seam away
    } else if (this.currentDelivery === DeliveryTypes.INSWING) {
      this.velocity.x -= 0.35; // Nip back
    }

    if (this.onPitchBounce) {
      this.onPitchBounce(this.position.clone(), this.velocity.clone());
    }
  }

  applyBatHit(exitVelocity, elevationAngleDeg) {
    this.velocity.copy(exitVelocity);
    const horizontalSpeed = Math.sqrt(exitVelocity.x * exitVelocity.x + exitVelocity.z * exitVelocity.z);
    const rad = THREE.MathUtils.degToRad(elevationAngleDeg);
    this.velocity.y = Math.sin(rad) * horizontalSpeed * 1.1;

    this.seamAngleDeg = 0;
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

  stopFlight() {
    this.isInFlight = false;
    this.velocity.set(0, 0, 0);
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
