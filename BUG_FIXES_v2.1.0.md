# Hexo Canvas Doodle Bug 修复文档

## 修复版本
- 版本：v2.1.0
- 日期：2026-04-18
- 修复问题：2个

---

## 一、修复的 Bug 列表

### Bug #1: 画布缩放后可涂鸦范围受限

**问题描述：**
画布缩放后，可涂鸦的范围被限制在原来的canvas元素边界内。当缩小画布时，鼠标在canvas元素外的区域无法触发绘制事件；当放大画布时，只有部分区域可以绘制。

**期望行为：**
像 Excalidraw 一样，无论如何缩放，整个视口区域都应该可以绘画，可涂鸦的范围是"无限"的。

---

### Bug #2: 画布缩放后鼠标位置与实际绘画位置不一致

**问题描述：**
当画布缩放后，鼠标点击的位置与实际绘制的位置存在偏移。例如：
- 缩放到 50% 时，绘制位置在鼠标位置的左上方
- 缩放到 200% 时，绘制位置在鼠标位置的右下方

**期望行为：**
无论缩放比例如何，鼠标点击的位置应该与实际绘制的位置完全一致。

---

## 二、问题根因分析

### 2.1 Bug #1 根因：事件绑定在 canvas 元素上

**问题代码：**
```javascript
// 旧代码 - 事件绑定在 canvas 元素上
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('wheel', handleWheel, { passive: false });
```

**问题分析：**

```
┌─────────────────────────────────────────────────────────┐
│                    视口 (Viewport)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                   │    │
│  │              缩放后的 canvas 元素                │    │
│  │              (应用了 CSS transform)              │    │
│  │                                                   │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │                                         │    │    │
│  │  │    ❌ 只有这个区域可以触发事件          │    │    │
│  │  │                                         │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  │                                                   │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ❌ 视口内其他区域无法触发事件                          │
└─────────────────────────────────────────────────────────┘
```

**根本原因：**
1. CSS transform 只改变视觉显示，不改变元素的实际边界
2. 事件监听器绑定在 `canvas` 元素上，只有鼠标在 canvas 元素的原始边界内才会触发事件
3. 缩放后，canvas 元素的实际边界与视觉显示不一致

---

### 2.2 Bug #2 根因：坐标计算使用了错误的参考系

**问题代码：**
```javascript
// 旧代码 - 使用 canvas.getBoundingClientRect()
function getMousePositionOnCanvas(e) {
  const rect = canvas.getBoundingClientRect();  // ❌ 错误的参考系
  
  const relativeX = e.clientX - rect.left;
  const relativeY = e.clientY - rect.top;
  
  const canvasX = (relativeX - cameraX) / cameraZoom;
  const canvasY = (relativeY - cameraY) / cameraZoom;
  
  return { x: canvasX, y: canvasY };
}
```

**问题分析：**

CSS transform 对 `getBoundingClientRect()` 的影响：

```
原始 canvas (800x400, 未缩放):
┌─────────────────────────────────────────┐
│ 左上角: (100, 100)                      │
│ 右下角: (900, 500)                       │
│ getBoundingClientRect():                 │
│   { left: 100, top: 100,                │
│     width: 800, height: 400 }            │
└─────────────────────────────────────────┘

缩放 50% 后 (cameraZoom = 0.5):
┌───────────────────┐
│ 左上角: (100, 100)│
│ 右下角: (500, 300)│
│ getBoundingClientRect():
│   { left: 100, top: 100,
│     width: 400, height: 200 }  ← ❌ 已经是缩放后的尺寸！
└───────────────────┘
```

**坐标转换错误示例：**

假设：
- 视口和 canvas 左上角都在屏幕坐标 (100, 100)
- cameraZoom = 0.5 (缩小 50%)
- cameraX = 0, cameraY = 0
- 鼠标点击屏幕坐标 (200, 200)

**旧代码计算：**
```javascript
rect = canvas.getBoundingClientRect();  // { left: 100, top: 100, width: 400, height: 200 }
relativeX = 200 - 100 = 100;
relativeY = 200 - 100 = 100;

canvasX = (100 - 0) / 0.5 = 200;  // ❌ 错误！
canvasY = (100 - 0) / 0.5 = 200;  // ❌ 错误！
```

**正确计算应该是：**
```javascript
rect = viewport.getBoundingClientRect();  // { left: 100, top: 100, width: 800, height: 400 }
relativeX = 200 - 100 = 100;
relativeY = 200 - 100 = 100;

canvasX = (100 - 0) / 0.5 = 200;  // ✅ 正确！
canvasY = (100 - 0) / 0.5 = 200;  // ✅ 正确！
```

等等，这里结果看起来一样？让我再仔细分析...

实际上，问题在于：
1. 当 canvas 应用了 CSS transform 后，`getBoundingClientRect()` 返回的是变换后的边界
2. 但我们的坐标转换公式 `(relativeX - cameraX) / cameraZoom` 假设的是变换前的坐标
3. 这就导致了双重缩放的问题

**更准确的问题分析：**

CSS transform 的顺序是：`translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`

这意味着：
1. 先缩放 canvas (scale)
2. 再平移 (translate)

`getBoundingClientRect()` 返回的是最终的视觉位置和大小。

但我们的坐标转换逻辑是：
```javascript
// 假设：
// screenX = cameraX + worldX * cameraZoom
// 所以：worldX = (screenX - cameraX) / cameraZoom
```

这里的 `screenX` 应该是相对于视口的坐标，而不是相对于变换后的 canvas 元素的坐标。

**正确的参考系：**

```
坐标系关系：
┌─────────────────────────────────────────────────────────────┐
│  屏幕坐标系 (Screen Coordinates)                              │
│  (以屏幕左上角为原点)                                          │
│                                                              │
│      ┌─────────────────────────────────────────┐            │
│      │  视口坐标系 (Viewport Coordinates)       │            │
│      │  (以视口左上角为原点)                    │            │
│      │                                         │            │
│      │  ┌─────────────────────────────────┐    │            │
│      │  │  世界坐标系 (World Coordinates) │    │            │
│      │  │  (canvas 的原始坐标)             │    │            │
│      │  │                                 │    │            │
│      │  │  变换公式：                      │    │            │
│      │  │  viewportX = cameraX +         │    │            │
│      │  │            worldX * cameraZoom  │    │            │
│      │  │                                 │    │            │
│      │  │  worldX = (viewportX -         │    │            │
│      │  │           cameraX) / cameraZoom │    │            │
│      │  └─────────────────────────────────┘    │            │
│      └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

**关键洞察：**
- 坐标转换应该基于 **视口坐标系**，而不是 **canvas 元素坐标系**
- 视口没有应用任何 CSS transform，所以 `viewport.getBoundingClientRect()` 总是准确的
- canvas 应用了 CSS transform，所以 `canvas.getBoundingClientRect()` 返回的是变换后的结果

---

## 三、修复方案

### 3.1 修复方案概述

| 修复项 | 修改内容 | 文件位置 |
|--------|----------|----------|
| 事件绑定 | 从 `canvas` 改为 `viewport` | `canvas-doodle.js:606-625` |
| 坐标计算 | 从 `canvas.getBoundingClientRect()` 改为 `viewport.getBoundingClientRect()` | 多处 |
| 光标设置 | 从 `canvas.style.cursor` 改为 `viewport.style.cursor` | `canvas-doodle.js:350-360` |
| 显示同步 | 修复 `syncToDisplayCanvas()` 中的视口大小获取 | `canvas-doodle.js:125-154` |
| 迷你地图 | 修复 `updateMinimap()` 中的视口大小获取 | `canvas-doodle.js:207-271` |
| 导航函数 | 修复 `navigateMinimap()` 中的视口大小获取 | `canvas-doodle.js:291-320` |

---

### 3.2 详细修改说明

#### 修改 1: 事件绑定

**修改前：**
```javascript
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('wheel', handleWheel, { passive: false });

// 触摸事件也绑定在 canvas 上
canvas.addEventListener('touchstart', ...);
canvas.addEventListener('touchmove', ...);
canvas.addEventListener('touchend', ...);
```

**修改后：**
```javascript
viewport.addEventListener('mousedown', startDrawing);
viewport.addEventListener('mousemove', draw);
viewport.addEventListener('mouseup', stopDrawing);
viewport.addEventListener('mouseleave', stopDrawing);  // 注意：mouseout 改为 mouseleave

viewport.addEventListener('wheel', handleWheel, { passive: false });

// 触摸事件也绑定在 viewport 上
viewport.addEventListener('touchstart', ...);
viewport.addEventListener('touchmove', ...);
viewport.addEventListener('touchend', ...);
```

**修改说明：**
- 将所有事件监听器从 `canvas` 移到 `viewport`
- `mouseout` 改为 `mouseleave`，因为 `mouseleave` 不会冒泡，更适合容器元素
- 这样整个视口区域都可以触发事件，实现"无限"绘制区域

---

#### 修改 2: `getMousePositionOnCanvas()` 函数

**修改前：**
```javascript
function getMousePositionOnCanvas(e) {
  const rect = canvas.getBoundingClientRect();  // ❌ 错误
  
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  
  const canvasX = (relativeX - cameraX) / cameraZoom;
  const canvasY = (relativeY - cameraY) / cameraZoom;
  
  return { x: canvasX, y: canvasY };
}
```

**修改后：**
```javascript
function getMousePositionOnCanvas(e) {
  const rect = viewport.getBoundingClientRect();  // ✅ 正确
  
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  
  const canvasX = (relativeX - cameraX) / cameraZoom;
  const canvasY = (relativeY - cameraY) / cameraZoom;
  
  return { x: canvasX, y: canvasY };
}
```

---

#### 修改 3: `handleWheel()` 函数

**修改前：**
```javascript
function handleWheel(e) {
  e.preventDefault();
  
  const rect = canvas.getBoundingClientRect();  // ❌ 错误
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // ... 缩放逻辑
}
```

**修改后：**
```javascript
function handleWheel(e) {
  e.preventDefault();
  
  const rect = viewport.getBoundingClientRect();  // ✅ 正确
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // ... 缩放逻辑
  
  // 新增：同步显示画布
  syncToDisplayCanvas();
}
```

---

#### 修改 4: `zoomIn()` 和 `zoomOut()` 函数

**修改前：**
```javascript
function zoomIn() {
  const rect = canvas.getBoundingClientRect();  // ❌ 错误
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // ... 缩放逻辑
}

function zoomOut() {
  const rect = canvas.getBoundingClientRect();  // ❌ 错误
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // ... 缩放逻辑
}
```

**修改后：**
```javascript
function zoomIn() {
  const rect = viewport.getBoundingClientRect();  // ✅ 正确
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // ... 缩放逻辑
}

function zoomOut() {
  const rect = viewport.getBoundingClientRect();  // ✅ 正确
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // ... 缩放逻辑
}
```

---

#### 修改 5: `updateCursor()` 函数

**修改前：**
```javascript
function updateCursor() {
  if (isPanning) {
    canvas.style.cursor = 'grabbing';      // ❌ 错误
  } else if (isAddingText) {
    canvas.style.cursor = 'text';          // ❌ 错误
  } else if (spaceKeyPressed) {
    canvas.style.cursor = 'grab';           // ❌ 错误
  } else {
    canvas.style.cursor = 'crosshair';      // ❌ 错误
  }
}
```

**修改后：**
```javascript
function updateCursor() {
  if (isPanning) {
    viewport.style.cursor = 'grabbing';    // ✅ 正确
  } else if (isAddingText) {
    viewport.style.cursor = 'text';        // ✅ 正确
  } else if (spaceKeyPressed) {
    viewport.style.cursor = 'grab';         // ✅ 正确
  } else {
    viewport.style.cursor = 'crosshair';    // ✅ 正确
  }
}
```

---

#### 修改 6: `syncToDisplayCanvas()` 函数

**修改前：**
```javascript
function syncToDisplayCanvas() {
  const rect = canvas.getBoundingClientRect();  // ❌ 错误
  const viewportWidth = rect.width;
  const viewportHeight = rect.height;
  
  // ... 同步逻辑
}
```

**修改后：**
```javascript
function syncToDisplayCanvas() {
  const rect = viewport.getBoundingClientRect();  // ✅ 正确
  const viewportWidth = rect.width;
  const viewportHeight = rect.height;
  
  // ... 同步逻辑
}
```

---

#### 修改 7: `updateMinimap()` 函数

**修改前：**
```javascript
function updateMinimap() {
  // ... 迷你地图绘制逻辑
  
  const rect = canvas.getBoundingClientRect();  // ❌ 错误
  const viewportWidth = rect.width;
  const viewportHeight = rect.height;
  
  // ... 视口指示器绘制
}
```

**修改后：**
```javascript
function updateMinimap() {
  // ... 迷你地图绘制逻辑
  
  const viewportRect = viewport.getBoundingClientRect();  // ✅ 正确
  const viewportWidth = viewportRect.width;
  const viewportHeight = viewportRect.height;
  
  // ... 视口指示器绘制
}
```

---

#### 修改 8: `navigateMinimap()` 函数

**修改前：**
```javascript
function navigateMinimap(e) {
  // ... 导航逻辑
  
  const viewportRect = canvas.getBoundingClientRect();  // ❌ 错误
  const viewportWidth = viewportRect.width;
  const viewportHeight = viewportRect.height;
  
  // ... 相机位置计算
}
```

**修改后：**
```javascript
function navigateMinimap(e) {
  // ... 导航逻辑
  
  const viewportRect = viewport.getBoundingClientRect();  // ✅ 正确
  const viewportWidth = viewportRect.width;
  const viewportHeight = viewportRect.height;
  
  // ... 相机位置计算
}
```

---

## 四、修复后的代码结构

### 4.1 关键变量

```javascript
function initCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  const container = canvas.closest('.hexo-canvas-doodle-container');
  const viewport = canvas.closest('.hexo-canvas-viewport');  // ✅ 新增：获取视口元素
  const ctx = canvas.getContext('2d');
  
  // ... 其他变量
}
```

### 4.2 事件绑定

```javascript
// ✅ 所有事件绑定在 viewport 上
viewport.addEventListener('mousedown', startDrawing);
viewport.addEventListener('mousemove', draw);
viewport.addEventListener('mouseup', stopDrawing);
viewport.addEventListener('mouseleave', stopDrawing);

viewport.addEventListener('wheel', handleWheel, { passive: false });

viewport.addEventListener('touchstart', function(e) { ... });
viewport.addEventListener('touchmove', function(e) { ... });
viewport.addEventListener('touchend', stopDrawing);
```

### 4.3 坐标计算

```javascript
// ✅ 所有坐标计算都使用 viewport.getBoundingClientRect()
function getMousePositionOnCanvas(e) {
  const rect = viewport.getBoundingClientRect();
  // ... 计算逻辑
}

function handleWheel(e) {
  const rect = viewport.getBoundingClientRect();
  // ... 计算逻辑
}

function zoomIn() {
  const rect = viewport.getBoundingClientRect();
  // ... 计算逻辑
}

function syncToDisplayCanvas() {
  const rect = viewport.getBoundingClientRect();
  // ... 计算逻辑
}
```

---

## 五、测试用例

### 5.1 Bug #1 测试用例

| 测试场景 | 操作步骤 | 预期结果 | 实际结果 |
|----------|----------|----------|----------|
| 缩小后绘制 | 1. 缩放到 50%<br>2. 在视口边缘绘制 | 整个视口都可以绘制 | ✅ 已修复 |
| 放大后绘制 | 1. 缩放到 200%<br>2. 在视口各处绘制 | 整个视口都可以绘制 | ✅ 已修复 |
| 平移后绘制 | 1. 平移画布到一侧<br>2. 在空白区域绘制 | 空白区域也可以绘制 | ✅ 已修复 |
| 视口边缘测试 | 1. 在视口左上角 10px 处绘制<br>2. 在视口右下角 10px 处绘制 | 边缘位置都可以绘制 | ✅ 已修复 |

### 5.2 Bug #2 测试用例

| 测试场景 | 操作步骤 | 预期结果 | 实际结果 |
|----------|----------|----------|----------|
| 100% 缩放 | 1. 重置缩放<br>2. 在 (100, 100) 处点击绘制 | 线条从 (100, 100) 开始 | ✅ 已修复 |
| 50% 缩放 | 1. 缩放到 50%<br>2. 在视口 (100, 100) 处点击绘制 | 线条从世界坐标对应位置开始 | ✅ 已修复 |
| 200% 缩放 | 1. 缩放到 200%<br>2. 在视口 (100, 100) 处点击绘制 | 线条从世界坐标对应位置开始 | ✅ 已修复 |
| 平移后绘制 | 1. 平移画布 (cameraX=100, cameraY=100)<br>2. 在视口 (0, 0) 处点击 | 线条从世界坐标 (-100, -100) 开始 | ✅ 已修复 |
| 缩放中心点测试 | 1. 将鼠标放在视口中心<br>2. 滚动滚轮缩放 | 以鼠标位置为中心缩放 | ✅ 已修复 |

---

## 六、文件清单

### 6.1 修改的文件

| 文件路径 | 修改类型 | 修改内容 |
|----------|----------|----------|
| `assets/canvas-doodle.js` | 核心修复 | 事件绑定、坐标计算、光标设置等 |

### 6.2 新增的文件

| 文件路径 | 用途 |
|----------|------|
| `hexo-canvas-doodle-v2.1.0.js` | 可直接复制到 Hexo 的完整脚本 |

---

## 七、部署说明

### 7.1 方式一：直接使用打包好的文件

1. 将 `hexo-canvas-doodle-v2.1.0.js` 复制到 Hexo 博客的 `source/js/` 目录
2. 在需要使用的页面中引入：
   ```html
   <script src="/js/hexo-canvas-doodle-v2.1.0.js"></script>
   ```

### 7.2 方式二：使用源文件

1. 将 `assets/canvas-doodle.js` 和 `assets/canvas-doodle.css` 复制到 Hexo 博客
2. 在页面中引入：
   ```html
   <link rel="stylesheet" href="/path/to/canvas-doodle.css">
   <script src="/path/to/canvas-doodle.js"></script>
   ```

### 7.3 HTML 结构要求

确保 HTML 结构如下：
```html
<div class="hexo-canvas-doodle-container" data-canvas-id="my-canvas">
  <div class="hexo-canvas-viewport" style="width: 800px; max-width: 100%;">
    <canvas id="my-canvas" width="800" height="400" class="hexo-canvas-doodle"></canvas>
  </div>
  <!-- 控制按钮... -->
</div>
```

**关键要求：**
- `<canvas>` 元素必须有 `id` 属性
- `<canvas>` 必须包裹在 `class="hexo-canvas-viewport"` 的容器中
- viewport 必须包裹在 `class="hexo-canvas-doodle-container"` 的容器中

---

## 八、版本对比

### v2.0.0 vs v2.1.0

| 功能 | v2.0.0 | v2.1.0 |
|------|--------|--------|
| 无限画布 | ✅ 支持 | ✅ 支持 |
| 迷你地图 | ✅ 支持 | ✅ 支持 |
| 缩放后可绘制区域 | ❌ 受限 | ✅ 整个视口 |
| 缩放后鼠标位置 | ❌ 偏移 | ✅ 准确 |
| 事件绑定 | canvas 元素 | viewport 容器 |
| 坐标计算参考系 | canvas 边界 | viewport 边界 |

---

## 九、技术总结

### 9.1 核心问题

这两个 bug 的根本原因都是 **参考系选择错误**：

1. **事件绑定**：应该绑定在视口容器上，而不是 canvas 元素上
2. **坐标计算**：应该使用视口的边界作为参考系，而不是变换后的 canvas 边界

### 9.2 关键概念

**CSS transform 的特性：**
- 只改变视觉显示，不改变元素的实际边界
- `getBoundingClientRect()` 返回的是变换后的视觉边界
- 事件触发区域是元素的原始边界，不是视觉边界

**正确的架构：**
```
┌─────────────────────────────────────────────────────────────┐
│                    Viewport (视口容器)                       │
│  - 事件绑定在这里                                             │
│  - 坐标计算参考系                                             │
│  - 光标样式设置在这里                                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Canvas (画布元素)                        │    │
│  │  - 应用 CSS transform (translate + scale)            │    │
│  │  - 只负责显示，不负责事件                              │    │
│  │  - 绘制到离屏 canvas，再同步到这里                    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 坐标转换公式

**正确的坐标转换：**
```
视口坐标 → 世界坐标：
worldX = (viewportX - cameraX) / cameraZoom
worldY = (viewportY - cameraY) / cameraZoom

世界坐标 → 视口坐标：
viewportX = cameraX + worldX * cameraZoom
viewportY = cameraY + worldY * cameraZoom
```

**其中：**
- `viewportX`, `viewportY`：鼠标相对于视口左上角的坐标
- `worldX`, `worldY`：canvas 上的实际坐标（世界坐标）
- `cameraX`, `cameraY`：相机平移偏移
- `cameraZoom`：相机缩放比例

---

## 十、附录

### 附录 A：修改位置速查

| 函数名 | 原代码行 | 修改内容 |
|--------|----------|----------|
| `getMousePositionOnCanvas()` | 322-341 | `canvas` → `viewport` |
| `updateCursor()` | 350-360 | `canvas.style.cursor` → `viewport.style.cursor` |
| `handleWheel()` | 478-501 | `canvas` → `viewport`，新增 `syncToDisplayCanvas()` |
| `zoomIn()` | 503-519 | `canvas` → `viewport` |
| `zoomOut()` | 522-539 | `canvas` → `viewport` |
| 事件绑定 | 606-625 | `canvas` → `viewport` |
| `syncToDisplayCanvas()` | 125-154 | `canvas` → `viewport` |
| `updateMinimap()` | 207-271 | `canvas` → `viewport` |
| `navigateMinimap()` | 291-320 | `canvas` → `viewport` |

### 附录 B：完整修改 diff

```diff
--- a/assets/canvas-doodle.js
+++ b/assets/canvas-doodle.js
@@ -123,7 +123,7 @@
     function syncToDisplayCanvas() {
-      const rect = canvas.getBoundingClientRect();
+      const rect = viewport.getBoundingClientRect();
       const viewportWidth = rect.width;
       const viewportHeight = rect.height;
       
@@ -246,9 +246,9 @@
       minimapCtx.strokeRect(offsetX, offsetY, contentWidth * scale, contentHeight * scale);
       
-      const rect = canvas.getBoundingClientRect();
-      const viewportWidth = rect.width;
-      const viewportHeight = rect.height;
+      const viewportRect = viewport.getBoundingClientRect();
+      const viewportWidth = viewportRect.width;
+      const viewportHeight = viewportRect.height;
       
       const vpMinX = (-cameraX) / cameraZoom;
       const vpMinY = (-cameraY) / cameraZoom;
@@ -308,9 +308,9 @@
       const worldX = (mouseX - offsetX) / scale + bounds.minX;
       const worldY = (mouseY - offsetY) / scale + bounds.minY;
       
-      const viewportRect = canvas.getBoundingClientRect();
-      const viewportWidth = viewportRect.width;
-      const viewportHeight = viewportRect.height;
+      const viewportRect = viewport.getBoundingClientRect();
+      const viewportWidth = viewportRect.width;
+      const viewportHeight = viewportRect.height;
       
       cameraX = -(worldX - (viewportWidth / 2 / cameraZoom)) * cameraZoom;
       cameraY = -(worldY - (viewportHeight / 2 / cameraZoom)) * cameraZoom;
@@ -320,7 +320,7 @@
     
     function getMousePositionOnCanvas(e) {
-      const rect = canvas.getBoundingClientRect();
+      const rect = viewport.getBoundingClientRect();
       
       let clientX, clientY;
       if (e.touches && e.touches.length > 0) {
@@ -349,13 +349,13 @@
     
     function updateCursor() {
       if (isPanning) {
-        canvas.style.cursor = 'grabbing';
+        viewport.style.cursor = 'grabbing';
       } else if (isAddingText) {
-        canvas.style.cursor = 'text';
+        viewport.style.cursor = 'text';
       } else if (spaceKeyPressed) {
-        canvas.style.cursor = 'grab';
+        viewport.style.cursor = 'grab';
       } else {
-        canvas.style.cursor = 'crosshair';
+        viewport.style.cursor = 'crosshair';
       }
     }
     
@@ -477,7 +477,7 @@
     
     function handleWheel(e) {
       e.preventDefault();
       
-      const rect = canvas.getBoundingClientRect();
+      const rect = viewport.getBoundingClientRect();
       const mouseX = e.clientX - rect.left;
       const mouseY = e.clientY - rect.top;
       
@@ -495,6 +495,7 @@
         cameraX = mouseX - worldX * cameraZoom;
         cameraY = mouseY - worldY * cameraZoom;
         
         applyCameraTransform();
+        syncToDisplayCanvas();
         updateZoomLevel();
       }
     }
@@ -502,7 +503,7 @@
     
     function zoomIn() {
-      const rect = canvas.getBoundingClientRect();
+      const rect = viewport.getBoundingClientRect();
       const centerX = rect.width / 2;
       const centerY = rect.height / 2;
       
@@ -521,7 +522,7 @@
     
     function zoomOut() {
-      const rect = canvas.getBoundingClientRect();
+      const rect = viewport.getBoundingClientRect();
       const centerX = rect.width / 2;
       const centerY = rect.height / 2;
       
@@ -603,20 +604,20 @@
       }
     }
     
-    canvas.addEventListener('mousedown', startDrawing);
-    canvas.addEventListener('mousemove', draw);
-    canvas.addEventListener('mouseup', stopDrawing);
-    canvas.addEventListener('mouseout', stopDrawing);
-    
-    canvas.addEventListener('wheel', handleWheel, { passive: false });
-    
-    canvas.addEventListener('touchstart', function(e) {
+    viewport.addEventListener('mousedown', startDrawing);
+    viewport.addEventListener('mousemove', draw);
+    viewport.addEventListener('mouseup', stopDrawing);
+    viewport.addEventListener('mouseleave', stopDrawing);
+    
+    viewport.addEventListener('wheel', handleWheel, { passive: false });
+    
+    viewport.addEventListener('touchstart', function(e) {
       if (e.touches.length === 1) {
         startDrawing(e);
       }
     }, { passive: false });
     
-    canvas.addEventListener('touchmove', function(e) {
+    viewport.addEventListener('touchmove', function(e) {
       if (e.touches.length === 1) {
         draw(e);
       }
     }, { passive: false });
     
-    canvas.addEventListener('touchend', stopDrawing);
+    viewport.addEventListener('touchend', stopDrawing);
```

---

**文档结束**

如需更多帮助，请查阅源代码或提交 issue。
