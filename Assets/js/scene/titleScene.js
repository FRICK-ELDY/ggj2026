import * as THREE from 'three';
import { getFittedCanvasSize, BASE_RESOLUTION_W, BASE_RESOLUTION_H } from '../ui/screenScale.js';
import { createConfigPanel3d } from '../ui/configPanel3d.js';
import { createConfigButton3d } from '../ui/configButton3d.js';

/**
 * タイトルシーンを作成
 * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
 * @param {HTMLElement} container - ゲームコンテナ
 * @param {Function} onSceneChange - シーン変更コールバック (sceneName: string) => void
 * @returns {Promise<Object>} シーンオブジェクト
 */
export async function createTitleScene(canvas, container, onSceneChange) {
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

  // タイトルテキストメッシュ（中央）
  const titleGroup = new THREE.Group();
  const titleGeometry = new THREE.PlaneGeometry(1.5, 0.3);
  const titleMaterial = new THREE.MeshBasicMaterial({ color: 0xe0e0e0 });
  const titleMesh = new THREE.Mesh(titleGeometry, titleMaterial);
  titleMesh.position.set(0, 0.3, 0);
  titleGroup.add(titleMesh);

  // タイトルテキスト（簡易的な表示）
  const titleCanvas = document.createElement('canvas');
  titleCanvas.width = 512;
  titleCanvas.height = 128;
  const titleCtx = titleCanvas.getContext('2d');
  titleCtx.fillStyle = '#1a1a2e';
  titleCtx.fillRect(0, 0, titleCanvas.width, titleCanvas.height);
  titleCtx.fillStyle = '#e0e0e0';
  titleCtx.font = 'bold 64px sans-serif';
  titleCtx.textAlign = 'center';
  titleCtx.textBaseline = 'middle';
  titleCtx.fillText('GGJ 2026', titleCanvas.width / 2, titleCanvas.height / 2);
  
  const titleTexture = new THREE.CanvasTexture(titleCanvas);
  titleMaterial.map = titleTexture;
  titleMaterial.transparent = true;

  uiScene.add(titleGroup);

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

  // ボタン定義（右下に配置 - Unityスタイルのアンカー・ピボット）
  const buttons = [
    { id: 'start', label: 'スタート', action: () => onSceneChange('intro') },
    { id: 'stage_select', label: 'ステージセレクト', action: () => showModal('stage_select') },
    { id: 'credit', label: 'クレジット', action: () => showModal('credit') }
  ];

  // ベース解像度でのボタンサイズ（ピクセル）
  const BASE_BUTTON_WIDTH = 200;
  const BASE_BUTTON_HEIGHT = 50;
  const BASE_BUTTON_GAP = 12;
  const BASE_MARGIN_RIGHT = 20;
  const BASE_MARGIN_BOTTOM = 20;

  const buttonMeshes = [];
  const buttonTextures = [];
  const buttonGroup = new THREE.Group();
  buttonGroup.name = 'titleButtonGroup';

  buttons.forEach((btn, index) => {
    const buttonCanvas = document.createElement('canvas');
    buttonCanvas.width = BASE_BUTTON_WIDTH;
    buttonCanvas.height = BASE_BUTTON_HEIGHT;
    const ctx = buttonCanvas.getContext('2d');

    // ボタン背景
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, buttonCanvas.width, buttonCanvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, buttonCanvas.width, buttonCanvas.height);

    // ボタンテキスト
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 20px "Yu Gothic", "Meiryo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, buttonCanvas.width / 2, buttonCanvas.height / 2);

    const texture = new THREE.CanvasTexture(buttonCanvas);
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `titleButton_${btn.id}`;

    // ローカル座標で下から順に配置（ピボット：中心）
    const localY = (BASE_BUTTON_HEIGHT / 2) + (BASE_BUTTON_HEIGHT + BASE_BUTTON_GAP) * (buttons.length - 1 - index);
    mesh.position.set(0, localY, 0);
    mesh.userData = { id: btn.id, action: btn.action };

    buttonGroup.add(mesh);
    buttonMeshes.push(mesh);
    buttonTextures.push({ canvas: buttonCanvas, texture, label: btn.label });
  });

  uiScene.add(buttonGroup);

  // ボタングループの位置とスケールを更新する関数（アンカー：右下）
  function updateButtonGroupTransform(canvasWidth, canvasHeight) {
    const aspect = canvasWidth / canvasHeight;
    
    // ベース解像度に対する現在の解像度の比率
    const scaleRatio = canvasHeight / BASE_RESOLUTION_H;
    
    // スケール適用後のボタンサイズ（ピクセル単位）
    const scaledButtonWidth = BASE_BUTTON_WIDTH * scaleRatio;
    const scaledButtonHeight = BASE_BUTTON_HEIGHT * scaleRatio;
    const scaledButtonGap = BASE_BUTTON_GAP * scaleRatio;
    const scaledMarginRight = BASE_MARGIN_RIGHT * scaleRatio;
    const scaledMarginBottom = BASE_MARGIN_BOTTOM * scaleRatio;
    
    // オルソカメラの高さは2（-1から1）、幅は2*aspect
    const orthoHeight = 2;
    const orthoWidth = 2 * aspect;
    
    // ピクセルからオルソ座標への変換係数
    const pixelToOrthoX = orthoWidth / canvasWidth;
    const pixelToOrthoY = orthoHeight / canvasHeight;
    
    // ボタンのオルソ座標でのサイズ
    const buttonWidthOrtho = scaledButtonWidth * pixelToOrthoX;
    const buttonHeightOrtho = scaledButtonHeight * pixelToOrthoY;
    const buttonGapOrtho = scaledButtonGap * pixelToOrthoY;
    
    // アンカー：右下（オルソカメラの座標系）
    const anchorX = aspect;  // 右端
    const anchorY = -1;      // 下端
    
    // オフセット（右下からの距離）
    const marginRightOrtho = scaledMarginRight * pixelToOrthoX;
    const marginBottomOrtho = scaledMarginBottom * pixelToOrthoY;
    
    // グループ全体の高さ
    const totalHeight = buttonHeightOrtho * buttons.length + buttonGapOrtho * (buttons.length - 1);
    
    // グループの位置（右下基準、グループの中心がピボット）
    const groupX = anchorX - marginRightOrtho - buttonWidthOrtho / 2;
    const groupY = anchorY + marginBottomOrtho + totalHeight / 2;
    
    buttonGroup.position.set(groupX, groupY, 0);
    
    // 各ボタンのスケールとローカル位置を設定
    buttonMeshes.forEach((mesh, index) => {
      mesh.scale.set(buttonWidthOrtho, buttonHeightOrtho, 1);
      // ローカルY座標（グループの中心を基準に、下から順に配置）
      const localY = -(totalHeight / 2) + buttonHeightOrtho / 2 + (buttonHeightOrtho + buttonGapOrtho) * (buttons.length - 1 - index);
      mesh.position.set(0, localY, 0);
    });
  }

  // モーダル表示関数
  function showModal(modalId) {
    console.log(`モーダル表示: ${modalId}`);
    // TODO: モーダル実装
    alert(`${modalId} モーダル（実装予定）`);
  }

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
    } else if (id === 'window') {
      configPanel.setState({ displayMode: 'window' });
      configPanel.applyDisplayMode(container);
    } else if (id === 'bgm_slider' && value !== undefined) {
      configPanel.setState({ bgmVolume: value });
    } else if (id === 'se_slider' && value !== undefined) {
      configPanel.setState({ seVolume: value });
    } else if (id === 'message_speed_slider' && value !== undefined) {
      configPanel.setState({ messageSpeed: value });
    } else if (id === 'back_to_title') {
      // タイトル画面では既にタイトルなので、パネルを閉じるだけ
      configPanel.hide();
    }
  }

  let draggingSlider = null;
  let releasedAfterSliderDrag = false;

  // ボタンホバー効果
  function updateButtonHover(clientX, clientY) {
    getPointerNDC(clientX, clientY);
    raycaster.setFromCamera(pointer, orthoCamera);
    const hits = raycaster.intersectObjects(buttonMeshes);

    buttonMeshes.forEach((mesh, index) => {
      const isHovered = hits.some(hit => hit.object === mesh);
      const { canvas, texture, label } = buttonTextures[index];
      const ctx = canvas.getContext('2d');

      // 再描画
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        container.style.cursor = 'pointer';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = isHovered ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#e0e0e0';
      ctx.font = 'bold 20px "Yu Gothic", "Meiryo", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, canvas.width / 2, canvas.height / 2);

      texture.needsUpdate = true;
    });

    if (hits.length === 0) {
      container.style.cursor = 'default';
    }
  }

  // イベントリスナー
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

    const overConfigButton = raycaster.intersectObject(configButtonMesh).length > 0;
    const overPanel = configPanel.panelGroup.visible && raycaster.intersectObject(configPanel.mesh).length > 0;

    if (!draggingSlider && !overConfigButton && !overPanel) {
      // タイトルボタンのホバー処理
      raycaster.setFromCamera(pointer, orthoCamera);
      updateButtonHover(e.clientX, e.clientY);
    } else {
      container.style.cursor = draggingSlider ? 'grabbing' : overConfigButton || overPanel ? 'pointer' : 'default';
    }
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

    // コンフィグパネルが開いている場合
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
          if (id !== 'bgm_slider' && id !== 'se_slider' && id !== 'message_speed_slider') {
            handlePanelAction(action);
          }
        }
        return;
      }
      configPanel.hide();
      return;
    }

    // コンフィグボタン（歯車）クリック
    if (isPointerOverConfigButton(e.clientX, e.clientY)) {
      configPanel.syncDisplayModeFromDocument();
      configPanel.toggle();
      return;
    }

    // タイトル画面のボタンクリック
    raycaster.setFromCamera(pointer, orthoCamera);
    const hits = raycaster.intersectObjects(buttonMeshes);

    if (hits.length > 0) {
      const button = hits[0].object.userData;
      if (button.action) {
        button.action();
      }
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

    // オルソカメラのアスペクト比調整
    const aspect = width / height;
    orthoCamera.left = -aspect;
    orthoCamera.right = aspect;
    orthoCamera.updateProjectionMatrix();

    // ボタングループの位置・スケール更新
    updateButtonGroupTransform(width, height);

    // コンフィグボタンとパネルの更新
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
  
  // 初期化
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
      titleTexture.dispose();
      titleMaterial.dispose();
      titleGeometry.dispose();
      buttonMeshes.forEach(mesh => {
        mesh.geometry.dispose();
        mesh.material.dispose();
      });
      buttonTextures.forEach(({ texture }) => texture.dispose());
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
