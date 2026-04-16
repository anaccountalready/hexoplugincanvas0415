# Hexo Canvas Doodle - 新功能说明文档

## 版本信息
- **版本**: 1.1.0
- **更新日期**: 2026-04-16
- **新增功能**: 颜色选择器、画笔大小调整、画布缩放、画布移动、文本添加

---

## 目录
1. [功能概述](#功能概述)
2. [新功能详细说明](#新功能详细说明)
   - [1. 颜色选择器](#1-颜色选择器)
   - [2. 画笔大小调整](#2-画笔大小调整)
   - [3. 画布缩放功能](#3-画布缩放功能)
   - [4. 画布移动功能](#4-画布移动功能)
   - [5. 文本添加功能](#5-文本添加功能)
3. [技术实现细节](#技术实现细节)
4. [使用示例](#使用示例)
5. [API 接口说明](#api-接口说明)
6. [注意事项](#注意事项)

---

## 功能概述

Hexo Canvas Doodle 插件在 v1.1.0 版本中新增了五个重要功能，极大地增强了用户的涂鸦体验：

| 功能 | 描述 | 状态 |
|------|------|------|
| 颜色选择器 | 支持选择任意颜色进行绘画 | ✅ 已实现 |
| 画笔大小调整 | 支持 1-20px 的画笔粗细调节 | ✅ 已实现 |
| 画布缩放 | 支持 30%-300% 的缩放范围 | ✅ 已实现 |
| 画布移动 | 支持上下左右平移画布 | ✅ 已实现 |
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
- **HTML 元素**: `index.js:41-42` - 颜色选择器 input 元素
- **JavaScript 处理**: `canvas-doodle.js:154-156` - `setColor()` 函数
- **事件监听**: `canvas-doodle.js:402-418` - `input` 和 `change` 事件处理

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
- **HTML 元素**: `index.js:44-47` - range 滑块和显示值
- **JavaScript 处理**: `canvas-doodle.js:158-164` - `setLineWidth()` 函数
- **绘制应用**: `canvas-doodle.js:86-87` - 绘制时应用 `lineWidth`

---

### 3. 画布缩放功能

#### 功能描述
允许用户放大或缩小画布视图，以便查看细节或获得更大的绘制空间。

#### 使用方法
1. 找到画布控制区中的 **"缩放"** 标签
2. 点击 **"+"** 按钮放大画布（每次放大 20%）
3. 点击 **"-"** 按钮缩小画布（每次缩小 20%）
4. 点击 **"重置"** 按钮恢复原始大小（100%）
5. 中间的百分比数字显示当前缩放级别

#### 技术参数
- **最小缩放**: `30%` (0.3x)
- **最大缩放**: `300%` (3x)
- **默认缩放**: `100%` (1x)
- **缩放步长**: `20%` (每次乘以/除以 1.2)

#### 工作原理
缩放功能通过 Canvas 上下文的 `scale()` 变换实现：
```javascript
ctx.save();
ctx.translate(offsetX, offsetY);  // 先应用偏移
ctx.scale(scale, scale);           // 然后应用缩放
// ... 绘制操作
ctx.restore();
```

#### 代码实现位置
- **HTML 元素**: `index.js:52-57` - 缩放控制按钮
- **JavaScript 处理**: 
  - `canvas-doodle.js:110-116` - `zoomIn()` 放大函数
  - `canvas-doodle.js:118-124` - `zoomOut()` 缩小函数
  - `canvas-doodle.js:126-132` - `zoomReset()` 重置函数
  - `canvas-doodle.js:103-108` - `updateZoomLevel()` 更新显示

---

### 4. 画布移动功能

#### 功能描述
允许用户平移画布视图，以便在缩放后访问画布的不同区域。

#### 使用方法
1. 找到画布控制区中的 **"移动"** 标签
2. 点击方向按钮移动画布：
   - **↑** 向上移动
   - **↓** 向下移动
   - **←** 向左移动
   - **→** 向右移动
3. 每次点击移动 50 像素（基于原始画布尺寸）

#### 技术参数
- **移动步长**: `50px` (基于 100% 缩放时的像素)
- **移动范围**: 无限制（可无限平移）
- **与缩放结合**: 移动距离会根据当前缩放比例自动调整

#### 工作原理
移动功能通过 Canvas 上下文的 `translate()` 变换实现，与缩放配合使用：

坐标转换公式：
```
绘制坐标 = (鼠标坐标 - 偏移量) / 缩放比例
```

实际应用：
```javascript
// 获取鼠标在画布上的原始坐标
const canvasX = (clientX - rect.left) * scaleX;
const canvasY = (clientY - rect.top) * scaleY;

// 转换为变换后的坐标
const drawX = (canvasX - offsetX) / scale;
const drawY = (canvasY - offsetY) / scale;
```

#### 代码实现位置
- **HTML 元素**: `index.js:59-64` - 方向按钮
- **JavaScript 处理**:
  - `canvas-doodle.js:134-137` - `panUp()` 向上移动
  - `canvas-doodle.js:139-142` - `panDown()` 向下移动
  - `canvas-doodle.js:144-147` - `panLeft()` 向左移动
  - `canvas-doodle.js:149-152` - `panRight()` 向右移动

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

#### 工作原理
文本添加采用两步模式：
1. **准备阶段**: 输入文本并点击"添加文本"按钮，进入文本放置模式
2. **放置阶段**: 点击画布，将文本渲染到指定位置

#### 代码实现位置
- **HTML 元素**: `index.js:66-69` - 文本输入框和按钮
- **JavaScript 处理**:
  - `canvas-doodle.js:166-179` - `prepareAddText()` 准备文本
  - `canvas-doodle.js:55-68` - `startDrawing()` 中的文本放置逻辑
  - `canvas-doodle.js:59-62` - 文本渲染代码

---

## 技术实现细节

### 1. 状态管理

每个画布实例都维护以下状态变量：

```javascript
let strokeColor = '#000000';  // 画笔颜色
let lineWidth = 3;              // 画笔大小
let scale = 1;                   // 缩放比例
let offsetX = 0;                 // X 轴偏移
let offsetY = 0;                 // Y 轴偏移
let isAddingText = false;        // 是否处于文本添加模式
let textToAdd = '';              // 待添加的文本
```

### 2. 坐标转换系统

为了支持缩放和移动，实现了完整的坐标转换：

```
鼠标坐标
    ↓ (相对于视口)
画布原始坐标 (canvasX, canvasY)
    ↓ (应用偏移和缩放)
绘制坐标 (drawX, drawY) = [(canvasX - offsetX) / scale, (canvasY - offsetY) / scale]
```

### 3. 绘制流程

每次绘制操作都会保存和恢复上下文状态：

```javascript
ctx.save();                              // 保存当前状态
ctx.translate(offsetX, offsetY);         // 应用偏移
ctx.scale(scale, scale);                  // 应用缩放
ctx.beginPath();
ctx.strokeStyle = strokeColor;            // 设置颜色
ctx.lineWidth = lineWidth;                // 设置线宽
// ... 绘制操作
ctx.stroke();
ctx.restore();                             // 恢复状态
```

### 4. 状态持久化

保存和加载时会同时保存画布图像和状态信息：

**保存时**:
```javascript
// 1. 保存画布图像 (Base64 PNG)
const dataURL = canvasData.canvas.toDataURL('image/png');
localStorage.setItem('hexo-canvas-' + canvasId, dataURL);

// 2. 保存状态信息 (JSON)
const state = canvasData.getState();
localStorage.setItem('hexo-canvas-state-' + canvasId, JSON.stringify(state));
```

**加载时**:
```javascript
// 1. 加载状态信息
const stateStr = localStorage.getItem('hexo-canvas-state-' + canvasId);
if (stateStr) {
  const state = JSON.parse(stateStr);
  canvasData.setState(state);
}

// 2. 加载画布图像
const img = new Image();
img.onload = function() {
  canvasData.ctx.clearRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
  canvasData.ctx.drawImage(img, 0, 0);
};
img.src = dataURL;
```

### 5. API 架构

使用 `window.HexoCanvasDoodleAPI` 命名空间暴露画布控制接口：

```javascript
window.HexoCanvasDoodleAPI[canvasId] = {
  setColor: setColor,              // 设置颜色
  setLineWidth: setLineWidth,      // 设置线宽
  zoomIn: zoomIn,                   // 放大
  zoomOut: zoomOut,                 // 缩小
  zoomReset: zoomReset,             // 重置缩放
  panUp: panUp,                     // 上移
  panDown: panDown,                 // 下移
  panLeft: panLeft,                 // 左移
  panRight: panRight,               // 右移
  prepareAddText: prepareAddText    // 准备添加文本
};
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

#### 2. 使用缩放和移动绘制细节
```
步骤:
1. 在画布中心绘制一个小圆圈
2. 点击 "+" 按钮放大到 200%
3. 点击方向按钮移动视图，找到圆圈位置
4. 在圆圈内部添加细节
5. 点击 "重置" 按钮返回原始视图
结果: 可以在放大状态下精确绘制细节
```

#### 3. 添加文本标注
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
| `zoomIn()` | 无 | `void` | 放大画布 (20%) |
| `zoomOut()` | 无 | `void` | 缩小画布 (20%) |
| `zoomReset()` | 无 | `void` | 重置缩放和偏移 |
| `panUp()` | 无 | `void` | 向上移动 50px |
| `panDown()` | 无 | `void` | 向下移动 50px |
| `panLeft()` | 无 | `void` | 向左移动 50px |
| `panRight()` | 无 | `void` | 向右移动 50px |
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

---

## 注意事项

### 1. 性能考虑
- **缩放性能**: 过大的缩放比例 (300%) 可能导致绘制性能下降，特别是在高分辨率屏幕上
- **移动性能**: 频繁的平移操作不会影响性能，因为只是坐标变换
- **建议**: 对于复杂的绘制，建议在 100% 缩放时进行主要绘制，缩放仅用于查看细节

### 2. 数据存储
- **存储限制**: localStorage 通常有 5-10MB 的限制，复杂的画布可能占用较多空间
- **跨设备**: 数据仅存储在当前浏览器中，无法跨设备同步
- **清除风险**: 清除浏览器数据会丢失所有保存的画布内容

### 3. 坐标系统
- **相对坐标**: 所有绘制操作都是基于变换后的坐标系统
- **文本定位**: 文本的基线对齐可能需要微调位置
- **边界问题**: 平移后可以绘制到原始画布边界之外，但这些内容在保存时会被裁剪

### 4. 浏览器兼容性
- **颜色选择器**: 所有现代浏览器都支持 `<input type="color">`
- **Canvas API**: 使用标准的 Canvas 2D API，兼容性良好
- **测试浏览器**: Chrome、Firefox、Safari、Edge 最新版本均已测试

### 5. 移动端支持
- **触摸事件**: 所有功能都支持触摸操作
- **响应式布局**: 控制区在小屏幕上会自动调整为垂直排列
- **提示**: 在移动设备上建议使用较大的画笔大小以便操作

---

## 更新日志

### v1.1.0 (2026-04-16)

**新增功能**:
- ✅ 颜色选择器功能 - 支持任意颜色选择
- ✅ 画笔大小调整 - 1-20px 可调范围
- ✅ 画布缩放功能 - 30%-300% 缩放范围
- ✅ 画布移动功能 - 上下左右平移
- ✅ 文本添加功能 - 支持添加自定义文本

**改进**:
- 📝 状态持久化 - 保存时同时保存缩放和偏移状态
- 🎨 样式优化 - 新增控制区分组样式，支持响应式布局
- 🐛 错误处理 - 增强状态解析的错误处理

**文件变更**:
- `index.js` - 新增控制元素 HTML 结构
- `assets/canvas-doodle.js` - 新增所有功能逻辑
- `assets/canvas-doodle.css` - 新增控件样式
- 新增 `test.html` - 功能测试页面
- 新增 `FEATURE_GUIDE.md` - 本功能说明文档

---

## 故障排除

### 常见问题

**Q1: 颜色选择器不显示颜色面板？**
A: 确保使用的是现代浏览器 (Chrome 49+, Firefox 28+, Safari 12.1+, Edge 79+)。某些旧浏览器可能不支持颜色输入类型。

**Q2: 缩放后绘制位置不正确？**
A: 这是预期行为。缩放后鼠标坐标会自动转换，绘制位置应该是正确的。如果确实有问题，请检查是否在缩放后重置了画布状态。

**Q3: 保存后重新加载，缩放状态没有恢复？**
A: 请确保使用的是 v1.1.0+ 版本。新版本会同时保存画布图像和状态信息。如果是旧版本保存的数据，状态信息可能不存在。

**Q4: 文本添加后无法编辑？**
A: 是的，文本一旦添加到画布上就成为图像的一部分，无法再编辑。这是 Canvas 的特性。如果需要可编辑的文本，建议使用 SVG 或 DOM 元素。

**Q5: 移动画布后，新绘制的内容位置偏移？**
A: 不会。坐标转换系统会自动处理偏移。绘制时使用的是变换后的坐标，新内容会正确绘制在鼠标点击位置。

### 调试技巧

1. **检查控制台**: 打开浏览器开发者工具 (F12)，查看 Console 面板是否有错误信息
2. **验证状态**: 在控制台输入 `window.HexoCanvasDoodleAPI['your-canvas-id']` 检查 API 是否可用
3. **清除存储**: 如果遇到保存/加载问题，可以尝试清除 localStorage:
   ```javascript
   localStorage.clear();  // 清除所有存储
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
