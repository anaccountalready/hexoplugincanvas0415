# Hexo Canvas Doodle - 新功能说明文档

## 版本信息
- **版本**: 1.2.0
- **更新日期**: 2026-04-16
- **新增功能**: 颜色选择器、画笔大小调整、画布缩放（CSS Transform）、画布拖拽平移、滚轮缩放、文本添加

---

## 目录
1. [功能概述](#功能概述)
2. [新功能详细说明](#新功能详细说明)
   - [1. 颜色选择器](#1-颜色选择器)
   - [2. 画笔大小调整](#2-画笔大小调整)
   - [3. 画布缩放功能（Excalidraw 风格）](#3-画布缩放功能excalidraw-风格)
   - [4. 画布拖拽平移功能](#4-画布拖拽平移功能)
   - [5. 文本添加功能](#5-文本添加功能)
3. [技术实现细节](#技术实现细节)
4. [使用示例](#使用示例)
5. [API 接口说明](#api-接口说明)
6. [注意事项](#注意事项)

---

## 功能概述

Hexo Canvas Doodle 插件在 v1.2.0 版本中采用了全新的 **CSS Transform + 相机系统** 架构，实现了与 Excalidraw 类似的用户体验：

| 功能 | 描述 | 状态 |
|------|------|------|
| 颜色选择器 | 支持选择任意颜色进行绘画 | ✅ 已实现 |
| 画笔大小调整 | 支持 1-20px 的画笔粗细调节 | ✅ 已实现 |
| CSS Transform 缩放 | 笔迹随缩放真正放大缩小 | ✅ 已实现 |
| 滚轮缩放 | 以鼠标位置为中心缩放 | ✅ 已实现 |
| 拖拽平移 | 中键或空格+左键拖拽画布 | ✅ 已实现 |
| 文本添加 | 支持在画布上添加自定义文本 | ✅ 已实现 |

---

## 新功能详细说明

### 1. 颜色选择器

#### 功能描述
允许用户从调色板中选择任意颜色作为画笔颜色，用于绘制线条和添加文本。

#### 使用方法
1. 找到画布控制区中的 **"画笔颜色"** 标签
2. 点击旁边的颜色选择器（显示为一个小方块）
3. 在弹出的系统调色板中选择所需颜色
4. 颜色会实时生效，下次绘制时将使用新选择的颜色

#### 技术参数
- **默认颜色**: `#000000` (黑色)
- **支持格式**: RGB、Hex 颜色代码
- **触发方式**: `input` 和 `change` 事件

#### 代码实现位置
- **HTML 元素**: `index.js:43-44` - 颜色选择器 input 元素
- **JavaScript 处理**: `canvas-doodle.js:275-277` - `setColor()` 函数

---

### 2. 画笔大小调整

#### 功能描述
允许用户通过滑块调整画笔的粗细，范围从 1px 到 20px。

#### 使用方法
1. 找到画布控制区中的 **"画笔大小"** 标签
2. 拖动滑块向左（变细）或向右（变粗）
3. 滑块旁边会实时显示当前的画笔大小（如 "3px"）
4. 调整后的大小会立即生效

#### 技术参数
- **最小值**: `1px`
- **最大值**: `20px`
- **默认值**: `3px`
- **步长**: `1px`

#### 代码实现位置
- **HTML 元素**: `index.js:46-49` - range 滑块和显示值
- **JavaScript 处理**: `canvas-doodle.js:279-285` - `setLineWidth()` 函数

---

### 3. 画布缩放功能（Excalidraw 风格）

#### 功能描述
采用 **CSS Transform** 技术实现真正的缩放效果。与 Excalidraw 一样，缩放时**已绘制的笔迹会真正放大缩小**，而不是只影响新绘制的内容。

#### 使用方法

**方法一：鼠标滚轮（推荐）**
1. 将鼠标移动到画布上想要放大/缩小的位置
2. 向上滚动鼠标滚轮 → 放大（以鼠标位置为中心）
3. 向下滚动鼠标滚轮 → 缩小（以鼠标位置为中心）

**方法二：按钮控制**
1. 点击 **"+"** 按钮 → 放大 20%（以视口中心为基准）
2. 点击 **"-"** 按钮 → 缩小 20%（以视口中心为基准）
3. 点击 **"重置"** 按钮 → 恢复原始大小（100%）

#### 技术参数
- **最小缩放**: `10%` (0.1x)
- **最大缩放**: `1000%` (10x)
- **默认缩放**: `100%` (1x)
- **滚轮步长**: `10%` 每次滚动
- **按钮步长**: `20%` 每次点击

#### 工作原理

缩放功能通过 **CSS `transform: scale()`** 实现，作用于整个 Canvas 元素：

```javascript
function applyCameraTransform() {
  canvas.style.transformOrigin = '0 0';
  canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`;
}
```

**与旧实现的关键区别**：
| 实现方式 | 已绘制内容 | 新绘制内容 | 推荐度 |
|---------|-----------|-----------|--------|
| Canvas ctx.scale() | ❌ 不随缩放变化 | ✅ 受缩放影响 | ❌ 不推荐 |
| CSS Transform | ✅ 真正放大缩小 | ✅ 坐标自动转换 | ✅ 推荐 |

**以鼠标为中心的缩放算法**：
```javascript
function handleWheel(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  // 记录缩放前鼠标指向的"世界坐标"
  const worldX = (mouseX - cameraX) / cameraZoom;
  const worldY = (mouseY - cameraY) / cameraZoom;
  
  // 应用缩放
  cameraZoom = newZoom;
  
  // 关键：调整相机位置，使鼠标指向的点保持不变
  cameraX = mouseX - worldX * cameraZoom;
  cameraY = mouseY - worldY * cameraZoom;
}
```

#### 代码实现位置
- **CSS Transform 应用**: `canvas-doodle.js:36-39` - `applyCameraTransform()`
- **滚轮缩放处理**: `canvas-doodle.js:182-204` - `handleWheel()`
- **按钮缩放**: `canvas-doodle.js:206-249` - `zoomIn()`/`zoomOut()`/`zoomReset()`

---

### 4. 画布拖拽平移功能

#### 功能描述
采用与 **Excalidraw** 完全相同的交互模式：
- 可以拖拽画布到**边界之外**，看到"空白"区域
- 支持两种拖拽方式：鼠标中键拖拽、空格键+左键拖拽

#### 使用方法

**方式一：鼠标中键拖拽（推荐）**
1. 将鼠标移动到画布上
2. 按住鼠标**中键**（滚轮）
3. 拖拽鼠标移动视图
4. 松开中键完成移动

**方式二：空格键 + 左键拖拽**
1. 按下并按住 **空格键**
2. 此时光标变为 "grab"（抓取）样式
3. 按住鼠标**左键**并拖拽
4. 可以先松开鼠标左键，再松开空格键

**方式三：方向按钮**
- 点击 **↑/↓/←/→** 按钮进行精确移动

#### 光标状态说明
| 状态 | 光标样式 | 含义 |
|------|---------|------|
| 绘制模式 | `crosshair` (+) | 可以自由绘制 |
| 按下空格键 | `grab` (手) | 准备好抓取画布 |
| 拖拽中 | `grabbing` (抓取) | 正在移动画布 |
| 文本模式 | `text` (I) | 准备添加文本 |

#### 技术参数
- **移动方式**: 拖拽偏移量 = 屏幕像素差
- **移动范围**: 无限制（可无限平移）
- **视口限制**: 可视区域受 `.hexo-canvas-viewport` 的 `overflow: hidden` 限制

#### 工作原理

**视口系统架构**：
```html
<!-- Viewport 容器（可视窗口）-->
<div class="hexo-canvas-viewport" style="overflow: hidden;">
  <!-- 真实画布（可以比视口大，可以移动到视口外） -->
  <canvas id="my-canvas"></canvas>
</div>
```

**拖拽平移算法**：
```javascript
function startDrawing(e) {
  // 检测平移触发条件：中键 或 (左键 + 空格按下)
  if (e.button === 1 || (e.button === 0 && spaceKeyPressed)) {
    isPanning = true;
    lastPanScreenX = clientX;  // 记录当前屏幕坐标
    lastPanScreenY = clientY;
    updateCursor();  // 变为 grabbing
    return;
  }
}

function draw(e) {
  if (isPanning) {
    // 计算拖拽偏移量（屏幕像素）
    const deltaX = clientX - lastPanScreenX;
    const deltaY = clientY - lastPanScreenY;
    
    // 直接更新相机位置
    cameraX += deltaX;
    cameraY += deltaY;
    
    lastPanScreenX = clientX;
    lastPanScreenY = clientY;
    
    applyCameraTransform();  // 应用 CSS 变换
    return;
  }
}
```

**空格键事件处理**：
```javascript
document.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && !spaceKeyPressed) {
    e.preventDefault();  // 阻止页面滚动
    spaceKeyPressed = true;
    updateCursor();  // 变为 grab
  }
});

document.addEventListener('keyup', function(e) {
  if (e.code === 'Space') {
    spaceKeyPressed = false;
    if (!isPanning) {
      updateCursor();  // 恢复 crosshair
    }
  }
});
```

**坐标转换（绘制时）**：
```javascript
function getMousePositionOnCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  const relativeX = e.clientX - rect.left;
  const relativeY = e.clientY - rect.top;
  
  // 关键：从 CSS 变换后的坐标转换回原始画布坐标
  // 原始坐标 = (屏幕相对坐标 - 相机偏移) / 缩放比例
  const canvasX = (relativeX - cameraX) / cameraZoom;
  const canvasY = (relativeY - cameraY) / cameraZoom;
  
  return { x: canvasX, y: canvasY };
}
```

#### 代码实现位置
- **拖拽开始检测**: `canvas-doodle.js:100-116` - `startDrawing()` 中的平移检测
- **拖拽执行**: `canvas-doodle.js:129-151` - `draw()` 中的平移逻辑
- **空格键处理**: `canvas-doodle.js:323-338` - 全局键盘事件
- **光标更新**: `canvas-doodle.js:69-79` - `updateCursor()` 函数

---

### 5. 文本添加功能

#### 功能描述
允许用户在画布上的任意位置添加自定义文本，文本使用当前选择的画笔颜色和大小。

#### 使用方法
1. 找到画布控制区中的 **"文本"** 标签
2. 在文本输入框中输入想要添加的文字
3. 点击 **"添加文本"** 按钮
4. 此时画布光标会变为文本光标（I 形）
5. 点击画布上想要放置文本的位置
6. 文本会立即出现在点击位置

#### 技术参数
- **文本颜色**: 使用当前选择的画笔颜色
- **文本大小**: 基于画笔大小计算（画笔大小 × 4，最小 12px）
- **字体**: `Arial` (无衬线字体)

#### 文本大小计算公式
```javascript
// 文本大小 = max(12px, 画笔大小 × 4)
const fontSize = Math.max(12, lineWidth * 4);
ctx.font = `${fontSize}px Arial`;
```

#### 代码实现位置
- **HTML 元素**: `index.js:68-71` - 文本输入框和按钮
- **JavaScript 处理**: `canvas-doodle.js:287-300` - `prepareAddText()` 函数
- **文本渲染**: `canvas-doodle.js:84-98` - `startDrawing()` 中的文本放置逻辑

---

## 技术实现细节

### 1. 核心架构：CSS Transform + 相机系统

#### 为什么选择 CSS Transform？

**旧方案的问题**（Canvas ctx.scale()）：
```javascript
// ❌ 问题：只影响新绘制的内容，已绘制的像素不会改变
ctx.save();
ctx.scale(scale, scale);
ctx.beginPath();
// ... 绘制操作
ctx.stroke();  // 只有这个线条受 scale 影响
ctx.restore();
// 之前绘制的内容看起来没有缩放！
```

**新方案的优势**（CSS Transform）：
```javascript
// ✅ 优势：作用于整个 Canvas 元素
canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`;
// 所有已绘制的像素都会真正放大缩小！
```

#### 视口系统组件

```
┌─────────────────────────────────────────┐
│  .hexo-canvas-viewport (视口容器)       │
│  ┌─────────────────────────────────┐    │
│  │  overflow: hidden  ← 关键：隐藏超出部分 │
│  │                                 │    │
│  │  ┌───────────────────────────┐  │    │
│  │  │  <canvas> (真实画布)      │  │    │
│  │  │                           │  │    │
│  │  │  CSS Transform:           │  │    │
│  │  │  translate + scale        │  │    │
│  │  │                           │  │    │
│  │  │  可以移动到视口外          │  │    │
│  │  │  可以放大/缩小             │  │    │
│  │  └───────────────────────────┘  │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### 状态变量

每个画布实例都维护以下状态变量：

```javascript
// 相机状态（控制 CSS Transform）
let cameraX = 0;      // X 轴偏移（像素）
let cameraY = 0;      // Y 轴偏移（像素）
let cameraZoom = 1;    // 缩放比例（1 = 100%）

// 绘制状态
let strokeColor = '#000000';  // 画笔颜色
let lineWidth = 3;              // 画笔大小

// 交互状态
let isDrawing = false;           // 是否正在绘制
let isPanning = false;           // 是否正在平移
let isAddingText = false;        // 是否处于文本添加模式
let spaceKeyPressed = false;     // 空格键是否按下

// 位置记录
let lastCanvasX = 0;             // 上次绘制的画布坐标 X
let lastCanvasY = 0;             // 上次绘制的画布坐标 Y
let lastPanScreenX = 0;          // 上次平移的屏幕坐标 X
let lastPanScreenY = 0;          // 上次平移的屏幕坐标 Y
```

### 2. 坐标转换系统

#### 三层坐标系统

```
1. 屏幕坐标 (Screen Coordinates)
   ├── e.clientX, e.clientY (相对于浏览器视口)
   └── 用于：拖拽平移的偏移量计算

2. 视口相对坐标 (Viewport Relative)
   ├── relativeX = clientX - rect.left
   ├── relativeY = clientY - rect.top
   └── 用于：滚轮缩放的中心点计算

3. 原始画布坐标 (Canvas Coordinates)
   ├── canvasX = (relativeX - cameraX) / cameraZoom
   ├── canvasY = (relativeY - cameraY) / cameraZoom
   └── 用于：实际绘制到 Canvas 上下文
```

#### 坐标转换公式

**从屏幕坐标转换为画布坐标**：
```javascript
function getMousePositionOnCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  
  // 1. 获取屏幕坐标
  const clientX = e.clientX;
  const clientY = e.clientY;
  
  // 2. 转换为视口相对坐标
  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  
  // 3. 转换为原始画布坐标（考虑 CSS Transform）
  const canvasX = (relativeX - cameraX) / cameraZoom;
  const canvasY = (relativeY - cameraY) / cameraZoom;
  
  return { x: canvasX, y: canvasY };
}
```

**以鼠标为中心的缩放**：
```javascript
function handleWheel(e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;  // 视口相对坐标
  const mouseY = e.clientY - rect.top;
  
  // 步骤 1：记录缩放前鼠标指向的世界坐标
  // 世界坐标 = (视口坐标 - 相机偏移) / 缩放比例
  const worldX = (mouseX - cameraX) / cameraZoom;
  const worldY = (mouseY - cameraY) / cameraZoom;
  
  // 步骤 2：应用新的缩放比例
  cameraZoom = newZoom;
  
  // 步骤 3：调整相机位置，使鼠标指向的世界坐标点
  // 仍然对应相同的视口坐标
  // 相机偏移 = 视口坐标 - 世界坐标 × 新缩放比例
  cameraX = mouseX - worldX * cameraZoom;
  cameraY = mouseY - worldY * cameraZoom;
  
  // 步骤 4：应用 CSS Transform
  applyCameraTransform();
}
```

### 3. 保存与加载机制

#### 为什么需要临时重置相机状态？

当保存画布时，我们希望保存的是**原始画布内容**，而不是 CSS 变换后的视图：

```
保存时的情况：
┌─────────────────────────────────────────┐
│  视口 (Viewport)                         │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  │    ┌─────────────────────┐      │    │
│  │    │  Canvas (放大200%)  │      │    │
│  │    │                     │      │    │
│  │    │    实际绘制内容      │      │    │
│  │    │                     │      │    │
│  │    └─────────────────────┘      │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘

问题：如果直接调用 canvas.toDataURL()
      得到的是 CSS 变换后的截图？
      ❌ 不，实际上 CSS Transform 不影响 toDataURL()

但我们需要确保：
✅ 保存的是原始尺寸的完整画布内容
✅ 相机状态（偏移、缩放）也需要单独保存
```

#### 保存流程

```javascript
function saveCanvas(canvasId) {
  const canvasData = canvases[canvasId];
  
  try {
    // 步骤 1：记录当前相机状态
    const camera = canvasData.getCameraState();
    
    // 步骤 2：临时重置相机状态
    // 确保 toDataURL() 获取的是原始画布
    canvasData.setCameraState(0, 0, 1);
    
    // 步骤 3：保存画布图像（Base64 PNG）
    const dataURL = canvasData.canvas.toDataURL('image/png');
    localStorage.setItem('hexo-canvas-' + canvasId, dataURL);
    
    // 步骤 4：保存状态信息（JSON）
    const state = canvasData.getState();
    localStorage.setItem('hexo-canvas-state-' + canvasId, JSON.stringify(state));
    
    // 步骤 5：恢复相机状态
    canvasData.setCameraState(camera.x, camera.y, camera.zoom);
    
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
}
```

#### 加载流程

```javascript
function loadCanvas(canvasId) {
  try {
    // 步骤 1：加载状态信息（优先恢复相机位置）
    const stateStr = localStorage.getItem('hexo-canvas-state-' + canvasId);
    if (stateStr) {
      const state = JSON.parse(stateStr);
      canvasData.setState(state);
    }
    
    // 步骤 2：加载画布图像
    const dataURL = localStorage.getItem('hexo-canvas-' + canvasId);
    if (!dataURL) return false;
    
    const img = new Image();
    img.onload = function() {
      // 步骤 3：记录当前相机状态
      const camera = canvasData.getCameraState();
      
      // 步骤 4：临时重置以便绘制
      canvasData.setCameraState(0, 0, 1);
      
      // 步骤 5：清除并绘制图像
      canvasData.ctx.clearRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
      canvasData.ctx.drawImage(img, 0, 0);
      
      // 步骤 6：恢复相机状态
      canvasData.setCameraState(camera.x, camera.y, camera.zoom);
    };
    img.src = dataURL;
    
    return true;
  } catch (e) {
    console.error('Load failed:', e);
    return false;
  }
}
```

### 4. 事件处理机制

#### 事件监听总览

```javascript
// Canvas 元素事件
canvas.addEventListener('mousedown', startDrawing);    // 开始绘制/平移
canvas.addEventListener('mousemove', draw);              // 绘制/平移中
canvas.addEventListener('mouseup', stopDrawing);          // 结束
canvas.addEventListener('mouseout', stopDrawing);         // 离开画布

// 滚轮事件（必须 passive: false 才能 preventDefault）
canvas.addEventListener('wheel', handleWheel, { passive: false });

// 触摸事件
canvas.addEventListener('touchstart', ..., { passive: false });
canvas.addEventListener('touchmove', ..., { passive: false });
canvas.addEventListener('touchend', stopDrawing);

// 全局键盘事件（空格键）
document.addEventListener('keydown', function(e) {
  if (e.code === 'Space' && !spaceKeyPressed) {
    e.preventDefault();  // 阻止页面滚动
    spaceKeyPressed = true;
    updateCursor();
  }
});

document.addEventListener('keyup', function(e) {
  if (e.code === 'Space') {
    spaceKeyPressed = false;
    if (!isPanning) {
      updateCursor();
    }
  }
});
```

#### 交互状态机

```
                    ┌─────────────────────────────────────────┐
                    │           初始状态                        │
                    │    isDrawing=false, isPanning=false     │
                    │    cursor: crosshair                     │
                    └───────────────────┬─────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   左键按下           │      │  中键按下 或         │      │  空格按下            │
│   非文本模式         │      │  (左键+空格按下)     │      │                     │
└──────────┬──────────┘      └──────────┬──────────┘      └──────────┬──────────┘
           │                             │                             │
           ▼                             ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   isDrawing=true    │      │   isPanning=true    │      │  spaceKeyPressed=   │
│   绘制模式           │      │   平移模式           │      │  true               │
│   cursor: crosshair │      │   cursor: grabbing  │      │  cursor: grab       │
└──────────┬──────────┘      └──────────┬──────────┘      └──────────┬──────────┘
           │                             │                             │
           │                             │                             │ 左键按下
           │                             │                             │ 进入平移
           ▼                             ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   鼠标移动           │      │   鼠标移动           │      │  isPanning=true     │
│   绘制线段           │      │   更新 cameraX/Y    │      │  (左键+空格)        │
│                     │      │   应用 CSS Transform │      │                     │
└──────────┬──────────┘      └──────────┬──────────┘      └──────────┬──────────┘
           │                             │                             │
           ▼                             ▼                             ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   鼠标释放/离开      │      │   鼠标释放/离开      │      │   空格键释放         │
│   isDrawing=false   │      │   isPanning=false   │      │   spaceKeyPressed=  │
│                     │      │   检测空格状态        │      │   false              │
│                     │      │   更新光标           │      │                      │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

---

## 使用示例

### 基本用法

在 Hexo 文章中使用 canvas 标签：

```markdown
{% canvas my-doodle 800 600 %}
```

### 功能演示

#### 1. 绘制彩色线条
```
步骤:
1. 点击颜色选择器，选择红色 (#ff0000)
2. 调整画笔大小为 5px
3. 在画布上绘制一条曲线
4. 再选择蓝色 (#0000ff)
5. 绘制另一条曲线
结果: 画布上显示红色和蓝色的两条曲线
```

#### 2. 使用拖拽平移探索画布
```
步骤:
1. 在画布左侧绘制一个图形
2. 按住鼠标中键，向右拖拽
3. 观察：原来的图形向左移动，右侧出现空白区域
4. 在空白区域绘制新的图形
5. 向左拖拽，回到原来的位置
结果: 可以在更大的虚拟画布上绘制
```

#### 3. 以鼠标为中心的滚轮缩放
```
步骤:
1. 在画布上绘制一个小圆圈
2. 将鼠标指针移到圆圈上
3. 向上滚动滚轮
4. 观察：圆圈放大，且鼠标指针始终指向圆圈的同一点
5. 向下滚动滚轮缩小
结果: 实现类似 Excalidraw 的精准缩放体验
```

#### 4. 空格键 + 左键拖拽
```
步骤:
1. 在画布上绘制一些内容
2. 按下并按住空格键
3. 观察光标变为 "grab"（手形）
4. 按住鼠标左键并拖拽
5. 先松开鼠标左键，再松开空格键
结果: 可以用另一种方式平移画布
```

#### 5. 缩放后继续绘制
```
步骤:
1. 绘制一条细线条
2. 放大到 200%（线条看起来变粗了）
3. 选择新颜色，继续绘制
4. 缩小到 50%
结果: 
- 已绘制的线条真正放大缩小（CSS Transform 效果）
- 新绘制的内容坐标自动转换
- 所有内容保持正确的相对位置
```

#### 6. 添加文本标注
```
步骤:
1. 选择绿色 (#00ff00) 作为画笔颜色
2. 调整画笔大小为 4px (文本大小为 16px)
3. 在文本输入框输入 "重要提示"
4. 点击 "添加文本" 按钮
5. 点击画布上想要放置文本的位置
结果: 绿色的 "重要提示" 文字出现在点击位置
```

---

## API 接口说明

### 公共 API

#### HexoCanvasDoodleAPI[canvasId]

每个画布实例都通过 `window.HexoCanvasDoodleAPI[canvasId]` 暴露控制接口。

**方法列表**:

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `setColor(color)` | `color: string` - Hex 颜色代码 | `void` | 设置画笔颜色 |
| `setLineWidth(width)` | `width: number` - 像素值 | `void` | 设置画笔大小 |
| `zoomIn()` | 无 | `void` | 放大画布 (20%，以视口中心) |
| `zoomOut()` | 无 | `void` | 缩小画布 (20%，以视口中心) |
| `zoomReset()` | 无 | `void` | 重置缩放和相机位置 |
| `panUp()` | 无 | `void` | 向上移动 50px (相机 Y+) |
| `panDown()` | 无 | `void` | 向下移动 50px (相机 Y-) |
| `panLeft()` | 无 | `void` | 向左移动 50px (相机 X+) |
| `panRight()` | 无 | `void` | 向右移动 50px (相机 X-) |
| `prepareAddText()` | 无 | `void` | 准备添加文本模式 |

**使用示例**:
```javascript
// 假设 canvasId 为 'my-canvas'
const api = window.HexoCanvasDoodleAPI['my-canvas'];

// 设置红色画笔
api.setColor('#ff0000');

// 设置画笔大小为 10px
api.setLineWidth(10);

// 放大两次
api.zoomIn();
api.zoomIn();

// 移动画布
api.panRight();
api.panDown();
```

#### HexoCanvasDoodle (全局对象)

`window.HexoCanvasDoodle` 提供全局操作方法：

| 方法名 | 参数 | 返回值 | 描述 |
|--------|------|--------|------|
| `save(canvasId)` | `canvasId: string` | `boolean` | 保存画布到 localStorage |
| `load(canvasId)` | `canvasId: string` | `boolean` | 从 localStorage 加载画布 |
| `clear(canvasId)` | `canvasId: string` | `boolean` | 清除画布内容 |
| `init(canvasId)` | `canvasId: string` | `void` | 初始化指定画布 |

#### 内部状态管理接口

每个画布实例在 `canvases[canvasId]` 中存储以下方法（主要用于内部保存/加载）：

```javascript
canvases[canvasId] = {
  canvas: canvas,      // 原始 Canvas 元素引用
  ctx: ctx,            // Canvas 2D 上下文
  
  // 获取完整状态（用于保存）
  getState: function() {
    return {
      strokeColor: strokeColor,
      lineWidth: lineWidth,
      cameraX: cameraX,
      cameraY: cameraY,
      cameraZoom: cameraZoom
    };
  },
  
  // 设置完整状态（用于加载）
  setState: function(state) { ... },
  
  // 获取相机状态（临时重置用）
  getCameraState: function() {
    return { x: cameraX, y: cameraY, zoom: cameraZoom };
  },
  
  // 设置相机状态（应用 CSS Transform）
  setCameraState: function(x, y, zoom) { ... }
};
```

---

## 注意事项

### 1. 性能考虑

- **CSS Transform 性能**: CSS `transform` 属性由 GPU 加速，性能优秀
- **大画布缩放**: 缩放比例过大（如 10x）可能导致 Canvas 元素变得非常大，占用更多内存
- **频繁平移**: 平移操作只是修改 CSS 属性，性能极高，不会重绘画布内容

**建议**:
- 对于复杂的绘制，正常操作即可，CSS Transform 性能优秀
- 如果需要极高的缩放比例（> 5x），注意观察浏览器内存占用

### 2. 数据存储

- **存储限制**: localStorage 通常有 5-10MB 的限制，复杂的画布可能占用较多空间
- **跨设备**: 数据仅存储在当前浏览器中，无法跨设备同步
- **清除风险**: 清除浏览器数据会丢失所有保存的画布内容
- **相机状态**: 相机位置和缩放比例会与画布图像分开保存

### 3. 坐标系统

- **原始画布坐标**: 所有绘制操作最终都转换为原始 Canvas 坐标 (0, 0) 到 (width, height)
- **相机偏移**: CSS `translate` 允许将画布移到视口之外，看到空白区域
- **边界问题**: 
  - 可以平移到原始画布边界之外
  - 但新绘制的内容如果超出 Canvas 元素尺寸，在保存时会被裁剪
  - 建议在原始 Canvas 尺寸范围内绘制

### 4. 浏览器兼容性

- **CSS Transform**: 所有现代浏览器都支持 `transform: translate() scale()`
- **颜色选择器**: 所有现代浏览器都支持 `<input type="color">`
- **Wheel 事件**: 使用标准 WheelEvent，兼容性良好
- **测试浏览器**: Chrome、Firefox、Safari、Edge 最新版本均已测试

### 5. 移动端支持

- **触摸事件**: 基础绘制功能支持触摸操作
- **注意**: 
  - 触摸平移（双指捏合缩放）目前未实现
  - 移动端建议使用按钮控制缩放和移动
- **响应式布局**: 控制区在小屏幕上会自动调整为垂直排列

### 6. 交互提示

#### 如何让用户知道可以拖拽平移？

建议在 UI 中添加以下提示：
```
💡 操作提示：
- 按住鼠标中键拖拽：平移画布
- 按住空格键 + 左键拖拽：平移画布
- 鼠标滚轮：以鼠标位置为中心缩放
```

#### 常见问题速查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 缩放后笔迹没有放大 | 使用了旧的 Canvas 变换 | 确认使用 v1.2.0+ 版本（CSS Transform） |
| 无法拖拽平移 | 没有按住中键或空格 | 检查鼠标中键是否可用，或尝试空格+左键 |
| 滚轮没有缩放 | 鼠标不在 Canvas 元素上 | 确保鼠标指针在 Canvas 区域内 |
| 空格按下页面滚动 | `preventDefault` 未生效 | 确认使用 v1.2.0+ 版本 |
| 保存后缩放位置丢失 | 旧版本数据 | v1.1.0+ 会保存相机状态 |

---

## 更新日志

### v1.2.0 (2026-04-16)

**重大架构变更**:
- 🔥 采用 **CSS Transform + 相机系统** 替代旧的 Canvas 变换
- ✅ 缩放时**已绘制的笔迹真正放大缩小**（类似 Excalidraw）

**新增功能**:
- ✅ **拖拽平移**：支持鼠标中键拖拽平移画布
- ✅ **空格+左键拖拽**：按住空格键 + 左键也可以平移
- ✅ **滚轮缩放**：以鼠标位置为中心进行缩放
- ✅ **视口系统**：添加 `.hexo-canvas-viewport` 容器，支持 `overflow: hidden`
- ✅ **光标反馈**：不同状态显示不同光标（crosshair/grab/grabbing/text）

**技术改进**:
- 📝 坐标转换系统重写：`(屏幕坐标 - 相机偏移) / 缩放比例`
- 🎨 保存/加载机制优化：临时重置相机状态确保保存原始画布
- 🐛 空格键处理：`preventDefault()` 阻止页面滚动

**文件变更**:
- `index.js` - 添加 `.hexo-canvas-viewport` wrapper div
- `assets/canvas-doodle.js` - **完全重写**，使用 CSS Transform 架构
- `assets/canvas-doodle.css` - 添加 `.hexo-canvas-viewport` 样式和 `overflow: hidden`
- `test.html` - 同步更新为新架构代码
- `FEATURE_GUIDE.md` - **完全重写**，详细说明新架构

---

### v1.1.0 (2026-04-16)

**初始新功能版本**:
- ✅ 颜色选择器功能 - 支持任意颜色选择
- ✅ 画笔大小调整 - 1-20px 可调范围
- ✅ 画布缩放功能 - 使用 Canvas 上下文变换
- ✅ 画布移动功能 - 按钮控制上下左右平移
- ✅ 文本添加功能 - 支持添加自定义文本
- 📝 状态持久化 - 保存时同时保存缩放和偏移状态

---

## 故障排除

### 常见问题

**Q1: 缩放后，已经画好的线条没有跟着放大？**

A: 这说明你使用的是旧版本（v1.1.0）。v1.1.0 使用的是 Canvas 上下文变换 (`ctx.scale()`)，这种方式只影响新绘制的内容。

**解决方案**:
- 升级到 **v1.2.0+** 版本
- v1.2.0 使用 **CSS Transform**，已绘制的内容会真正放大缩小

**如何验证版本**:
```javascript
// 在浏览器控制台输入
// 如果看到 cameraX, cameraY, cameraZoom 变量说明是 v1.2.0+
// 如果看到 scale, offsetX, offsetY 说明是 v1.1.0
```

---

**Q2: 按住中键无法拖拽？**

A: 可能的原因：

1. **鼠标中键故障**: 某些鼠标的中键（滚轮）点击需要较大力度
2. **浏览器/系统设置**: 某些系统可能禁用了中键点击

**替代方案**:
- 使用 **空格键 + 左键拖拽**：
  1. 按下并按住 **空格键**
  2. 按住鼠标左键并拖拽
  3. 松开后恢复正常

---

**Q3: 按下空格键页面会滚动？**

A: 这是旧版本的问题。v1.2.0+ 已经通过 `e.preventDefault()` 阻止了空格键的默认行为。

**解决方案**:
- 确认使用 **v1.2.0+** 版本
- 如果页面仍然滚动，检查是否有其他脚本也在监听空格键

---

**Q4: 滚轮滚动时页面滚动，而不是缩放画布？**

A: 可能的原因：

1. **鼠标指针不在 Canvas 上**: 滚轮事件只在鼠标指针位于 Canvas 元素上时才会触发
2. **Canvas 被其他元素遮挡**: 检查是否有透明元素覆盖在 Canvas 上

**解决方案**:
- 确保鼠标指针确实在 Canvas 绘制区域内
- 检查开发者工具的 Elements 面板，确认 Canvas 是最上层元素

---

**Q5: 缩放后绘制的位置不对？**

A: 这通常是坐标转换的问题。v1.2.0 使用以下公式进行坐标转换：

```javascript
// 原始画布坐标 = (视口相对坐标 - 相机偏移) / 缩放比例
const canvasX = (relativeX - cameraX) / cameraZoom;
const canvasY = (relativeY - cameraY) / cameraZoom;
```

**如果确实有问题**:
1. 打开浏览器开发者工具 (F12)
2. 切换到 Console 面板
3. 检查是否有 JavaScript 错误
4. 确认 `getMousePositionOnCanvas` 函数是否被正确调用

---

**Q6: 保存后重新加载，相机位置（缩放/偏移）没有恢复？**

A: v1.2.0 会保存相机状态到 `localStorage`：

```javascript
// 保存时
const state = canvasData.getState();  // 包含 cameraX, cameraY, cameraZoom
localStorage.setItem('hexo-canvas-state-' + canvasId, JSON.stringify(state));

// 加载时
const stateStr = localStorage.getItem('hexo-canvas-state-' + canvasId);
if (stateStr) {
  const state = JSON.parse(stateStr);
  canvasData.setState(state);  // 恢复相机状态
}
```

**可能的原因**:
1. **旧版本数据**: 如果是用 v1.0.0 保存的数据，没有状态信息
2. **localStorage 被清除**: 浏览器数据清除会丢失状态

**验证方法**:
```javascript
// 在控制台输入，检查是否存储了状态
localStorage.getItem('hexo-canvas-state-your-canvas-id')
```

---

**Q7: 拖拽平移后，在"空白区域"绘制的内容保存后丢失？**

A: 这是预期行为。Canvas 元素有固定的尺寸（如 800x400）。

**工作原理**:
```
┌─────────────────────────────────────────┐
│  视口 (800x400)                          │
│                                          │
│      ┌─────────────────────┐             │
│      │  Canvas (800x400)   │             │
│      │                     │             │
│      │  这个区域内的绘制    │             │
│      │  会被保存            │             │
│      │                     │             │
│      └─────────────────────┘             │
│                                          │
│  这个"空白区域"实际上是视口外             │
│  没有对应的 Canvas 像素                   │
│  在这里绘制会超出 Canvas 边界             │
│  保存时会被裁剪                           │
└─────────────────────────────────────────┘
```

**建议**:
- 在原始 Canvas 尺寸范围内绘制
- 如果需要更大的绘制空间，使用更大的 Canvas 尺寸初始化：
  ```markdown
  {% canvas my-doodle 1600 1200 %}  <!-- 更大的画布 -->
  ```

---

### 调试技巧

1. **检查控制台**: 打开浏览器开发者工具 (F12)，查看 Console 面板是否有错误信息

2. **验证 API**: 在控制台输入以下代码检查 API 是否可用：
   ```javascript
   // 列出所有画布 ID
   document.querySelectorAll('.hexo-canvas-doodle').forEach(c => console.log(c.id));
   
   // 检查 API 是否存在
   console.log(window.HexoCanvasDoodleAPI);
   ```

3. **检查当前状态**:
   ```javascript
   // 假设 canvasId 是 'test-canvas'
   const api = window.HexoCanvasDoodleAPI['test-canvas'];
   
   // 可以通过以下方式访问内部状态（仅供调试）
   const canvasData = Object.values(window.HexoCanvasDoodleAPI)[0];
   // 注意：正式使用时应通过公共 API
   ```

4. **清除存储**: 如果遇到保存/加载问题，可以尝试清除 localStorage:
   ```javascript
   // 清除所有存储
   localStorage.clear();
   
   // 或者只清除特定画布
   localStorage.removeItem('hexo-canvas-your-canvas-id');
   localStorage.removeItem('hexo-canvas-state-your-canvas-id');
   ```

---

## 技术支持

如有问题或建议，请：
1. 检查本文档的故障排除部分
2. 查看 `README.md` 获取基本使用信息
3. 查看 `USER_GUIDE.md` 获取用户指南
4. 提交 Issue 到项目仓库

---

## 许可证

MIT License - 详见 `README.md`
