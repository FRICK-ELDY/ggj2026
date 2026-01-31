import * as THREE from 'three';
import { createBox } from '../model/box.js';
import { updateYawRollPitch } from '../animate/rotate.js';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H } from '../ui/screenScale.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';
import { createConfigButton3d } from '../ui/configButton3d.js';

/**
 * ゲームシーンを作成
 * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
 * @param {HTMLElement} container - ゲームコンテナ
 * @param {Function} onSceneChange - シーン変更コールバック (sceneName: string) => void
 * @param {Function} onConfigChange - コンフィグ変更コールバック (configState: Object) => void
 * @returns {Promise<Object>} シーンオブジェクト
 */
export async function createGameScene(canvas, container, onSceneChange, onConfigChange = null) {
  // シーン作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2d2d44);

  // カメラ作成
  const camera = new THREE.PerspectiveCamera(
    60,
    BASE_RESOLUTION_W / BASE_RESOLUTION_H,
    0.1,
    1000
  );
  camera.position.z = 5;

  // レンダラー作成
  const { width: initW, height: initH } = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(initW, initH);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ボックス作成
  const box = createBox(scene);

  // コンフィグボタン（歯車）
  const {
    uiScene: configButtonUiScene,
    orthoCamera: configButtonOrthoCamera,
    mesh: configButtonMesh,
    update: updateConfigButton
  } = await createConfigButton3d();

  // 設定パネル
  const configPanel = createConfigPanel3d(container);
  configButtonUiScene.add(configPanel.panelGroup);
  const initialSize = getFittedCanvasSize(container.clientWidth, container.clientHeight);
  configPanel.update(initialSize.width, initialSize.height);

  // Raycaster
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
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'window') {
      configPanel.setState({ displayMode: 'window' });
      configPanel.applyDisplayMode(container);
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'bgm_slider' && value !== undefined) {
      configPanel.setState({ bgmVolume: value });
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'se_slider' && value !== undefined) {
      configPanel.setState({ seVolume: value });
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'message_speed_slider' && value !== undefined) {
      configPanel.setState({ messageSpeed: value });
      if (onConfigChange) onConfigChange(configPanel.getState());
    } else if (id === 'back_to_title') {
      configPanel.hide();
      onSceneChange('title');
    }
  }

  let draggingSlider = null;
  let releasedAfterSliderDrag = false;

  function onPointerDown(e) {
    if (e.button !== 0) return;
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

    if (configPanel.panelGroup.visible) {
      const panelHits = raycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const action = configPanel.getActionAt(panelHits[0].point);
        if (action) {
          const id = typeof action === 'object' && action !== null ? action.id : action;
          if (
            id === 'bgm_slider' ||
            id === 'se_slider' ||
            id === 'message_speed_slider'
          ) {
            draggingSlider = id;
            handlePanelAction(action);
          }
        }
      }
    }
  }

  function onPointerMove(e) {
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

    if (draggingSlider) {
      const panelHits = raycaster.intersectObject(configPanel.mesh);
      if (panelHits.length > 0) {
        const value = configPanel.getSliderValueFromPoint(panelHits[0].point, draggingSlider);
        if (draggingSlider === 'bgm_slider') {
          configPanel.setState({ bgmVolume: value });
        } else if (draggingSlider === 'se_slider') {
          configPanel.setState({ seVolume: value });
        } else if (draggingSlider === 'message_speed_slider') {
          configPanel.setState({ messageSpeed: value });
        }
      }
    }

    const overButton = raycaster.intersectObject(configButtonMesh).length > 0;
    const overPanel = configPanel.panelGroup.visible && raycaster.intersectObject(configPanel.mesh).length > 0;
    container.style.cursor = draggingSlider ? 'grabbing' : overButton || overPanel ? 'pointer' : 'default';
  }

  function onPointerUp() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    draggingSlider = null;
  }

  function onPointerLeave() {
    if (draggingSlider) releasedAfterSliderDrag = true;
    draggingSlider = null;
  }

  function onClick(e) {
    if (e.button !== 0) return;
    getPointerNDC(e.clientX, e.clientY);
    raycaster.setFromCamera(pointer, configButtonOrthoCamera);

    if (configPanel.panelGroup.visible) {
      if (draggingSlider) return;
      if (releasedAfterSliderDrag) {
        releasedAfterSliderDrag = false;
        return;
      }
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
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('click', onClick);

  // リサイズハンドラ
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
  function onKeyDown(e) {
    if (e.key === 'Escape' && document.fullscreenElement) {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  document.addEventListener('keydown', onKeyDown);
  container.addEventListener('fullscreenchange', onResize);
  container.addEventListener('webkitfullscreenchange', onResize);
  window.addEventListener('resize', onResize);

  onResize();

  // アニメーションループ
  let animationId = null;
  function animate() {
    animationId = requestAnimationFrame(animate);
    updateYawRollPitch(box);
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(configButtonUiScene, configButtonOrthoCamera);
    renderer.autoClear = true;
  }

  // シーン制御
  return {
    start() {
      animate();
    },
    stop() {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    dispose() {
      this.stop();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('fullscreenchange', onResize);
      container.removeEventListener('webkitfullscreenchange', onResize);
      window.removeEventListener('resize', onResize);
      // メモリ解放
      box.geometry.dispose();
      box.material.dispose();
      configButtonMesh.geometry.dispose();
      configButtonMesh.material.dispose();
      configPanel.panelGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      renderer.dispose();
    }
  };
}
