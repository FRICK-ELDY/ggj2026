import { SceneManager } from './scene/sceneManager.js';

/**
 * アプリケーションのエントリーポイント
 */
(function main() {
  // DOM要素の取得
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  // 要素の存在確認
  if (!canvas) {
    console.error('Canvas element not found: #game-canvas');
    return;
  }

  if (!container) {
    console.error('Container element not found: #game-container');
    return;
  }

  // シーンマネージャーの初期化
  const sceneManager = new SceneManager(canvas, container);

  // 初期シーンをタイトルに設定
  sceneManager.changeScene('title');

  // グローバルに公開（デバッグ用）
  if (typeof window !== 'undefined') {
    window.sceneManager = sceneManager;
  }
})();
