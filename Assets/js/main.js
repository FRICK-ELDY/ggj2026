import * as THREE from 'three';
import { createBox } from './model/box.js';
import { updateYawRollPitch } from './animate/rotate.js';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H } from './ui/screenScale.js';
import { createConfigPanel3d } from './ui/configPanel3d.js';
import { createConfigButton3d } from './ui/configButton3d.js';

// キャンバス取得
const canvas = document.getElementById('game-canvas');
const container = document.getElementById('game-container');

// シーン作成
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2d2d44);

// カメラ作成（アスペクト比は screenScale のベース解像度に合わせる）
const camera = new THREE.PerspectiveCamera(
  60,
  BASE_RESOLUTION_W / BASE_RESOLUTION_H,
  0.1,
  1000
);
camera.position.z = 5;

// レンダラー作成（初回サイズは getFittedCanvasSize で決める）
const { width: initW, height: initH } = getFittedCanvasSize(container.clientWidth, container.clientHeight);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(initW, initH);
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

// 設定パネル（Three.js パネル・ゲーム設定項目）
const configPanel = createConfigPanel3d(container);
configButtonUiScene.add(configPanel.panelGroup);
const initialSize = getFittedCanvasSize(container.clientWidth, container.clientHeight);
configPanel.update(initialSize.width, initialSize.height);

// Raycaster: 歯車クリックでパネル表示、パネル内ボタンクリックで設定変更
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

function handlePanelAction(action) {
  const id = typeof action === 'object' && action !== null ? action.id : action;
  const value = typeof action === 'object' && action !== null ? action.value : undefined;

  if (id === 'fullscreen') {
    configPanel.setState({ displayMode: 'fullscreen' });
    configPanel.applyDisplayMode(container);
  } else if (id === 'window') {
    configPanel.setState({ displayMode: 'window' });
    configPanel.applyDisplayMode(container);
  } else if (id === 'bgm_slider' && value !== undefined) {
    configPanel.setState({ bgmVolume: value });
  } else if (id === 'se_slider' && value !== undefined) {
    configPanel.setState({ seVolume: value });
  } else if (id === 'quality_low') {
    configPanel.setState({ graphicsQuality: 0 });
  } else if (id === 'quality_med') {
    configPanel.setState({ graphicsQuality: 1 });
  } else if (id === 'quality_high') {
    configPanel.setState({ graphicsQuality: 2 });
  }
}

let draggingSlider = null;

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  getPointerNDC(e.clientX, e.clientY);
  raycaster.setFromCamera(pointer, configButtonOrthoCamera);

  if (configPanel.panelGroup.visible) {
    const panelHits = raycaster.intersectObject(configPanel.mesh);
    if (panelHits.length > 0) {
      const action = configPanel.getActionAt(panelHits[0].point);
      if (action) {
        const id = typeof action === 'object' && action !== null ? action.id : action;
        if (id === 'bgm_slider' || id === 'se_slider') {
          draggingSlider = id;
          handlePanelAction(action);
        }
      }
    }
  }
});

canvas.addEventListener('pointermove', (e) => {
  getPointerNDC(e.clientX, e.clientY);
  raycaster.setFromCamera(pointer, configButtonOrthoCamera);

  if (draggingSlider) {
    const panelHits = raycaster.intersectObject(configPanel.mesh);
    if (panelHits.length > 0) {
      const value = configPanel.getSliderValueFromPoint(panelHits[0].point, draggingSlider);
      if (draggingSlider === 'bgm_slider') {
        configPanel.setState({ bgmVolume: value });
      } else {
        configPanel.setState({ seVolume: value });
      }
    }
  }

  const overButton = raycaster.intersectObject(configButtonMesh).length > 0;
  const overPanel = configPanel.panelGroup.visible && raycaster.intersectObject(configPanel.mesh).length > 0;
  container.style.cursor = draggingSlider ? 'grabbing' : overButton || overPanel ? 'pointer' : 'default';
});

canvas.addEventListener('pointerup', () => {
  draggingSlider = null;
});

canvas.addEventListener('pointerleave', () => {
  draggingSlider = null;
});

canvas.addEventListener('click', (e) => {
  if (e.button !== 0) return;
  getPointerNDC(e.clientX, e.clientY);
  raycaster.setFromCamera(pointer, configButtonOrthoCamera);

  if (configPanel.panelGroup.visible) {
    if (draggingSlider) return;
    const panelHits = raycaster.intersectObject(configPanel.mesh);
    if (panelHits.length > 0) {
      const action = configPanel.getActionAt(panelHits[0].point);
      if (action) {
        const id = typeof action === 'object' && action !== null ? action.id : action;
        if (id !== 'bgm_slider' && id !== 'se_slider') {
          handlePanelAction(action);
        }
      }
      return;
    }
    configPanel.hide();
    return;
  }

  if (isPointerOverConfigButton(e.clientX, e.clientY)) {
    configPanel.syncDisplayModeFromDocument();
    configPanel.toggle();
  }
});

// リサイズハンドラ（解像度比率を維持してコンテナにフィット）
function onResize() {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const { width, height } = getFittedCanvasSize(cw, ch);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  updateConfigButton(width, height);
  configPanel.update(width, height);
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

// 初回リサイズ（解像度比率でフィット）
onResize();

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
