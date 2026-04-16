# Bug3.0 修复说明

## 问题描述

在 Hexo 7.3 版本中使用 `hexo-canvas-doodle` 插件时，运行 `hexo generate` 出现以下错误：

```
ReferenceError: document is not defined
    at Object.<anonymous> (...\scripts\canvas-doodle.js:7:16)
    ...
```

错误表明在 Node.js 环境中执行代码时，`document` 对象未定义。

---

## 问题分析

### 根本原因

**`scripts/` 目录下的文件会被 Hexo（Node.js 环境）直接 `require()` 执行**。

原来的 `scripts/canvas-doodle.js` 文件内容是**纯浏览器端代码**：

```javascript
// ❌ 错误的代码结构
(function() {
  'use strict';
  
  const canvases = {};
  
  function initCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);  // ❌ 这里直接访问 document
    // ...
  }
  
  // ... 更多浏览器端代码 ...
  
  document.addEventListener('click', function(e) {  // ❌ 这里也直接访问 document
    // ...
  });
  
  if (document.readyState === 'loading') {  // ❌ 这里也直接访问 document
    document.addEventListener('DOMContentLoaded', initAllCanvases);
  } else {
    initAllCanvases();
  }
})();  // ❌ 立即执行函数，在 require() 时就会执行
```

**问题流程**：
```
1. Hexo 启动
2. Hexo 加载 scripts/ 目录下的所有 .js 文件
3. 使用 require() 执行 scripts/canvas-doodle.js
4. 立即执行函数 (function() { ... })() 被调用
5. 代码尝试访问 document.getElementById()
6. Node.js 环境中没有 document 对象
7. 抛出 ReferenceError: document is not defined
```

### 为什么之前的修复没有生效

根据 `BUG2.0_FIX.md`，`scripts/` 目录方式是推荐的本地开发方式。但是：

| 层级 | 问题 | 说明 |
|------|------|------|
| 表象 | `ReferenceError: document is not defined` | 浏览器 API 在 Node.js 中执行 |
| 中间 | 立即执行函数在 `require()` 时执行 | `(function() { ... })()` 被直接执行 |
| 根本 | 代码没有区分 Node.js 端和浏览器端 | 所有代码都放在同一个立即执行函数中 |

### 两种执行环境的区别

| 特性 | Node.js 环境（Hexo 构建时） | 浏览器环境（页面运行时） |
|------|---------------------------|------------------------|
| 可用对象 | `require`, `module`, `hexo` | `document`, `window`, `canvas` |
| 代码来源 | `scripts/*.js` 文件 | `<script>` 标签中的代码 |
| 执行时机 | `hexo generate` 时 | 页面加载时 |
| 应该执行的代码 | 标签注册逻辑 | 画布交互逻辑 |

---

## 解决方案

### 核心思路

**将代码分离为两部分**：

1. **Node.js 端代码**（直接执行）：
   - 使用 `hexo.extend.tag.register` 注册标签
   - 不访问任何浏览器 API（`document`, `window` 等）

2. **浏览器端代码**（作为字符串嵌入）：
   - CSS 样式
   - JavaScript 交互逻辑
   - 这些代码作为字符串存储，只有在浏览器中通过 `<script>` 标签执行时才会运行

### 修复后的代码结构

```javascript
// ✅ 正确的代码结构

/* global hexo */

'use strict';

// 1. CSS 内容作为字符串（不会执行，只是存储）
const cssContent = `
.hexo-canvas-doodle-container {
  margin: 20px 0;
  // ... 更多 CSS
}
`;

// 2. JS 内容作为字符串（不会执行，只是存储）
const jsContent = `
(function() {
  'use strict';
  // ... 所有浏览器端代码，包括 document 访问
  // 这部分代码作为字符串存储，不会在 Node.js 中执行
})();
`;

// 3. Node.js 端代码（直接执行，但不访问浏览器 API）
let resourcesInjected = false;

if (typeof hexo !== 'undefined' && hexo.extend && hexo.extend.tag) {
  console.log('[hexo-canvas-doodle] hexo is available, registering tag...');
  
  hexo.extend.tag.register('canvas', function(args) {
    const canvasId = args[0] || 'doodle-canvas-' + Math.random().toString(36).substr(2, 9);
    const width = args[1] || '800';
    const height = args[2] || '400';
    
    // 第一次调用时，将 CSS 和 JS 字符串包装成 HTML 标签
    let resourcesHtml = '';
    if (!resourcesInjected) {
      resourcesInjected = true;
      resourcesHtml = '<style>' + cssContent + '</style><script>' + jsContent + '</script>';
    }
    
    // 返回完整的 HTML（包含 <style> 和 <script> 标签）
    const canvasHtml = resourcesHtml + 
      '<div class="hexo-canvas-doodle-container" data-canvas-id="' + canvasId + '">' +
        // ... 更多 HTML
      '</div>';
    
    return canvasHtml;
  }, { ends: false, async: false });
  
  console.log('[hexo-canvas-doodle] Tag registered successfully!');
}
```

### 执行流程对比

**修复前（错误）**：
```
Node.js 环境                    浏览器环境
    │                              │
    │ require(canvas-doodle.js)   │
    │                              │
    │ 立即执行函数被调用           │
    │ ┌────────────────────────┐  │
    │ │ (function() {          │  │
    │ │   document.getElementById │─┼─→ ❌ ReferenceError!
    │ │   ...                   │  │
    │ │ })();                   │  │
    │ └────────────────────────┘  │
    │                              │
```

**修复后（正确）**：
```
Node.js 环境                    浏览器环境
    │                              │
    │ require(canvas-doodle.js)   │
    │                              │
    │ 定义 cssContent 字符串      │
    │ 定义 jsContent 字符串       │
    │ 注册 canvas 标签            │
    │                              │
    │ 标签被调用时                 │
    │ 返回 HTML 字符串             │
    │ ┌────────────────────────┐  │
    │ │ '<style>' + cssContent │  │
    │ │ + '</style>'           │  │
    │ │ + '<script>' + jsContent│  │
    │ │ + '</script>'          │  │
    │ │ + '...'                │  │
    │ └────────────────────────┘  │
    │           │                  │
    │           ▼                  │
    │ HTML 被写入生成的文件        │
    │                              │
    │                              │ 页面加载时
    │                              │ <script> 标签执行
    │                              │ ┌────────────────────┐
    │                              │ │ jsContent 中的代码 │
    │                              │ │ 访问 document     │
    │                              │ │ 正常执行           │
    │                              │ └────────────────────┘
```

### 关键修改点

#### 1. 移除立即执行函数包装

**修改前**：
```javascript
// ❌ 整个文件被立即执行函数包裹
(function() {
  'use strict';
  
  // 所有代码都在这里，包括浏览器端代码
  const canvas = document.getElementById(canvasId);  // ❌ Node.js 中执行
})();
```

**修改后**：
```javascript
// ✅ 移除立即执行函数，Node.js 端代码直接在顶层
/* global hexo */

'use strict';

// Node.js 端代码
console.log('[hexo-canvas-doodle] Loading from scripts directory...');

// 浏览器端代码作为字符串存储
const jsContent = `
(function() {
  'use strict';
  // 浏览器端代码在这里，作为字符串
  // 不会在 Node.js 中执行
})();
`;
```

#### 2. 使用字符串模板存储浏览器端代码

**修改前**：
```javascript
// ❌ 浏览器端代码直接写在文件中，会被执行
function initCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  // ...
}

document.addEventListener('click', function(e) {
  // ...
});
```

**修改后**：
```javascript
// ✅ 浏览器端代码作为字符串存储，不会被执行
const jsContent = `
(function() {
  'use strict';
  
  function initCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    // ...
  }
  
  document.addEventListener('click', function(e) {
    // ...
  });
})();
`;
```

#### 3. 使用字符串拼接而非模板字符串（可选优化）

为了避免浏览器端代码中的模板字符串与 Node.js 端的模板字符串冲突，可以使用单引号或双引号进行字符串拼接：

```javascript
// 方式 A：使用模板字符串（需要注意内部的反引号）
const jsContent = `
(function() {
  // 内部使用模板字符串需要转义
  const str = \`Hello \${name}\`;  // 注意：需要转义
})();
`;

// 方式 B：使用字符串拼接（更安全）
const jsContent = '(function() {' +
  '  \'use strict\';' +
  '  // 代码在这里' +
  '})();';
```

在本次修复中，我选择了**字符串拼接**的方式，避免了模板字符串嵌套的问题：

```javascript
// 简单的字符串拼接
canvas.style.transform = 'translate(' + cameraX + 'px, ' + cameraY + 'px) scale(' + cameraZoom + ')';

// 而不是模板字符串
// canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`;
```

---

## 实施修复

### 步骤1：修改 scripts/canvas-doodle.js

将 `blog/scripts/canvas-doodle.js` 替换为新的结构：

1. **文件头部**：添加 `/* global hexo */` 声明，移除立即执行函数
2. **CSS 内容**：使用模板字符串存储 CSS
3. **JS 内容**：使用字符串拼接存储浏览器端 JS 代码
4. **标签注册**：检查 `hexo` 是否可用，然后注册标签

### 步骤2：清理并重新生成

```bash
cd C:\Users\Ha ha\Desktop\HexoBlog\blog
hexo clean
hexo generate
```

### 步骤3：验证输出

确认看到以下调试信息：

```
INFO  Validating config
[hexo-canvas-doodle] Loading from scripts directory...
[hexo-canvas-doodle] hexo is available, registering tag...
[hexo-canvas-doodle] Tag registered successfully!
...
INFO  Start processing
[hexo-canvas-doodle] canvas tag called with args: [ 'my-canvas', '800', '400' ]
[hexo-canvas-doodle] Injecting resources for first time...
[hexo-canvas-doodle] Returning HTML, length: 23624
...
INFO  Generated: 2026/03/31/CLRS4th/index.html
INFO  107 files generated in 3.81 s
```

**不再出现 `ReferenceError: document is not defined` 错误！**

---

## 技术原理

### Hexo 脚本加载机制

Hexo 加载 `scripts/` 目录的流程：

```javascript
// 简化版 Hexo 源码逻辑
function loadScripts(ctx) {
  const scriptDir = ctx.script_dir;  // blog/scripts/
  
  // 列出所有 .js 文件
  const files = listDir(scriptDir).filter(name => name.endsWith('.js'));
  
  // 逐个加载
  for (const file of files) {
    const path = join(scriptDir, file);
    ctx.loadPlugin(path);  // 使用 require() 执行
  }
}
```

**关键点**：
- `ctx.loadPlugin(path)` 内部使用 `require()` 执行文件
- `require()` 会执行文件中的所有顶层代码
- 如果文件中有立即执行函数 `(function() { ... })()`，它会被立即调用

### 为什么模板字符串不会被执行

当你写：

```javascript
const jsContent = `
(function() {
  console.log('Hello');
  document.getElementById('test');
})();
`;
```

这个代码**不会被执行**，因为：

1. `jsContent` 是一个字符串变量
2. 反引号 `\`` 之间的内容只是字符串值
3. 只有当这个字符串被放入 `<script>` 标签并在浏览器中加载时，才会被执行

**执行时机**：

| 阶段 | 代码位置 | 执行状态 |
|------|---------|---------|
| Node.js 加载时 | `const jsContent = \`...\`;` | 字符串被赋值，不执行 |
| 标签被调用时 | `'<script>' + jsContent + '</script>'` | 字符串被拼接，不执行 |
| 页面加载时 | 浏览器解析 `<script>` 标签 | 字符串内容作为 JS 执行 |

### 如何区分 Node.js 和浏览器环境

可以通过以下方式检测当前运行环境：

```javascript
// 方式 1：检测 document
if (typeof document !== 'undefined') {
  console.log('在浏览器环境中');
} else {
  console.log('在 Node.js 环境中');
}

// 方式 2：检测 window
if (typeof window !== 'undefined') {
  console.log('在浏览器环境中');
}

// 方式 3：检测 module（CommonJS）
if (typeof module !== 'undefined' && module.exports) {
  console.log('在 Node.js/CommonJS 环境中');
}

// 方式 4：检测 process
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  console.log('在 Node.js 环境中，版本:', process.versions.node);
}
```

在本次修复中，我们主要通过**代码结构分离**来避免环境问题，而不是在运行时检测。

---

## 经验教训

### 教训1：理解 scripts/ 目录的执行方式

**错误认知**：
> `scripts/` 目录下的文件是用于生成 HTML 的，不会被直接执行。

**正确认知**：
> `scripts/` 目录下的文件会被 Hexo 使用 `require()` 直接执行，所有顶层代码都会在 Node.js 环境中运行。

### 教训2：区分服务端和客户端代码

在开发 Hexo 插件时，必须清楚区分：

| 代码类型 | 运行环境 | 可用 API | 存储方式 |
|---------|---------|---------|---------|
| 服务端代码 | Node.js | `hexo`, `require`, `fs` | 直接写在文件中 |
| 客户端代码 | 浏览器 | `document`, `window`, `canvas` | 作为字符串存储 |

### 教训3：避免立即执行函数的陷阱

**危险模式**：
```javascript
// ❌ 整个文件被立即执行函数包裹
(function() {
  // 所有代码都在这里
  // 如果有浏览器 API，Node.js 中会报错
})();
```

**安全模式**：
```javascript
// ✅ 模块级代码，按需导出或执行
'use strict';

// 服务端代码直接写在这里
function registerTag() {
  // ...
}

// 客户端代码作为字符串
const clientCode = `
(function() {
  // 浏览器端代码
})();
`;

// 只在需要时执行服务端逻辑
if (typeof hexo !== 'undefined') {
  registerTag();
}
```

### 教训4：使用字符串嵌入客户端资源

对于需要在浏览器中运行的代码，最佳实践是：

1. **CSS**：作为字符串嵌入到 `<style>` 标签
2. **JavaScript**：作为字符串嵌入到 `<script>` 标签
3. **避免**：使用 `fs.readFileSync` 读取外部文件（路径问题）
4. **避免**：使用 `require()` 加载客户端代码（会执行）

---

## 文件对比

### 修改前

```
scripts/canvas-doodle.js
├── 立即执行函数包裹整个文件
├── 直接访问 document.getElementById()
├── 直接添加 document 事件监听器
└── 所有代码在 require() 时执行
```

### 修改后

```
scripts/canvas-doodle.js
├── 服务端代码（直接执行）
│   ├── 检查 hexo 是否可用
│   ├── 注册 canvas 标签
│   └── 不访问任何浏览器 API
├── cssContent（字符串，不执行）
│   └── 所有 CSS 样式
└── jsContent（字符串，不执行）
    └── 所有浏览器端 JS 代码
```

---

## 相关文档

- **BUG0_FIX.md**：第一次修复 - 资源注入时机问题
- **BUG2.0_FIX.md**：第二次修复 - 插件加载机制问题
- **BUG3.0_FIX.md**：本次修复 - 浏览器代码在 Node.js 中执行问题

---

## 验证步骤

### 步骤1：清理缓存

```bash
cd C:\Users\Ha ha\Desktop\HexoBlog\blog
hexo clean
```

### 步骤2：重新生成

```bash
hexo generate
```

### 步骤3：检查输出

确认：
- ✅ 没有 `ReferenceError: document is not defined` 错误
- ✅ 看到 `[hexo-canvas-doodle] Tag registered successfully!`
- ✅ 看到 `[hexo-canvas-doodle] canvas tag called with args: [...]`
- ✅ 文章 `CLRS4th/index.html` 成功生成

### 步骤4：启动服务器测试（可选）

```bash
hexo server
```

访问 `http://localhost:4000/2026/03/31/CLRS4th/`，验证：
- ✅ 画布组件正常显示
- ✅ 可以绘制涂鸦
- ✅ 缩放和移动功能正常
- ✅ 保存/加载功能正常

---

## 总结

### 问题根因

| 层级 | 问题 | 说明 |
|------|------|------|
| 表象 | `ReferenceError: document is not defined` | 浏览器 API 在 Node.js 中执行 |
| 中间 | 立即执行函数在 `require()` 时执行 | `(function() { ... })()` 被直接调用 |
| 根本 | 代码没有区分服务端和客户端 | 所有代码放在同一个立即执行函数中 |

### 解决方案

| 修改项 | 修改方式 | 效果 |
|--------|----------|------|
| 代码结构 | 分离服务端和客户端代码 | 服务端代码在 Node.js 中执行 |
| CSS 存储 | 使用字符串模板 | 不会被执行，只是存储 |
| JS 存储 | 使用字符串拼接 | 不会被执行，只是存储 |
| 执行时机 | 只有 `<script>` 标签中的代码在浏览器执行 | 浏览器 API 只在浏览器中调用 |

### 关键知识点

1. **`scripts/` 目录执行方式**：文件会被 `require()` 执行，顶层代码立即运行
2. **立即执行函数陷阱**：`(function() { ... })()` 在 `require()` 时会被调用
3. **字符串不执行**：模板字符串或引号中的内容只是值，不会被执行
4. **环境分离**：服务端代码直接写，客户端代码存为字符串

---

**修复日期**：2026-04-16  
**影响版本**：hexo-canvas-doodle v1.2.0 + Hexo 7.3.0  
**修复状态**：已完成 ✅
