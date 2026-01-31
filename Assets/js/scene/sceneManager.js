import { createTitleScene } from './titleScene.js';
import { createIntroScene } from './introScene.js';
import { createGameScene } from './gameScene.js';

/**
 * シーンマネージャー
 * シーンの切り替えとライフサイクル管理を担当
 */
export class SceneManager {
  /**
   * @param {HTMLCanvasElement} canvas - レンダリング対象のキャンバス
   * @param {HTMLElement} container - ゲームコンテナ
   */
  constructor(canvas, container) {
    this.canvas = canvas;
    this.container = container;
    this.currentScene = null;
    this.currentSceneName = null;
    
    // グローバルなコンフィグ状態（シーン間で共有）
    this.configState = {
      displayMode: 'window',
      bgmVolume: 80,
      seVolume: 80,
      messageSpeed: 80,
    };
  }

  /**
   * コンフィグ状態を取得
   * @returns {Object}
   */
  getConfigState() {
    return { ...this.configState };
  }

  /**
   * コンフィグ状態を更新
   * @param {Object} newState
   */
  updateConfigState(newState) {
    Object.assign(this.configState, newState);
  }

  /**
   * シーンを変更する
   * @param {string} sceneName - 変更先のシーン名 ('title' | 'intro' | 'game')
   */
  async changeScene(sceneName) {
    // 現在のシーンを停止・破棄
    if (this.currentScene) {
      console.log(`Disposing scene: ${this.currentSceneName}`);
      this.currentScene.dispose();
      this.currentScene = null;
      this.currentSceneName = null;
    }

    // 新しいシーンを作成・開始
    console.log(`Loading scene: ${sceneName}`);
    
    try {
      if (sceneName === 'title') {
        this.currentScene = await createTitleScene(
          this.canvas,
          this.container,
          (nextScene) => this.changeScene(nextScene),
          (newState) => this.updateConfigState(newState)
        );
        this.currentSceneName = 'title';
      } else if (sceneName === 'intro') {
        this.currentScene = createIntroScene(
          this.canvas,
          this.container,
          (nextScene) => this.changeScene(nextScene),
          this.getConfigState()
        );
        this.currentSceneName = 'intro';
      } else if (sceneName === 'game') {
        this.currentScene = await createGameScene(
          this.canvas,
          this.container,
          (nextScene) => this.changeScene(nextScene),
          (newState) => this.updateConfigState(newState)
        );
        this.currentSceneName = 'game';
      } else {
        throw new Error(`Unknown scene: ${sceneName}`);
      }

      this.currentScene.start();
      console.log(`Scene loaded: ${sceneName}`);
    } catch (error) {
      console.error(`Failed to load scene: ${sceneName}`, error);
    }
  }

  /**
   * 現在のシーン名を取得
   * @returns {string|null}
   */
  getCurrentSceneName() {
    return this.currentSceneName;
  }

  /**
   * シーンマネージャーを破棄
   */
  dispose() {
    if (this.currentScene) {
      this.currentScene.dispose();
      this.currentScene = null;
      this.currentSceneName = null;
    }
  }
}
