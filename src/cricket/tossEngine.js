import * as THREE from 'three';

export class TossEngine {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.coin = this.createCoin();
    this.isTossing = false;
    this.tossTime = 0;
    this.tossDuration = 2.4;
    this.onComplete = null;
    this.result = null;
  }

  createCoin() {
    const group = new THREE.Group();

    // Gold coin body
    const coinGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 32);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2
    });
    const cylinder = new THREE.Mesh(coinGeo, goldMat);
    group.add(cylinder);

    // Heads face emblem
    const headsGeo = new THREE.CircleGeometry(0.32, 24);
    const headsMat = new THREE.MeshStandardMaterial({ color: 0xfff066, metalness: 0.8 });
    const heads = new THREE.Mesh(headsGeo, headsMat);
    heads.rotation.x = -Math.PI / 2;
    heads.position.y = 0.021;
    group.add(heads);

    // Tails face emblem
    const tailsMat = new THREE.MeshStandardMaterial({ color: 0xcc9900, metalness: 0.8 });
    const tails = new THREE.Mesh(headsGeo, tailsMat);
    tails.rotation.x = Math.PI / 2;
    tails.position.y = -0.021;
    group.add(tails);

    group.position.set(0, -10, 0); // Hide until toss
    this.scene.add(group);
    return group;
  }

  executeToss(userCall, onComplete) {
    this.isTossing = true;
    this.tossTime = 0;
    this.onComplete = onComplete;

    // Coin lands in middle of pitch (z = 0, y = 0.03)
    this.coin.position.set(0, 0.05, 0);

    // Random toss outcome: 50% Heads, 50% Tails
    const isHeads = Math.random() >= 0.5;
    this.result = isHeads ? "HEADS" : "TAILS";
    this.userWon = (userCall.toUpperCase() === this.result);
  }

  update(dt) {
    if (!this.isTossing) return;

    this.tossTime += dt;
    const progress = this.tossTime / this.tossDuration;

    if (progress < 1.0) {
      // Parabolic coin flip arc: peak at 3.8m
      const height = Math.sin(progress * Math.PI) * 3.8 + 0.05;
      this.coin.position.y = Math.max(height, 0.04);

      // Fast spinning revolutions
      this.coin.rotation.x += dt * 24.0;
      this.coin.rotation.z += dt * 16.0;
    } else {
      // Settle coin on ground
      this.isTossing = false;
      this.coin.position.y = 0.04;
      this.coin.rotation.set(this.result === "HEADS" ? 0 : Math.PI, 0, 0);

      if (this.onComplete) {
        this.onComplete({
          result: this.result,
          userWon: this.userWon
        });
      }
    }
  }

  hideCoin() {
    this.coin.position.set(0, -10, 0);
  }
}
