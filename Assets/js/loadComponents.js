/**
 * コンポーネント（header, footer）を読み込んで挿入する
 */
async function loadComponent(elementId, path) {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const html = await response.text();
    element.innerHTML = html;
  } catch (err) {
    console.error(`Error loading component ${path}:`, err);
    element.innerHTML = `<!-- ${path} の読み込みに失敗しました -->`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadComponent('header-placeholder', 'components/header.html');
  loadComponent('footer-placeholder', 'components/footer.html');
});
