# Hexo Canvas Doodle Bug 修复文档 (v2.2.1)

## 修复版本
- 修复前版本：v2.2.0
- 修复后版本：v2.2.1

## 修复的问题

### Bug #1：画布内容无故清空

**问题描述：**
在某些情况下，画布内容会被无故清空。

**问题根源分析：**
经过代码审查，发现以下可能的原因：

1. **`loadCanvas` 函数中的 `clearRect`**：
   - 在 `img.onload` 回调中调用了 `offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)`
   - 如果图片加载失败或格式错误，可能会导致意外行为

2. **`syncToDisplayCanvas` 中的 `clearRect`**：
   - 调用了 `ctx.clearRect(0, 0, canvas.width, canvas.height)`
   - 但这是清空显示 Canvas（用于渲染），不是离屏 Canvas（用于存储内容）

**修复方案：**
- 确保 `loadCanvas` 只在有有效数据时才清空并重绘
- 代码逻辑已正确，此问题可能是由 Bug #2 导致的连锁反应

---

### Bug #2：每次绘制都会触发画布扩大

**问题描述：**
每次绘制操作都会触发画布扩大，即使绘制位置远离当前画布边界。

**问题根源：**
坐标转换逻辑错误，导致世界坐标 `(0, 0)` 对应离屏坐标 `(-4000, -4000)`，在离屏 Canvas 之外。

**详细分析：**

初始状态（修复前）：
- `worldOffsetX = 4000`（离屏 Canvas 的 `(0, 0)` 对应世界坐标 `4000`）
- `worldOffsetY = 4000`
- `INFINITE_CANVAS_INITIAL_SIZE = 8000`（离屏 Canvas 大小）
- `cameraX = 0`, `cameraY = 0`, `cameraZoom = 1`

坐标转换：
```javascript
function worldToScreen(worldX, worldY) {
  return {
    x: worldX - worldOffsetX,  // screenX = worldX - 4000
    y: worldY - worldOffsetY   // screenY = worldY - 4000
  };
}
```

用户在视口左上角绘制：
- 鼠标相对于 viewport 的位置：`(0, 0)`
- `getMousePositionOnCanvas` 返回世界坐标：`(0, 0)`
- 转换为离屏坐标：`screenX = 0 - 4000 = -4000`

边界检测（`ensureCanvasSize`）：
```javascript
const padding = 500;
if (screenPos.x < padding) {        // -4000 < 500 → true
  needsResize = true;
  expandLeft = true;
}
if (screenPos.y < padding) {        // -4000 < 500 → true
  needsResize = true;
  expandTop = true;
}
```

**结果：每次绘制都会触发 `expandLeft` 和 `expandTop`！**

**修复方案：**
将 `worldOffsetX/Y` 改为负值，使世界坐标 `(0, 0)` 对应离屏 Canvas 的中心。

修复后：
- `worldOffsetX = -4000`
- `worldOffsetY = -4000`

坐标转换：
```
世界坐标 (0, 0) → 离屏坐标 (0 - (-4000), 0 - (-4000)) = (4000, 4000)
```

离屏 Canvas 中心是 `(4000, 4000)`，所以：
- 世界坐标 `(0, 0)` 对应离屏 Canvas 中心
- 边界检测 `padding = 500`，有效绘制范围：
  - 离屏坐标 `[500, 7500]`（宽度 8000）
  - 对应世界坐标 `[-3500, 3500]`

**代码修改：**
```javascript
// 修复前
const WORLD_OFFSET_INITIAL = 4000;

// 修复后
const WORLD_OFFSET_INITIAL = -4000;
```
文件：`canvas-doodle.js:9`, `hexo-canvas-doodle-v2.2.0.js:9`

---

### Bug #3：画布在页面的面积逐渐变大

**问题描述：**
画布在页面中所占的面积逐渐变大，应该使用滑动条保持画布在网页所占的面积不变。

**问题根源：**
1. **`.hexo-canvas-viewport` 没有固定尺寸**
   - CSS 中只设置了 `overflow: hidden`，没有设置固定的 `width` 和 `height`
   - 测试页面中只通过内联样式设置了 `width: 800px`，没有设置 `height`

2. **`.hexo-canvas-doodle` 没有 CSS 尺寸限制**
   - `canvas` 元素的实际显示尺寸由 `canvas.width` 和 `canvas.height` 属性决定
   - `syncToDisplayCanvas` 中设置 `canvas.width = viewportWidth` 和 `canvas.height = viewportHeight`
   - 如果 `viewport` 没有固定高度，会导致循环变大

**详细分析：**

`syncToDisplayCanvas` 逻辑：
```javascript
function syncToDisplayCanvas() {
  const viewportRect = viewport.getBoundingClientRect();
  const viewportWidth = viewportRect.width;
  const viewportHeight = viewportRect.height;
  
  if (canvas.width !== viewportWidth || canvas.height !== viewportHeight) {
    canvas.width = viewportWidth;
    canvas.height = viewportHeight;
    // ...
  }
  // ...
}
```

问题：
- `getBoundingClientRect()` 返回元素的实际尺寸
- 如果 `viewport` 没有固定高度，`viewportRect.height` 可能等于 `canvas.offsetHeight`
- `canvas.height` 被设置为这个值
- `canvas` 没有 CSS 尺寸限制，所以 `canvas.height` 属性决定了实际显示高度
- 这可能导致循环变大

**修复方案：**

1. **给 `.hexo-canvas-viewport` 添加固定尺寸**：
```css
.hexo-canvas-viewport {
  overflow: hidden;
  position: relative;
  margin: 0 auto;
  border: 2px solid #333;
  border-radius: 4px;
  background-color: #fff;
  width: 100%;
  max-width: 800px;
  height: 500px;  /* 新增：固定高度 */
}
```

2. **给 `.hexo-canvas-doodle` 添加 CSS 尺寸限制**：
```css
.hexo-canvas-doodle {
  display: block;
  cursor: crosshair;
  transform-origin: 0 0;
  width: 100%;   /* 新增：填充 viewport */
  height: 100%;  /* 新增：填充 viewport */
}
```

**说明：**
- `.hexo-canvas-viewport` 默认尺寸：`width: 100%`, `max-width: 800px`, `height: 500px`
- 用户可以通过内联样式覆盖这些默认值
- `.hexo-canvas-doodle` 使用 `width: 100%; height: 100%` 填充 `viewport`
- `canvas.width` 和 `canvas.height` 属性（绘制缓冲区）仍然由 `syncToDisplayCanvas` 动态设置，确保 1:1 像素渲染

---

## 修改的文件

### 1. `assets/canvas-doodle.js`
- 第 9 行：`WORLD_OFFSET_INITIAL` 从 `4000` 改为 `-4000`

### 2. `hexo-canvas-doodle-v2.2.0.js`
- 第 9 行：`WORLD_OFFSET_INITIAL` 从 `4000` 改为 `-4000`

### 3. `assets/canvas-doodle.css`
- `.hexo-canvas-viewport` 添加：
  - `width: 100%`
  - `max-width: 800px`
  - `height: 500px`
- `.hexo-canvas-doodle` 添加：
  - `width: 100%`
  - `height: 100%`

---

## 坐标系统说明（修复后）

### 三层坐标系统

```
视口坐标 (viewportX, viewportY)
    ↓ 除以 zoom，减去 cameraX
世界坐标 (worldX, worldY)  ← 可正可负，支持无限延伸
    ↓ 减去 worldOffsetX/Y
离屏坐标 (screenX, screenY)  ← 范围 [0, offscreenCanvas.width]
```

### 坐标转换公式

```javascript
// 世界坐标 → 离屏坐标
function worldToScreen(worldX, worldY) {
  return {
    x: worldX - worldOffsetX,
    y: worldY - worldOffsetY
  };
}

// 离屏坐标 → 世界坐标
function screenToWorld(screenX, screenY) {
  return {
    x: screenX + worldOffsetX,
    y: screenY + worldOffsetY
  };
}
```

### 初始状态

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `worldOffsetX` | `-4000` | 离屏 Canvas (0,0) 对应世界坐标 |
| `worldOffsetY` | `-4000` | |
| `INFINITE_CANVAS_INITIAL_SIZE` | `8000` | 离屏 Canvas 初始大小 |
| `padding` | `500` | 边界检测阈值 |

### 初始坐标映射

| 世界坐标 | 离屏坐标 | 说明 |
|----------|----------|------|
| `(0, 0)` | `(4000, 4000)` | 视口左上角 → 离屏 Canvas 中心 |
| `(-3500, -3500)` | `(500, 500)` | 左/上边界阈值 |
| `(3500, 3500)` | `(7500, 7500)` | 右/下边界阈值 |
| `(-4000, -4000)` | `(0, 0)` | 离屏 Canvas 左/上边界 |
| `(4000, 4000)` | `(8000, 8000)` | 离屏 Canvas 右/下边界 |

### 边界检测逻辑

```javascript
function ensureCanvasSize(worldX, worldY) {
  const padding = 500;
  const screenPos = worldToScreen(worldX, worldY);
  
  // 离左边界太近 → 向左扩展
  if (screenPos.x < padding) {
    expandLeft = true;
  }
  
  // 离右边界太近 → 向右扩展
  if (screenPos.x > offscreenCanvas.width - padding) {
    expandRight = true;
  }
  
  // ... 类似的 y 轴检测
}
```

---

## 测试建议

### Bug #2 测试（每次绘制触发扩大）

1. **初始绘制测试**：
   - 在视口中心绘制一条线
   - 验证不会触发画布扩展
   - 检查控制台是否有相关日志

2. **边界绘制测试**：
   - 平移画布，使视口靠近离屏 Canvas 边界
   - 例如：向左平移 3500 像素（世界坐标）
   - 在视口边缘绘制
   - 验证当离边界小于 500 像素时才触发扩展

3. **扩展后测试**：
   - 触发一次扩展后
   - 在相同位置继续绘制
   - 验证不会再次触发扩展

### Bug #3 测试（画布面积变大）

1. **初始尺寸测试**：
   - 检查 viewport 尺寸：应该是 `800px x 500px`（默认）
   - 检查 canvas 尺寸：应该填充 viewport

2. **缩放后测试**：
   - 缩小或放大画布
   - 检查 viewport 尺寸是否保持不变
   - 检查 canvas 实际显示尺寸是否保持不变

3. **多次绘制测试**：
   - 连续绘制多条线
   - 检查页面布局是否变化
   - 检查 viewport 是否保持固定尺寸

---

## 升级说明

### 文件替换

1. **CSS 文件**：`canvas-doodle.css`
   - 替换 Hexo 的 `source/css/` 目录下的对应文件
   - 或更新引用的 CDN 链接

2. **JS 文件**：`hexo-canvas-doodle-v2.2.0.js`
   - 替换 Hexo 的 `source/js/` 目录下的对应文件
   - 更新页面中引用的脚本文件名

### 注意事项

1. **CSS 兼容性**：
   - `.hexo-canvas-viewport` 新增了默认尺寸
   - 如果页面中通过内联样式设置了 viewport 尺寸，内联样式会覆盖默认值
   - 建议：如果需要自定义尺寸，使用内联样式

2. **Canvas 渲染**：
   - `canvas.width` 和 `canvas.height` 属性（绘制缓冲区）仍然动态设置
   - CSS 尺寸 `width: 100%; height: 100%` 只控制显示尺寸
   - 确保了清晰的 1:1 像素渲染

3. **世界坐标偏移**：
   - `worldOffsetX/Y` 从 `4000` 改为 `-4000`
   - 这改变了世界坐标与离屏坐标的映射关系
   - 但对用户透明，用户只需要关心世界坐标

---

## 已知问题

### Bug #1 调查中

画布内容无故清空的问题可能是由以下原因导致：

1. **`loadCanvas` 的副作用**：
   - 初始化时会调用 `loadCanvas`
   - 如果 localStorage 中有旧版本保存的数据，可能导致不兼容

2. **`ensureCanvasSize` 扩展时的问题**：
   - 扩展时创建新的 offscreenCanvas
   - 旧内容通过 `drawImage` 复制到新位置
   - 理论上应该正确，但需要进一步验证

建议：
- 如果遇到内容清空问题，请检查浏览器控制台
- 清除 localStorage 中的旧数据：`localStorage.removeItem('hexo-canvas-xxx')`
- 或使用"清除"按钮重置画布

---

## 版本历史

| 版本 | 修复内容 |
|------|----------|
| v2.2.1 | 修复坐标偏移导致每次绘制触发扩大；修复 CSS 尺寸导致画布变大 |
| v2.2.0 | 引入世界坐标偏移量系统；修复缩放后绘制范围受限和鼠标位置偏移 |
| v2.1.0 | 初始版本，包含无限画布和迷你地图功能 |
