import * as THREE from 'three';
import { createBox } from './model/box.js';
import { updateYawRollPitch } from './animate/rotate.js';
import { createConfigPanel } from './ui/configPanel.js';
import { createConfigButton3d } from './ui/configButton3d.js';

// キャンバスサイズ
const WIDTH = 1024;
const HEIGHT = 576;

// キャンバス取得
const canvas = document.getElementById('game-canvas');
const container = document.getElementById('game-container');

// シーン作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2d2d44);

// カメラ作成（視野角, アスペクト比, 近接面, 遠方面）
const camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.1, 1000);
camera.position.z = 5;

// レンダラー作成
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ボックス作成
const box = createBox(scene);

// Three.js Canvas 上のコンフィグ（歯車）ボタン（Material Symbols / アンカー・ピボット）
const {
  uiScene: configButtonUiScene,
  orthoCamera: configButtonOrthoCamera,
  mesh: configButtonMesh,
  update: updateConfigButton
} = await createConfigButton3d();

// 設定パネル（歯車クリックで表示・DOM オーバーレイ）
const configPanel = createConfigPanel(container);

// Raycaster: 歯車クリックでパネル表示、ホバーでポインター（UI 用オースオソグラフィックカメラを使用）
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function getPointerNDC(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
}

function isPointerOverConfigButton(clientX, clientY) {
  getPointerNDC(clientX, clientY);
  raycaster.setFromCamera(pointer, configButtonOrthoCamera);
  const hits = raycaster.intersectObject(configButtonMesh);
  return hits.length > 0;
}

canvas.addEventListener('click', (e) => {
  if (isPointerOverConfigButton(e.clientX, e.clientY)) {
    configPanel.toggle();
  } else {
    configPanel.hide();
  }
});

canvas.addEventListener('pointermove', (e) => {
  container.style.cursor = isPointerOverConfigButton(e.clientX, e.clientY) ? 'pointer' : 'default';
});

// リサイズハンドラ（フルスクリーン切替時など）
function onResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  updateConfigButton(width, height);
}

// ESC キーでフルスクリーン解除
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.fullscreenElement) {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
});

// フルスクリーン変更時のリサイズ
container.addEventListener('fullscreenchange', onResize);
container.addEventListener('webkitfullscreenchange', onResize);

// ウィンドウリサイズ時
window.addEventListener('resize', onResize);

// 初回の UI ボタン位置更新
updateConfigButton(container.clientWidth, container.clientHeight);

// アニメーションループ（ゲーム描画 → UI レイヤー描画の 2 パス）
function animate() {
  requestAnimationFrame(animate);
  updateYawRollPitch(box);
  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(configButtonUiScene, configButtonOrthoCamera);
  renderer.autoClear = true;
}
animate();
