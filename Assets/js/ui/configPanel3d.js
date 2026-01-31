import * as THREE from 'three';
import { getScaledSize } from './screenScale.js';

/** パネルベースサイズ（ベース解像度 1024×576 でのピクセル） */
const BASE_PANEL_WIDTH = 280;
const BASE_PANEL_HEIGHT = 380;

/** クリック可能な領域（ベース座標: 左上原点） */
const BUTTON_RECTS = [
  { id: 'fullscreen', x: 20, y: 52, w: 115, h: 32 },
  { id: 'window', x: 145, y: 52, w: 115, h: 32 },
  { id: 'bgm_slider', x: 20, y: 128, w: 240, h: 20 },
  { id: 'se_slider', x: 20, y: 188, w: 240, h: 20 },
  { id: 'quality_low', x: 20, y: 268, w: 72, h: 32 },
  { id: 'quality_med', x: 104, y: 268, w: 72, h: 32 },
  { id: 'quality_high', x: 188, y: 268, w: 72, h: 32 }
];

/** デフォルト設定状態 */
const DEFAULT_STATE = {
  displayMode: 'window',
  bgmVolume: 80,
  seVolume: 80,
  graphicsQuality: 1
};

/**
 * パネル用 Canvas テクスチャを描画する（解像度に応じてスケール）
 * @param {Object} state - 設定状態
 * @param {number} panelWidth - 表示幅（ピクセル）
 * @param {number} panelHeight - 表示高さ（ピクセル）
 * @returns {THREE.CanvasTexture}
 */
function drawPanelTexture(state, panelWidth, panelHeight) {
  const w = Math.round(panelWidth);
  const h = Math.round(panelHeight);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const scaleX = w / BASE_PANEL_WIDTH;
  const scaleY = h / BASE_PANEL_HEIGHT;
  ctx.scale(scaleX, scaleY);

  const isFullscreen = state.displayMode === 'fullscreen';
  const qualityIdx = state.graphicsQuality;

  ctx.font = '14px "Yu Gothic", "Meiryo", sans-serif';

  ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  roundRect(ctx, 0, 0, BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e0e0e0';
  ctx.font = 'bold 16px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('設定', 16, 14);

  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('表示モード', 20, 38);

  drawButton(ctx, 20, 52, 115, 32, 'フルスクリーン', isFullscreen);
  drawButton(ctx, 145, 52, 115, 32, 'ウィンドウ', !isFullscreen);

  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('BGM', 20, 118);
  drawSlider(ctx, 20, 128, 240, 20, state.bgmVolume);

  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('SE', 20, 178);
  drawSlider(ctx, 20, 188, 240, 20, state.seVolume);

  ctx.fillStyle = '#a0a0a0';
  ctx.fillText('画質', 20, 254);
  drawButton(ctx, 20, 268, 72, 32, '低', qualityIdx === 0);
  drawButton(ctx, 104, 268, 72, 32, '中', qualityIdx === 1);
  drawButton(ctx, 188, 268, 72, 32, '高', qualityIdx === 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawButton(ctx, x, y, w, h, label, active) {
  ctx.fillStyle = active ? 'rgba(232, 213, 183, 0.35)' : 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = active ? 'rgba(232, 213, 183, 0.8)' : 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = active ? '#e8d5b7' : '#e0e0e0';
  ctx.font = '12px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

function drawSmallButton(ctx, x, y, w, h, label) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '14px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
}

/** スライダー描画（0〜100、トラック＋サム） */
function drawSlider(ctx, x, y, w, h, valuePercent) {
  const value = Math.max(0, Math.min(100, valuePercent));
  const thumbRadius = 8;
  const trackPadding = 4;
  const trackY = y + h / 2;
  const trackLeft = x + trackPadding + thumbRadius;
  const trackRight = x + w - trackPadding - thumbRadius;
  const trackW = trackRight - trackLeft;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  const thumbX = trackLeft + (value / 100) * trackW;
  ctx.fillStyle = 'rgba(232, 213, 183, 0.9)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(thumbX, trackY, thumbRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e0e0e0';
  ctx.font = '11px "Yu Gothic", "Meiryo", sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.round(value)), x + w - 4, trackY);
  ctx.textAlign = 'left';
}

/**
 * ヒット座標（パネルローカル -0.5〜0.5）からアクションを取得する
 * @param {THREE.Vector3} localPoint - パネルメッシュのローカル座標
 * @param {number} panelWidth - 現在のパネル幅（スケール後）
 * @param {number} panelHeight - 現在のパネル高さ（スケール後）
 * @returns {string|null} アクション ID または null
 */
/**
 * ヒット座標からアクションを取得。スライダーの場合は { id, value } を返す
 * @returns {string|{ id: string, value: number }|null}
 */
function getActionAtLocal(localPoint, panelWidth, panelHeight, basePanelW, basePanelH) {
  const u = (localPoint.x + 0.5);
  const v = (0.5 - localPoint.y);
  const px = u * panelWidth;
  const py = v * panelHeight;
  const scaleX = panelWidth / basePanelW;
  const scaleY = panelHeight / basePanelH;
  for (const rect of BUTTON_RECTS) {
    const rx = rect.x * scaleX;
    const ry = rect.y * scaleY;
    const rw = rect.w * scaleX;
    const rh = rect.h * scaleY;
    if (px >= rx && px <= rx + rw && py >= ry && py <= ry + rh) {
      if (rect.id === 'bgm_slider' || rect.id === 'se_slider') {
        const t = (px - rx) / rw;
        const value = Math.round(Math.max(0, Math.min(100, t * 100)));
        return { id: rect.id, value };
      }
      return rect.id;
    }
  }
  return null;
}

/**
 * Three.js 上の設定パネル（オースオソグラフィック UI レイヤー）
 * 一般的なゲーム設定項目: 表示モード, BGM/SE 音量, 画質
 * @param {HTMLElement} container - フルスクリーン対象コンテナ
 * @returns {{
 *   panelGroup: THREE.Group,
 *   mesh: THREE.Mesh,
 *   show: () => void,
 *   hide: () => void,
 *   toggle: () => void,
 *   update: (width: number, height: number) => void,
 *   getActionAt: (intersectionPoint: THREE.Vector3) => string|null,
 *   getState: () => Object,
 *   setState: (state: Object) => void,
 *   applyDisplayMode: (container: HTMLElement) => Promise<void>
 * }}
 */
export function createConfigPanel3d(container) {
  const state = { ...DEFAULT_STATE };
  let currentPanelWidth = BASE_PANEL_WIDTH;
  let currentPanelHeight = BASE_PANEL_HEIGHT;

  const panelGroup = new THREE.Group();
  panelGroup.visible = false;

  const geometry = new THREE.PlaneGeometry(1, 1);
  let material = new THREE.MeshBasicMaterial({
    map: drawPanelTexture(state, currentPanelWidth, currentPanelHeight),
    transparent: true,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'configPanel3d';
  panelGroup.add(mesh);

  function redraw() {
    if (material.map) material.map.dispose();
    material.map = drawPanelTexture(state, currentPanelWidth, currentPanelHeight);
    material.map.needsUpdate = true;
  }

  function syncDisplayModeFromDocument() {
    state.displayMode = document.fullscreenElement ? 'fullscreen' : 'window';
    redraw();
  }

  if (container) {
    container.addEventListener('fullscreenchange', syncDisplayModeFromDocument);
    container.addEventListener('webkitfullscreenchange', syncDisplayModeFromDocument);
  }

  function show() {
    panelGroup.visible = true;
  }

  function hide() {
    panelGroup.visible = false;
  }

  function toggle() {
    panelGroup.visible = !panelGroup.visible;
  }

  /**
   * ワールド座標の交点をパネルローカルに変換し、アクションを返す
   * @param {THREE.Vector3} worldPoint - レイとメッシュの交点（ワールド座標）
   * @returns {string|{ id: string, value: number }|null}
   */
  function getActionAt(worldPoint) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    return getActionAtLocal(local, currentPanelWidth, currentPanelHeight, BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT);
  }

  /**
   * ドラッグ用: パネル上のワールド座標からスライダー値（0〜100）を算出する
   * @param {THREE.Vector3} worldPoint - レイとメッシュの交点（ワールド座標）
   * @param {string} sliderId - 'bgm_slider' | 'se_slider'
   * @returns {number} 0〜100
   */
  function getSliderValueFromPoint(worldPoint, sliderId) {
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const local = worldPoint.clone().applyMatrix4(inv);
    const u = (local.x + 0.5);
    const v = (0.5 - local.y);
    const px = u * currentPanelWidth;
    const scaleX = currentPanelWidth / BASE_PANEL_WIDTH;
    const rect = BUTTON_RECTS.find((r) => r.id === sliderId);
    if (!rect) return 0;
    const rx = rect.x * scaleX;
    const rw = rect.w * scaleX;
    const t = (px - rx) / rw;
    return Math.round(Math.max(0, Math.min(100, t * 100)));
  }

  function update(width, height) {
    panelGroup.position.set(0, 0, 0);
    const scaled = getScaledSize(BASE_PANEL_WIDTH, BASE_PANEL_HEIGHT, width, height);
    currentPanelWidth = scaled.width;
    currentPanelHeight = scaled.height;
    mesh.scale.set(currentPanelWidth, currentPanelHeight, 1);
    redraw();
  }

  async function applyDisplayMode(containerElement) {
    if (state.displayMode === 'fullscreen') {
      if (!document.fullscreenElement) {
        await (containerElement.requestFullscreen?.() || containerElement.webkitRequestFullscreen?.());
      }
    } else {
      if (document.fullscreenElement) {
        await (document.exitFullscreen?.() || document.webkitExitFullscreen?.());
      }
    }
    syncDisplayModeFromDocument();
  }

  return {
    panelGroup,
    mesh,
    show,
    hide,
    toggle,
    update,
    getActionAt,
    getSliderValueFromPoint,
    getState: () => ({ ...state }),
    setState: (s) => {
      Object.assign(state, s);
      redraw();
    },
    applyDisplayMode,
    syncDisplayModeFromDocument
  };
}
