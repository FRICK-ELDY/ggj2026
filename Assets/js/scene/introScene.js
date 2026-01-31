import * as THREE from 'three';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H } from '../ui/screenScale.js';

/**
 * イントロシーンを作成
 * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
 * @param {HTMLElement} container - ゲームコンテナ
 * @param {Function} onSceneChange - シーン変更コールバック (sceneName: string) => void
 * @returns {Object} シーンオブジェクト
 */
export function createIntroScene(canvas, container, onSceneChange) {
  // シーン作成
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

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

  // UI用のオルソカメラとシーン
  const uiScene = new THREE.Scene();
  const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  orthoCamera.position.z = 5;

  // テキスト表示用のメッシュ
  const textGroup = new THREE.Group();
  const textGeometry = new THREE.PlaneGeometry(1.8, 0.4);
  const textMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.set(0, 0, 0);
  textGroup.add(textMesh);

  uiScene.add(textGroup);

  // 現在のステージ（0: Global Game Jam 2026, 1: お題は Mask, 2: 始まるよ～）
  let currentStage = 0;

  // テキストを描画する関数
  function drawText(text, fontSize = 48) {
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 1024;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = `bold ${fontSize}px "Yu Gothic", "Meiryo", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, textCanvas.width / 2, textCanvas.height / 2);
    
    if (textMaterial.map) {
      textMaterial.map.dispose();
    }
    const texture = new THREE.CanvasTexture(textCanvas);
    textMaterial.map = texture;
    textMaterial.transparent = true;
    textMaterial.needsUpdate = true;
  }

  // 初期テキストを表示
  drawText('Global Game Jam 2026', 48);

  // クリックイベント
  function onClick() {
    currentStage++;
    
    if (currentStage === 1) {
      // ステージ1: お題は Mask
      drawText('お題は Mask', 56);
    } else if (currentStage === 2) {
      // ステージ2: 始まるよ～
      drawText('始まるよ～', 64);
    } else if (currentStage === 3) {
      // ステージ3: ゲーム画面へ遷移
      onSceneChange('game');
    }
  }

  canvas.addEventListener('click', onClick);

  // リサイズハンドラ
  function onResize() {
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const { width, height } = getFittedCanvasSize(cw, ch);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    // オルソカメラのアスペクト比調整
    const aspect = width / height;
    orthoCamera.left = -aspect;
    orthoCamera.right = aspect;
    orthoCamera.updateProjectionMatrix();
  }

  window.addEventListener('resize', onResize);
  onResize();

  // アニメーションループ
  let animationId = null;
  function animate() {
    animationId = requestAnimationFrame(animate);
    renderer.autoClear = false;
    renderer.clear();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(uiScene, orthoCamera);
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
      canvas.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      // メモリ解放
      if (textMaterial.map) {
        textMaterial.map.dispose();
      }
      textMaterial.dispose();
      textGeometry.dispose();
      renderer.dispose();
    }
  };
}
