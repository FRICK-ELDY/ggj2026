import { createTitleScene } from './titleScene.js';
import { createGameScene } from './gameScene.js';

// キャンバス取得
const canvas = document.getElementById('game-canvas');
const container = document.getElementById('game-container');

// 現在のシーン
let currentScene = null;

/**
 * シーン変更関数
 * @param {string} sceneName - 変更先のシーン名 ('title' | 'game')
 */
async function changeScene(sceneName) {
  // 現在のシーンを停止・破棄
  if (currentScene) {
    currentScene.dispose();
    currentScene = null;
  }

  // 新しいシーンを作成・開始
  if (sceneName === 'title') {
    currentScene = await createTitleScene(canvas, container, changeScene);
    currentScene.start();
  } else if (sceneName === 'game') {
    currentScene = await createGameScene(canvas, container, changeScene);
    currentScene.start();
  } else {
    console.error(`Unknown scene: ${sceneName}`);
  }
}

// 初期シーンをタイトルに設定
changeScene('title');
