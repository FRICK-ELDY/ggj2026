// 効果音（SE）の簡易ユーティリティ
// - 事前にカーソル移動音をプリロード
// - 音量は 0..100(%) を 0..1 に正規化して適用

let seVolume = 0.8; // 0.0..1.0

const hoverBaseAudio = new Audio('Assets/sound/se/move_cursor_12.mp3');
hoverBaseAudio.preload = 'auto';

/**
 * SE音量をパーセントで設定（0..100）
 * @param {number} percent
 */
export function setSeVolumePercent(percent) {
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  seVolume = clamped / 100;
}

/**
 * ホバー音を再生（同時再生に対応するため cloneNode を利用）
 */
export function playHover() {
  try {
    const a = hoverBaseAudio.cloneNode(true);
    a.volume = seVolume;
    a.currentTime = 0;
    // 再生エラーは握り潰してUI操作をブロックしない
    a.play().catch(() => {});
  } catch {
    // no-op
  }
}


