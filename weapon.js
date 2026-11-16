// One hitscan rifle: a view model, a magazine, a reload, and the spread that punishes moving.
// It owns the numbers; main.js owns the ray and the damage.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const MAG_SIZE = 30;
const RESERVE = 90;
const FIRE_GAP = 0.096;
const RELOAD_TIME = 1.9;
const SPREAD_STILL = 0.0022;
const SPREAD_MOVING = 0.028;
const MOVE_REFERENCE = 5.2;
const MUZZLE_TIME = 0.06;

export function createWeapon(camera) {
  const grip = new THREE.MeshStandardMaterial({ color: '#1c2a32', roughness: 0.72, metalness: 0.12 });
  const body = new THREE.MeshStandardMaterial({ color: '#59666d', roughness: 0.48, metalness: 0.42 });
  const steel = new THREE.MeshStandardMaterial({ color: '#a6b4b8', roughness: 0.28, metalness: 0.78 });
  const model = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.105, 0.34), body);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.46, 10), steel);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.025, -0.37);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.22), grip); stock.position.set(0, -0.015, 0.25);
  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.18, 0.12), grip); magazine.position.set(0, -0.13, 0.045); magazine.rotation.x = -0.12;
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.095), grip); handle.position.set(0, -0.13, 0.17); handle.rotation.x = -0.18;
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.26), grip); rail.position.set(0, 0.068, -0.08);
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.075, 0.035), steel); frontSight.position.set(0, 0.105, -0.39);
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.055, 0.04), steel); rearSight.position.set(0, 0.095, 0.02);
  model.add(receiver, barrel, stock, magazine, handle, rail, frontSight, rearSight);
  model.scale.setScalar(0.82);
  model.position.set(0.25, -0.25, -0.43);
  camera.add(model);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.22, -0.17, -0.82);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.22, -0.15, -0.55);
  camera.add(flashLight);

  const state = { mag: MAG_SIZE, reserve: RESERVE, cooldown: 0, reloadLeft: 0, flash: 0, kick: 0, capacity: MAG_SIZE, reserveMax: RESERVE, fireGap: FIRE_GAP, spreadScale: 1 };

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    model.position.z = -0.42 + state.kick;
    model.rotation.x = state.kick * 2.2;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    if (state.reloadLeft > 0) {
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.55 * Math.min(1, (RELOAD_TIME - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) {
        const need = state.capacity - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
      }
    }
  }

  function setType(type) {
    const specs = { rifle: [30,90,.096,1], smg: [36,108,.068,1.42], shotgun: [8,32,.72,1.85] };
    const [capacity,reserve,fireGap,spreadScale] = specs[type] || specs.rifle;
    state.capacity=capacity; state.reserveMax=reserve; state.fireGap=fireGap; state.spreadScale=spreadScale; state.mag=capacity; state.reserve=reserve; state.cooldown=0; state.reloadLeft=0;
  }

  return {
    setType,
    state,
    step,
    ready() {
      return state.mag > 0 && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      state.cooldown = state.fireGap;
      state.flash = MUZZLE_TIME;
      state.kick = 0.055;
    },
    takeRound() {
      if (state.mag <= 0) return false;
      state.mag -= 1;
      return true;
    },
    reload() {
      if (state.reloadLeft > 0 || state.mag === state.capacity || state.reserve === 0) return;
      state.reloadLeft = RELOAD_TIME;
    },
    spread(speed) {
      return (SPREAD_STILL + Math.min(1, speed / MOVE_REFERENCE) * SPREAD_MOVING) * state.spreadScale;
    },
    refill() {
      state.mag = state.capacity;
      state.reserve = state.reserveMax;
      state.cooldown = 0;
      state.reloadLeft = 0;
      state.flash = 0;
      state.kick = 0;
    },
  };
}
