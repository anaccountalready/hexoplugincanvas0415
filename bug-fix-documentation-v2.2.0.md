# Hexo Canvas Doodle Bug 修复文档

## 修复版本
- 修复前版本：v2.1.0
- 修复后版本：v2.2.0

## 修复的问题

### Bug #1：画布缩放后可涂鸦范围受限

**问题描述：**
当画布被缩放后，可涂鸦的范围被限制在原始 canvas 元素的边界内。用户期望像 Excalidraw 一样，缩放后整个视口区域仍然都可以绘画，可涂鸦的范围是"无限"的。

**问题根源：**
1. **事件监听器绑定位置错误**：事件监听器绑定在 `canvas` 元素上，而 canvas 应用了 CSS transform。CSS transform 只改变视觉显示，不改变元素的实际边界和事件触发区域。当 canvas 被缩小时，事件触发区域也随之缩小。

2. **坐标系统不完整**：世界坐标与离屏 Canvas 坐标之间没有正确的映射。`getMousePositionOnCanvas` 返回的世界坐标可以是任意值（包括负数），但 `offscreenCanvas` 只支持 `[0, width]` 范围的坐标。

### Bug #2：画布缩放后鼠标位置与实际绘画位置不一致

**问题描述：**
当画布被缩放后，十字鼠标指针的位置与实际笔迹的位置不一致，两者相隔较远。

**问题根源：**
1. **CSS transform 与坐标计算冲突**：之前使用 `canvas.style.transform` 来应用缩放和平移，但 `getBoundingClientRect()` 和鼠标事件坐标不考虑 CSS transform。

2. **坐标转换错误**：在 `syncToDisplayCanvas` 中，从 `offscreenCanvas` 读取和绘制时使用了错误的坐标转换。

3. **负坐标无法绘制**：当世界坐标为负数时（例如 `cameraX > 0` 时），直接绘制到 `offscreenCanvas` 会画在画布外面。

## 修复方案

### 方案一：事件绑定位置调整

**修改内容：**
将所有事件监听器从 `canvas` 元素移到 `viewport` 容器上。

**代码位置：**
```javascript
// 之前：canvas.addEventListener('mousedown', startDrawing);
// 之后：viewport.addEventListener('mousedown', startDrawing);
```
文件：`canvas-doodle.js:681-700`

### 方案二：移除 CSS transform，使用 Canvas Context 手动变换

**修改内容：**
移除 `canvas.style.transform` 的设置，改用 `ctx.translate()` 和 `ctx.scale()` 在渲染时手动应用相机变换。

**代码位置：**
```javascript
// 之前：
function applyCameraTransform() {
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`;
  updateMinimap();
}

// 之后：
function applyCameraTransform() {
  updateMinimap();
}

// 在 syncToDisplayCanvas 中：
ctx.save();
ctx.translate(cameraX, cameraY);
ctx.scale(cameraZoom, cameraZoom);
// ... 绘制逻辑
ctx.restore();
```
文件：`canvas-doodle.js:65-67`, `canvas-doodle.js:186-190`, `canvas-doodle.js:217`

### 方案三：引入世界坐标偏移量系统

**修改内容：**
引入 `worldOffsetX/Y` 变量，表示离屏 Canvas 的 `(0, 0)` 对应的世界坐标。添加 `worldToScreen` 和 `screenToWorld` 辅助函数。

**代码位置：**
```javascript
// 新增常量
const WORLD_OFFSET_INITIAL = 10000;
const INFINITE_CANVAS_INITIAL_SIZE = 20000;

// 新增变量
let worldOffsetX = WORLD_OFFSET_INITIAL;
let worldOffsetY = WORLD_OFFSET_INITIAL;

// 新增辅助函数
function worldToScreen(worldX, worldY) {
  return {
    x: worldX - worldOffsetX,
    y: worldY - worldOffsetY
  };
}

function screenToWorld(screenX, screenY) {
  return {
    x: screenX + worldOffsetX,
    y: screenY + worldOffsetY
  };
}
```
文件：`canvas-doodle.js:9-10`, `canvas-doodle.js:42-43`, `canvas-doodle.js:69-81`

### 方案四：重写 `ensureCanvasSize` 函数

**修改内容：**
重写边界检测逻辑，使用离屏坐标进行检测，并在扩展时正确调整 `worldOffsetX/Y`。

**代码位置：**
```javascript
function ensureCanvasSize(worldX, worldY) {
  const padding = 500;
  const screenPos = worldToScreen(worldX, worldY);
  
  let needsResize = false;
  let expandLeft = false;
  let expandRight = false;
  let expandTop = false;
  let expandBottom = false;
  
  if (screenPos.x < padding) {
    needsResize = true;
    expandLeft = true;
  }
  if (screenPos.x > offscreenCanvas.width - padding) {
    needsResize = true;
    expandRight = true;
  }
  // ... 类似的 y 轴检测
  
  if (!needsResize) return;
  
  // 扩展逻辑
  if (expandLeft) {
    newWidth = currentWidth * 2;
    offsetX = currentWidth;
    worldOffsetX -= currentWidth;  // 调整偏移量
  }
  // ...
}
```
文件：`canvas-doodle.js:83-150`

### 方案五：重写 `syncToDisplayCanvas` 函数

**修改内容：**
正确计算可见区域的世界坐标，转换为离屏坐标后从 `offscreenCanvas` 读取。

**代码位置：**
```javascript
function syncToDisplayCanvas() {
  // ...
  
  ctx.save();
  ctx.translate(cameraX, cameraY);
  ctx.scale(cameraZoom, cameraZoom);
  
  const visibleMinWorldX = (-cameraX) / cameraZoom;
  const visibleMinWorldY = (-cameraY) / cameraZoom;
  const visibleMaxWorldX = visibleMinWorldX + viewportWidth / cameraZoom;
  const visibleMaxWorldY = visibleMinWorldY + viewportHeight / cameraZoom;
  
  const visibleMinScreen = worldToScreen(visibleMinWorldX, visibleMinWorldY);
  const visibleMaxScreen = worldToScreen(visibleMaxWorldX, visibleMaxWorldY);
  
  const srcMinX = Math.max(0, Math.floor(visibleMinScreen.x));
  const srcMinY = Math.max(0, Math.floor(visibleMinScreen.y));
  // ...
  
  if (srcWidth > 0 && srcHeight > 0 && ...) {
    const destWorldMin = screenToWorld(srcMinX, srcMinY);
    
    ctx.drawImage(
      offscreenCanvas,
      srcMinX, srcMinY, srcWidth, srcHeight,
      destWorldMin.x, destWorldMin.y, srcWidth, srcHeight
    );
  }
  
  ctx.restore();
}
```
文件：`canvas-doodle.js:170-218`

### 方案六：修改绘制函数的坐标转换

**修改内容：**
在 `draw` 函数和 `startDrawing` 中的文本添加逻辑中，将世界坐标转换为离屏坐标再绘制。

**代码位置：**
```javascript
// draw 函数中
const lastScreenPos = worldToScreen(lastCanvasX, lastCanvasY);
const screenPos = worldToScreen(pos.x, pos.y);

offscreenCtx.moveTo(lastScreenPos.x, lastScreenPos.y);
offscreenCtx.lineTo(screenPos.x, screenPos.y);

// startDrawing 中的文本添加
const screenPos = worldToScreen(pos.x, pos.y);
offscreenCtx.fillText(textToAdd, screenPos.x, screenPos.y);
```
文件：`canvas-doodle.js:520-531`, `canvas-doodle.js:440-445`

### 方案七：修改 `loadCanvas` 函数

**修改内容：**
添加 `getWorldOffset` 方法，在加载画布时正确将离屏坐标转换为世界坐标。

**代码位置：**
```javascript
// 在 canvases[canvasId] 中添加
getWorldOffset: function() {
  return { x: worldOffsetX, y: worldOffsetY };
}

// 在 loadCanvas 中
const worldOffset = canvasData.getWorldOffset();
const worldX1 = offsetX + worldOffset.x;
const worldY1 = offsetY + worldOffset.y;
const worldX2 = offsetX + img.width + worldOffset.x;
const worldY2 = offsetY + img.height + worldOffset.y;

canvasData.updateContentBounds(worldX1, worldY1);
canvasData.updateContentBounds(worldX2, worldY2);
```
文件：`canvas-doodle.js:724-726`, `canvas-doodle.js:895-910`

## 坐标系统说明

修复后引入了三层坐标系统：

### 1. 视口坐标
- 鼠标相对于 `viewport` 元素的位置
- 范围：`[0, viewportWidth]` x `[0, viewportHeight]`

### 2. 世界坐标
- 在无限画布上的抽象坐标
- 可以是任意值（包括负数）
- 转换公式：`worldX = (viewportX - cameraX) / cameraZoom`

### 3. 离屏坐标
- 在 `offscreenCanvas` 上的实际坐标
- 范围：`[0, width]` x `[0, height]`
- 转换公式：`screenX = worldX - worldOffsetX`

### 世界坐标偏移量
- `worldOffsetX`：离屏 Canvas 的 `(0, 0)` 对应的世界 X 坐标
- `worldOffsetY`：离屏 Canvas 的 `(0, 0)` 对应的世界 Y 坐标
- 初始值：`10000`（使初始视口位于离屏 Canvas 中心附近）

## 测试建议

测试场景：
1. **缩放后绘制**：将画布缩小到 50%，在视口边缘绘制，验证可绘制范围
2. **鼠标位置对齐**：在不同缩放级别下，绘制点验证鼠标指针与笔迹是否重合
3. **负坐标绘制**：平移画布使原视口左上方区域可见，然后在该区域绘制
4. **无限扩展**：持续向一个方向绘制，观察画布是否自动扩展
5. **迷你地图**：缩放和平移后，观察迷你地图中的视口指示器位置是否正确
6. **保存/加载**：绘制复杂图形后保存，刷新页面后加载，验证坐标是否正确

## 文件说明

- `hexo-canvas-doodle-v2.2.0.js`：修复后的完整脚本文件，可直接复制到 Hexo 的 `source/js/` 目录下
- `canvas-doodle.js`：开发环境使用的脚本文件（位于 `assets/` 目录）

## 升级说明

1. 备份旧版本的 `hexo-canvas-doodle-v2.1.0.js`
2. 将 `hexo-canvas-doodle-v2.2.0.js` 复制到 Hexo 的 `source/js/` 目录
3. 更新页面中引用的脚本文件名（如果有硬编码版本号）
4. 清除浏览器缓存后测试

## 注意事项

- 世界坐标偏移量初始值为 `10000`，离屏 Canvas 初始大小为 `20000x20000`，确保初始视口位于中心附近
- 每次扩展画布时，尺寸翻倍并调整偏移量，避免频繁重分配
- 迷你地图使用世界坐标计算，确保在缩放和平移时显示正确
