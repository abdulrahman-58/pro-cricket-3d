import * as THREE from 'three';

export class StadiumScene {
  constructor(scene) {
    this.scene = scene;
    this.buildGround();
    this.buildPitch();
    this.buildCreases();
    this.buildStumpsAndBails();
    this.buildBoundaryAndStands();
    this.buildFloodlights();
    this.buildSightscreens();
  }

  buildGround() {
    // 70m radius cricket outfield with mowed circular grass lawn pattern
    const groundGeo = new THREE.CircleGeometry(72, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1f5d22, // Rich lush green outfield
      roughness: 0.85,
      metalness: 0.05
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Inner 30-yard fielding circle (27.4m radius)
    const circleGeo = new THREE.RingGeometry(27.35, 27.55, 64);
    const circleMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
    const circle = new THREE.Mesh(circleGeo, circleMat);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.005;
    this.scene.add(circle);
  }

  buildPitch() {
    // Standard 22-yard pitch (20.12m long x 3.05m wide)
    const pitchGeo = new THREE.PlaneGeometry(3.05, 20.12);
    const pitchMat = new THREE.MeshStandardMaterial({
      color: 0xc49a45, // Authentic clay/turf pitch shade
      roughness: 0.95,
      metalness: 0.0
    });
    const pitch = new THREE.Mesh(pitchGeo, pitchMat);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(0, 0.008, 0);
    pitch.receiveShadow = true;
    this.scene.add(pitch);
  }

  buildCreases() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Creates popping creases at both ends (z = +8.84m batsman, z = -8.84m bowler)
    const ends = [8.84, -8.84];
    ends.forEach((zPos) => {
      // Popping Crease line (3.66m long)
      const popLineGeo = new THREE.PlaneGeometry(3.66, 0.08);
      const popLine = new THREE.Mesh(popLineGeo, lineMat);
      popLine.rotation.x = -Math.PI / 2;
      popLine.position.set(0, 0.012, zPos);
      this.scene.add(popLine);

      // Bowling crease (passing through stumps at z = 10.06m)
      const stumpZ = zPos > 0 ? 10.06 : -10.06;
      const bowlLineGeo = new THREE.PlaneGeometry(2.64, 0.06);
      const bowlLine = new THREE.Mesh(bowlLineGeo, lineMat);
      bowlLine.rotation.x = -Math.PI / 2;
      bowlLine.position.set(0, 0.012, stumpZ);
      this.scene.add(bowlLine);

      // Return creases (perpendicular sidelines)
      [-1.32, 1.32].forEach((xSide) => {
        const returnGeo = new THREE.PlaneGeometry(0.06, 2.44);
        const returnLine = new THREE.Mesh(returnGeo, lineMat);
        returnLine.rotation.x = -Math.PI / 2;
        returnLine.position.set(xSide, 0.012, zPos > 0 ? 9.45 : -9.45);
        this.scene.add(returnLine);
      });
    });
  }

  buildStumpsAndBails() {
    this.strikerStumps = this.createWicketSet(10.06);
    this.bowlerStumps = this.createWicketSet(-10.06);
  }

  createWicketSet(zPos) {
    const wicketGroup = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xdeb887, // Natural ash wood
      roughness: 0.4
    });

    const stumpRadius = 0.019; // 3.8cm diameter
    const stumpHeight = 0.711; // 28 inches
    const stumpGeo = new THREE.CylinderGeometry(stumpRadius, stumpRadius, stumpHeight, 16);

    const stumpPositions = [-0.114, 0, 0.114]; // Leg, Middle, Off (9 inches total width)
    const stumps = [];

    stumpPositions.forEach((xPos) => {
      const stump = new THREE.Mesh(stumpGeo, woodMat);
      stump.position.set(xPos, stumpHeight / 2, 0);
      stump.castShadow = true;
      wicketGroup.add(stump);
      stumps.push(stump);
    });

    // Bails resting on top
    const bailGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.111, 12);
    bailGeo.rotateZ(Math.PI / 2);

    const bailLeft = new THREE.Mesh(bailGeo, woodMat);
    bailLeft.position.set(-0.057, stumpHeight + 0.007, 0);
    wicketGroup.add(bailLeft);

    const bailRight = new THREE.Mesh(bailGeo, woodMat);
    bailRight.position.set(0.057, stumpHeight + 0.007, 0);
    wicketGroup.add(bailRight);

    wicketGroup.position.set(0, 0, zPos);
    this.scene.add(wicketGroup);

    return { group: wicketGroup, stumps, bails: [bailLeft, bailRight] };
  }

  buildBoundaryAndStands() {
    // Triangular boundary foam cushions at 65m radius
    const boundaryRadius = 65;
    const boundaryGeo = new THREE.TorusGeometry(boundaryRadius, 0.35, 8, 64);
    const boundaryMat = new THREE.MeshStandardMaterial({
      color: 0x0033aa, // International tournament blue boundary line
      roughness: 0.4
    });
    const boundary = new THREE.Mesh(boundaryGeo, boundaryMat);
    boundary.rotation.x = Math.PI / 2;
    boundary.position.y = 0.2;
    this.scene.add(boundary);

    // Multi-tier Spectator Grandstands encircling stadium
    const standGeo = new THREE.CylinderGeometry(85, 70, 18, 48, 4, true);
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x242933,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const stands = new THREE.Mesh(standGeo, standMat);
    stands.position.y = 8;
    this.scene.add(stands);

    // Grandstand Stadium Roof Ring
    const roofGeo = new THREE.TorusGeometry(86, 2.5, 6, 48);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.3 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.x = Math.PI / 2;
    roof.position.y = 17;
    this.scene.add(roof);
  }

  buildFloodlights() {
    // 4 Mammoth Stadium Floodlight Towers (Corners: 45, 135, 225, 315 deg)
    const angles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    const towerRadius = 88;

    angles.forEach((angle) => {
      const x = Math.cos(angle) * towerRadius;
      const z = Math.sin(angle) * towerRadius;

      // Pylon steel truss column
      const poleGeo = new THREE.CylinderGeometry(0.8, 1.6, 45, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x8892a0, metalness: 0.8 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(x, 22.5, z);
      this.scene.add(pole);

      // Light grid head
      const headGeo = new THREE.BoxGeometry(7, 4, 1.2);
      const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(x, 43, z);
      head.lookAt(0, 5, 0);
      this.scene.add(head);

      // Powerful spotlight casting shadows toward pitch
      const light = new THREE.SpotLight(0xfff6e6, 2.8, 180, Math.PI / 4, 0.4, 1);
      light.position.set(x, 43, z);
      light.target.position.set(0, 0, 0);
      light.castShadow = true;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      this.scene.add(light);
      this.scene.add(light.target);
    });

    // Ambient night sky glow
    const ambient = new THREE.AmbientLight(0x334455, 1.2);
    this.scene.add(ambient);

    // Directional moon/fill light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(0, 50, 20);
    this.scene.add(dirLight);
  }

  buildSightscreens() {
    const screenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    [-66, 66].forEach((zPos) => {
      const screenGeo = new THREE.BoxGeometry(10, 6, 0.5);
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 3, zPos);
      this.scene.add(screen);
    });
  }

  breakBails() {
    if (!this.strikerStumps) return;
    this.strikerStumps.bails.forEach((bail) => {
      bail.position.y += 0.8;
      bail.position.x += (Math.random() - 0.5) * 1.5;
      bail.position.z += Math.random() * 2.0;
      bail.rotation.x = Math.random() * 4;
    });
  }

  resetBails() {
    if (!this.strikerStumps) return;
    this.strikerStumps.bails[0].position.set(-0.057, 0.718, 0);
    this.strikerStumps.bails[0].rotation.set(0, 0, 0);
    this.strikerStumps.bails[1].position.set(0.057, 0.718, 0);
    this.strikerStumps.bails[1].rotation.set(0, 0, 0);
  }
}
