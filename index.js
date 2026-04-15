const fs = require('fs');
const path = require('path');

let cssContent = '';
let jsContent = '';
let resourcesInjected = false;

try {
  const cssPath = path.join(__dirname, 'assets', 'canvas-doodle.css');
  const jsPath = path.join(__dirname, 'assets', 'canvas-doodle.js');
  cssContent = fs.readFileSync(cssPath, 'utf8');
  jsContent = fs.readFileSync(jsPath, 'utf8');
} catch (e) {
  console.error('hexo-canvas-doodle: Failed to load assets:', e.message);
}

hexo.extend.tag.register('canvas', function(args) {
  const canvasId = args[0] || 'doodle-canvas-' + Math.random().toString(36).substr(2, 9);
  const width = args[1] || '800';
  const height = args[2] || '400';
  
  let resourcesHtml = '';
  if (!resourcesInjected) {
    resourcesInjected = true;
    resourcesHtml = `
<style>
${cssContent}
</style>
<script>
${jsContent}
</script>
`;
  }
  
  const canvasHtml = `
${resourcesHtml}
<div class="hexo-canvas-doodle-container" data-canvas-id="${canvasId}">
  <canvas id="${canvasId}" width="${width}" height="${height}" class="hexo-canvas-doodle"></canvas>
  <div class="hexo-canvas-doodle-controls">
    <button class="hexo-canvas-btn hexo-canvas-clear" data-canvas-id="${canvasId}">清除</button>
    <button class="hexo-canvas-btn hexo-canvas-save" data-canvas-id="${canvasId}">保存</button>
    <button class="hexo-canvas-btn hexo-canvas-load" data-canvas-id="${canvasId}">加载</button>
    <span class="hexo-canvas-status" data-canvas-id="${canvasId}"></span>
  </div>
</div>
`;
  
  return canvasHtml;
}, { ends: false, async: false });
