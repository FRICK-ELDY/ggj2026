import * as THREE from 'three';
import { createBox } from './model/box.js';
import { updateYawRollPitch } from './animate/rotate.js';

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

// リサイズハンドラ（フルスクリーン切替時など）
function onResize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// 最大化ボタン
const maximizeBtn = document.getElementById('game-maximize-btn');
if (maximizeBtn) {
  maximizeBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      container.requestFullscreen?.() || container.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  });
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

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  updateYawRollPitch(box);
  renderer.render(scene, camera);
}
animate();
