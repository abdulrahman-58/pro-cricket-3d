import * as THREE from 'three';

export class PlayerRigs {
  constructor(scene) {
    this.scene = scene;
    this.batsman = this.createBatsman();
    this.bowler = this.createBowler();
  }

  createBatsman() {
    const group = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x008037, roughness: 0.5 }); // Pakistan/South Africa green or team kit
    const whitePantsMat = new THREE.MeshStandardMaterial({ color: 0x0f4c28, roughness: 0.6 });
    const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }); // White batting pads
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x09381e, roughness: 0.4 });
    const batWoodMat = new THREE.MeshStandardMaterial({ color: 0xdfb173, roughness: 0.3 }); // English Willow

    // Torso / Jersey
    const torsoGeo = new THREE.BoxGeometry(0.48, 0.65, 0.28);
    const torso = new THREE.Mesh(torsoGeo, jerseyMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    group.add(torso);

    // Head & Helmet
    const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.72;
    group.add(head);

    const helmetGeo = new THREE.SphereGeometry(0.155, 16, 16);
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 1.75, 0);
    group.add(helmet);

    // Helmet Peak
    const peakGeo = new THREE.BoxGeometry(0.2, 0.02, 0.12);
    const peak = new THREE.Mesh(peakGeo, helmetMat);
    peak.position.set(0, 1.75, -0.15);
    group.add(peak);

    // Legs with Batting Pads
    [-0.14, 0.14].forEach((xPos) => {
      // Leg
      const legGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.85, 12);
      const leg = new THREE.Mesh(legGeo, whitePantsMat);
      leg.position.set(xPos, 0.55, 0);
      leg.castShadow = true;
      group.add(leg);

      // Pad on shin
      const padGeo = new THREE.BoxGeometry(0.15, 0.65, 0.12);
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(xPos, 0.48, -0.06);
      pad.castShadow = true;
      group.add(pad);
    });

    // Bat Pivot & Willow Bat
    const batPivot = new THREE.Group();
    batPivot.position.set(0.24, 1.15, 0.05);

    // Bat Handle
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0x222222 }); // Black rubber grip
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.15;
    batPivot.add(handle);

    // Bat Blade
    const bladeGeo = new THREE.BoxGeometry(0.11, 0.72, 0.045);
    const blade = new THREE.Mesh(bladeGeo, batWoodMat);
    blade.position.set(0, -0.62, 0);
    blade.castShadow = true;
    batPivot.add(blade);

    group.add(batPivot);

    // Stance position at batting crease (Facing bowler down pitch toward -Z)
    // Left shoulder slightly open toward bowler (right-handed stance)
    group.position.set(0.35, 0, 9.15);
    group.rotation.y = Math.PI / 2; // Sideways batting stance

    this.scene.add(group);

    return {
      group,
      batPivot,
      isSwinging: false,
      swingProgress: 0
    };
  }

  createBowler() {
    const group = new THREE.Group();
    const jerseyMat = new THREE.MeshStandardMaterial({ color: 0x004ba0, roughness: 0.5 }); // Away/Opponent blue
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x002e66, roughness: 0.6 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.46, 0.68, 0.26);
    const torso = new THREE.Mesh(torsoGeo, jerseyMat);
    torso.position.y = 1.35;
    group.add(torso);

    // Head
    const headGeo = new THREE.SphereGeometry(0.13, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.8;
    group.add(head);

    // Bowling Arm
    const armPivot = new THREE.Group();
    armPivot.position.set(0.3, 1.6, 0);
    const armGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.65, 8);
    const arm = new THREE.Mesh(armGeo, skinMat);
    arm.position.y = -0.3;
    armPivot.add(arm);
    group.add(armPivot);

    // Legs
    [-0.14, 0.14].forEach((xPos) => {
      const legGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.9, 8);
      const leg = new THREE.Mesh(legGeo, pantsMat);
      leg.position.set(xPos, 0.55, 0);
      group.add(leg);
    });

    group.position.set(0.35, 0, -10.5);
    this.scene.add(group);

    return { group, armPivot, isRunning: false };
  }

  triggerBatSwing(shotAngleDeg, isLofted) {
    if (this.batsman.isSwinging) return;
    this.batsman.isSwinging = true;
    this.batsman.swingProgress = 0;
    this.batsman.shotAngleDeg = shotAngleDeg;
    this.batsman.isLofted = isLofted;
  }

  update(dt) {
    // Batsman swing animation
    if (this.batsman.isSwinging) {
      this.batsman.swingProgress += dt * 6.5; // Fast crisp bat swing

      const p = this.batsman.swingProgress;
      const pivot = this.batsman.batPivot;

      if (p <= 0.3) {
        // Backlift phase
        pivot.rotation.x = -p * 2.8;
        pivot.rotation.z = p * 1.5;
      } else if (p <= 0.7) {
        // Downswing & Impact phase
        const downProgress = (p - 0.3) / 0.4;
        pivot.rotation.x = -0.84 + downProgress * 3.2; // Powerful arc through the ball
        pivot.rotation.z = 0.45 - downProgress * 1.8;
      } else if (p <= 1.0) {
        // Follow-through phase
        const followProgress = (p - 0.7) / 0.3;
        pivot.rotation.x = 2.36 - followProgress * 2.36;
        pivot.rotation.z = -1.35 + followProgress * 1.35;
      } else {
        // Reset to batting stance
        this.batsman.isSwinging = false;
        pivot.rotation.set(0, 0, 0);
      }
    }
  }

  reset() {
    this.batsman.isSwinging = false;
    this.batsman.batPivot.rotation.set(0, 0, 0);
  }
}
