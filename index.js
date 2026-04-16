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
    <div class="hexo-canvas-control-group">
      <label class="hexo-canvas-label">画笔颜色:</label>
      <input type="color" class="hexo-canvas-color-picker" data-canvas-id="${canvasId}" value="#000000">
    </div>
    <div class="hexo-canvas-control-group">
      <label class="hexo-canvas-label">画笔大小:</label>
      <input type="range" class="hexo-canvas-line-width" data-canvas-id="${canvasId}" min="1" max="20" value="3">
      <span class="hexo-canvas-line-width-value" data-canvas-id="${canvasId}">3px</span>
    </div>
    <button class="hexo-canvas-btn hexo-canvas-clear" data-canvas-id="${canvasId}">清除</button>
    <button class="hexo-canvas-btn hexo-canvas-save" data-canvas-id="${canvasId}">保存</button>
    <button class="hexo-canvas-btn hexo-canvas-load" data-canvas-id="${canvasId}">加载</button>
    <div class="hexo-canvas-control-group hexo-canvas-zoom-controls">
      <label class="hexo-canvas-label">缩放:</label>
      <button class="hexo-canvas-btn hexo-canvas-zoom-out" data-canvas-id="${canvasId}">-</button>
      <span class="hexo-canvas-zoom-level" data-canvas-id="${canvasId}">100%</span>
      <button class="hexo-canvas-btn hexo-canvas-zoom-in" data-canvas-id="${canvasId}">+</button>
      <button class="hexo-canvas-btn hexo-canvas-zoom-reset" data-canvas-id="${canvasId}">重置</button>
    </div>
    <div class="hexo-canvas-control-group hexo-canvas-pan-controls">
      <label class="hexo-canvas-label">移动:</label>
      <button class="hexo-canvas-btn hexo-canvas-pan-up" data-canvas-id="${canvasId}">↑</button>
      <button class="hexo-canvas-btn hexo-canvas-pan-down" data-canvas-id="${canvasId}">↓</button>
      <button class="hexo-canvas-btn hexo-canvas-pan-left" data-canvas-id="${canvasId}">←</button>
      <button class="hexo-canvas-btn hexo-canvas-pan-right" data-canvas-id="${canvasId}">→</button>
    </div>
    <div class="hexo-canvas-control-group hexo-canvas-text-controls">
      <label class="hexo-canvas-label">文本:</label>
      <input type="text" class="hexo-canvas-text-input" data-canvas-id="${canvasId}" placeholder="输入文本...">
      <button class="hexo-canvas-btn hexo-canvas-add-text" data-canvas-id="${canvasId}">添加文本</button>
    </div>
    <span class="hexo-canvas-status" data-canvas-id="${canvasId}"></span>
  </div>
</div>
`;
  
  return canvasHtml;
}, { ends: false, async: false });
