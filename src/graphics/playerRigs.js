import * as THREE from 'three';

export class PlayerRigs {
  constructor(scene) {
    this.scene = scene;
    this.fielders = [];
    this.battingTeamKit = { color: 0x005522, accent: 0xffd600 };
    this.fieldingTeamKit = { color: 0x004ba0, accent: 0xff6f00 };

    this.batsman = null;
    this.nonStriker = null;
    this.bowler = null;
    this.wicketkeeper = null;
    this.umpires = [];

    this.isBowlerRunning = false;
    this.bowlerRunProgress = 0;
    this.onBallRelease = null;

    this.setupMatchPlayers();
  }

  setTeamKits(battingKit, fieldingKit) {
    this.battingTeamKit = battingKit;
    this.fieldingTeamKit = fieldingKit;
    this.rebuildAllPlayers();
  }

  rebuildAllPlayers() {
    // Clear old meshes
    if (this.batsman) this.scene.remove(this.batsman.group);
    if (this.nonStriker) this.scene.remove(this.nonStriker.group);
    if (this.bowler) this.scene.remove(this.bowler.group);
    if (this.wicketkeeper) this.scene.remove(this.wicketkeeper.group);
    this.fielders.forEach(f => this.scene.remove(f.group));
    this.umpires.forEach(u => this.scene.remove(u.group));
    this.fielders = [];
    this.umpires = [];

    this.setupMatchPlayers();
  }

  setupMatchPlayers() {
    // 1. Striker Batsman
    this.batsman = this.createBatsmanModel(this.battingTeamKit, true);
    this.batsman.group.position.set(0.35, 0, 9.15);
    this.batsman.group.rotation.y = Math.PI / 2;
    this.scene.add(this.batsman.group);

    // 2. Non-Striker Batsman
    this.nonStriker = this.createBatsmanModel(this.battingTeamKit, false);
    this.nonStriker.group.position.set(-1.3, 0, -8.84);
    this.nonStriker.group.rotation.y = -Math.PI / 2;
    this.scene.add(this.nonStriker.group);

    // 3. Wicketkeeper (Behind stumps in crouch stance)
    this.wicketkeeper = this.createWicketkeeperModel(this.fieldingTeamKit);
    this.wicketkeeper.group.position.set(0, 0, 12.2);
    this.scene.add(this.wicketkeeper.group);

    // 4. Bowler (Starts at run-up mark z = -18m)
    this.bowler = this.createBowlerModel(this.fieldingTeamKit);
    this.bowler.group.position.set(0.4, 0, -17.5);
    this.scene.add(this.bowler.group);

    // 5. 9 Other Fielders (Full ICC Field Arrangement)
    const fielderPositions = [
      { name: "1st Slip", pos: [1.8, 0, 13.5], rot: Math.PI },
      { name: "2nd Slip", pos: [3.4, 0, 14.2], rot: Math.PI },
      { name: "Point", pos: [17.0, 0, 8.5], rot: Math.PI * 0.9 },
      { name: "Cover", pos: [22.0, 0, 2.0], rot: Math.PI * 0.7 },
      { name: "Extra Cover", pos: [24.0, 0, -6.0], rot: Math.PI * 0.6 },
      { name: "Mid-Off", pos: [8.5, 0, -13.0], rot: Math.PI * 0.25 },
      { name: "Mid-On", pos: [-8.5, 0, -13.0], rot: -Math.PI * 0.25 },
      { name: "Mid-Wicket", pos: [-22.0, 0, 2.0], rot: -Math.PI * 0.7 },
      { name: "Square Leg", pos: [-18.0, 0, 8.5], rot: -Math.PI * 0.9 }
    ];

    fielderPositions.forEach(cfg => {
      const f = this.createFielderModel(this.fieldingTeamKit, cfg.name);
      f.group.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      f.group.rotation.y = cfg.rot;
      this.scene.add(f.group);
      this.fielders.push(f);
    });

    // 6. Two Umpires
    // Main Umpire behind bowler wickets
    const mainUmpire = this.createUmpireModel();
    mainUmpire.group.position.set(0, 0, -12.4);
    this.scene.add(mainUmpire.group);
    this.umpires.push(mainUmpire);

    // Square Leg Umpire
    const sqLegUmpire = this.createUmpireModel();
    sqLegUmpire.group.position.set(-18.5, 0, 8.84);
    sqLegUmpire.group.rotation.y = Math.PI / 2;
    this.scene.add(sqLegUmpire.group);
    this.umpires.push(sqLegUmpire);
  }

  createBatsmanModel(kit, isStriker) {
    const group = new THREE.Group();
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });
    const jerseyMat = new THREE.MeshStandardMaterial({ color: kit.color, roughness: 0.5 });
    const padMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: kit.color, roughness: 0.4 });
    const batWoodMat = new THREE.MeshStandardMaterial({ color: 0xdfb173, roughness: 0.3 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.28), jerseyMat);
    torso.position.y = 1.25;
    torso.castShadow = true;
    group.add(torso);

    // Head & Helmet
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.y = 1.72;
    group.add(head);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 16), helmetMat);
    helmet.position.set(0, 1.75, 0);
    group.add(helmet);

    // Legs with Batting Pads
    [-0.14, 0.14].forEach((xPos) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.85, 12), jerseyMat);
      leg.position.set(xPos, 0.55, 0);
      leg.castShadow = true;
      group.add(leg);

      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.65, 0.12), padMat);
      pad.position.set(xPos, 0.48, -0.06);
      pad.castShadow = true;
      group.add(pad);
    });

    // Bat Pivot & Willow Bat
    const batPivot = new THREE.Group();
    batPivot.position.set(0.24, 1.15, 0.05);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 12), new THREE.MeshStandardMaterial({ color: 0x222222 }));
    handle.position.y = -0.15;
    batPivot.add(handle);

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.72, 0.045), batWoodMat);
    blade.position.set(0, -0.62, 0);
    blade.castShadow = true;
    batPivot.add(blade);
    group.add(batPivot);

    return {
      group,
      batPivot,
      isStriker,
      isSwinging: false,
      swingProgress: 0
    };
  }

  createWicketkeeperModel(kit) {
    const group = new THREE.Group();
    const jerseyMat = new THREE.MeshStandardMaterial({ color: kit.color, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0xffea00, roughness: 0.3 }); // Big wicketkeeper gloves

    // Torso (crouched forward)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.28), jerseyMat);
    torso.position.set(0, 0.95, 0.12);
    torso.rotation.x = 0.45; // Leaning forward crouch
    group.add(torso);

    // Head & Cap
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), skinMat);
    head.position.set(0, 1.35, -0.05);
    group.add(head);

    // Legs in deep squat
    [-0.15, 0.15].forEach(xPos => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.7, 8), jerseyMat);
      leg.position.set(xPos, 0.4, 0.1);
      leg.rotation.x = -0.3;
      group.add(leg);
    });

    // Wicketkeeper Large Gloves
    [-0.22, 0.22].forEach(xPos => {
      const glove = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.08), gloveMat);
      glove.position.set(xPos, 0.75, -0.22);
      group.add(glove);
    });

    return { group };
  }

  createBowlerModel(kit) {
    const group = new THREE.Group();
    const jerseyMat = new THREE.MeshStandardMaterial({ color: kit.color, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.26), jerseyMat);
    torso.position.y = 1.35;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
    head.position.y = 1.8;
    group.add(head);

    // Windmill Bowling Arm Pivot
    const armPivot = new THREE.Group();
    armPivot.position.set(0.32, 1.62, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.65, 8), skinMat);
    arm.position.y = -0.3;
    armPivot.add(arm);
    group.add(armPivot);

    // Legs
    [-0.14, 0.14].forEach((xPos) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.9, 8), jerseyMat);
      leg.position.set(xPos, 0.55, 0);
      group.add(leg);
    });

    return { group, armPivot };
  }

  createFielderModel(kit, name) {
    const group = new THREE.Group();
    const jerseyMat = new THREE.MeshStandardMaterial({ color: kit.color, roughness: 0.5 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.26), jerseyMat);
    torso.position.y = 1.25;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
    head.position.y = 1.72;
    group.add(head);

    // Cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16), jerseyMat);
    cap.position.set(0, 1.83, 0);
    group.add(cap);

    // Legs in athletic stance
    [-0.13, 0.13].forEach((xPos) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.85, 8), jerseyMat);
      leg.position.set(xPos, 0.52, 0);
      group.add(leg);
    });

    return { group, name };
  }

  createUmpireModel() {
    const group = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: 0xeeffff, roughness: 0.4 }); // White umpire coat
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 }); // Black trousers
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd2996c, roughness: 0.7 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }); // White sun hat

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.72, 0.28), coatMat);
    torso.position.y = 1.35;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
    head.position.y = 1.82;
    group.add(head);

    // Wide brim sun hat
    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 24), hatMat);
    hatBrim.position.set(0, 1.9, 0);
    group.add(hatBrim);

    [-0.14, 0.14].forEach((xPos) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.9, 8), pantsMat);
      leg.position.set(xPos, 0.55, 0);
      group.add(leg);
    });

    return { group };
  }

  startBowlerRunUp(onRelease) {
    this.isBowlerRunning = true;
    this.bowlerRunProgress = 0;
    this.onBallRelease = onRelease;
    this.bowler.group.position.set(0.4, 0, -17.5);
  }

  triggerBatSwing(shotAngleDeg, isLofted) {
    if (this.batsman.isSwinging) return;
    this.batsman.isSwinging = true;
    this.batsman.swingProgress = 0;
    this.batsman.shotAngleDeg = shotAngleDeg;
    this.batsman.isLofted = isLofted;
  }

  update(dt) {
    // 1. Bowler Run-Up & Delivery Action
    if (this.isBowlerRunning) {
      this.bowlerRunProgress += dt * 1.35; // Runs in over ~0.75 seconds

      // Run forward from -17.5m to -10.2m (crease)
      const runZ = THREE.MathUtils.lerp(-17.5, -10.2, Math.min(this.bowlerRunProgress, 1.0));
      this.bowler.group.position.z = runZ;

      // Leg running bob
      this.bowler.group.position.y = Math.abs(Math.sin(this.bowlerRunProgress * 14)) * 0.12;

      // Arm windmill rotation at the crease
      if (this.bowlerRunProgress >= 0.7) {
        const armProg = (this.bowlerRunProgress - 0.7) / 0.3;
        this.bowler.armPivot.rotation.x = -armProg * Math.PI * 2;
      }

      // Ball Release point
      if (this.bowlerRunProgress >= 1.0) {
        this.isBowlerRunning = false;
        this.bowler.group.position.y = 0;
        this.bowler.armPivot.rotation.x = 0;
        if (this.onBallRelease) {
          this.onBallRelease();
          this.onBallRelease = null;
        }
      }
    }

    // 2. Batsman swing animation
    if (this.batsman.isSwinging) {
      this.batsman.swingProgress += dt * 6.5;

      const p = this.batsman.swingProgress;
      const pivot = this.batsman.batPivot;

      if (p <= 0.3) {
        pivot.rotation.x = -p * 2.8;
        pivot.rotation.z = p * 1.5;
      } else if (p <= 0.7) {
        const downProgress = (p - 0.3) / 0.4;
        pivot.rotation.x = -0.84 + downProgress * 3.2;
        pivot.rotation.z = 0.45 - downProgress * 1.8;
      } else if (p <= 1.0) {
        const followProgress = (p - 0.7) / 0.3;
        pivot.rotation.x = 2.36 - followProgress * 2.36;
        pivot.rotation.z = -1.35 + followProgress * 1.35;
      } else {
        this.batsman.isSwinging = false;
        pivot.rotation.set(0, 0, 0);
      }
    }
  }

  reset() {
    this.batsman.isSwinging = false;
    this.batsman.batPivot.rotation.set(0, 0, 0);
    this.isBowlerRunning = false;
    this.bowler.group.position.set(0.4, 0, -17.5);
    this.bowler.armPivot.rotation.x = 0;
  }
}
