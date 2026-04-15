# Bug2.0 修复说明

## 问题描述

在 Hexo 7.3 版本中使用 `hexo-canvas-doodle` 插件时，出现以下错误：

```
Nunjucks Error: _posts/CLRS4th.md [Line 1, Column 4] unknown block tag: canvas
    =====               Context Dump               =====
    === (line number probably different from source) ===
  1 | {% canvas my-canvas 800 400 %}
    =====             Context Dump Ends            =====
```

错误信息表明 Hexo 无法识别 `{% canvas %}` 标签。

---

## 问题分析

### 初步排查

首先，我检查了以下内容：

1. ✅ `_config.yml` 配置正确：
   ```yaml
   plugins:
     - hexo-canvas-doodle
   ```

2. ✅ 文章中使用正确：
   ```markdown
   {% canvas my-canvas 800 400 %}
   ```

3. ✅ 插件文件存在于 `node_modules/hexo-canvas-doodle/`

### 添加调试信息

为了找出问题，我在插件的 `index.js` 中添加了详细的调试输出：

```javascript
console.log('[hexo-canvas-doodle] Plugin loading...');
console.log('[hexo-canvas-doodle] typeof hexo:', typeof hexo);
```

运行 `hexo generate` 后，**调试信息没有输出**，说明插件根本没有被加载！

### 深入分析 Hexo 插件加载机制

我查看了 Hexo 7.3 的源码 `node_modules/hexo/dist/hexo/load_plugins.js`：

```javascript
function loadModuleList(ctx, basedir) {
    const packagePath = (0, path_1.join)(basedir, 'package.json');
    // ...
    return (0, hexo_fs_1.readFile)(packagePath).then(content => {
        const json = JSON.parse(content);
        const deps = Object.keys(json.dependencies || {});
        const devDeps = Object.keys(json.devDependencies || {});
        // ...
    }).filter(name => {
        // Ignore plugins whose name is not started with "hexo-"
        if (!/^hexo-|^@[^/]+\/hexo-/.test(name))
            return false;
        // ...
    });
}
```

### 发现根本原因

**关键发现**：Hexo 7.x 只会加载 `package.json` 中 `dependencies` 或 `devDependencies` 里列出的插件！

让我检查博客的 `package.json`：

```bash
grep "hexo-canvas-doodle" package.json
# 输出：No matches found
```

**问题确认**：`hexo-canvas-doodle` 没有在 `package.json` 的 `dependencies` 中列出！

### 为什么之前的修复没有生效

我之前的修复（修改 `index.js`）没有解决根本问题，因为：

1. 插件文件虽然存在于 `node_modules/hexo-canvas-doodle/`
2. 但 Hexo 7.x 的 `load_plugins.js` 只会扫描 `package.json` 中列出的依赖
3. 所以插件根本没有被加载，`hexo.extend.tag.register` 从未执行

---

## 解决方案

有两种方案可以解决这个问题：

### 方案A：修改 package.json（推荐用于发布的插件）

在 `package.json` 的 `dependencies` 中添加插件：

```json
{
  "dependencies": {
    "hexo-canvas-doodle": "^1.0.0",
    ...
  }
}
```

**优点**：
- 符合 Hexo 标准插件机制
- 可以通过 npm 管理版本

**缺点**：
- 需要修改 `package.json`
- 如果是本地开发的插件，需要发布到 npm 或使用 `file:` 协议

### 方案B：使用 scripts 目录（推荐用于本地开发）

将插件脚本放到博客根目录的 `scripts/` 文件夹中，Hexo 会自动加载该目录下的所有 `.js` 文件。

**优点**：
- 不需要修改 `package.json`
- 适合本地开发和测试
- Hexo 会自动加载，无需任何配置

**缺点**：
- 不适合作为 npm 包发布
- 所有代码需要整合到一个文件中（或使用 require）

---

## 实施修复

用户选择了 **方案B：使用 scripts 目录**。

### 步骤1：创建 scripts 目录

在博客根目录创建 `scripts/` 文件夹：

```
blog/
├── scripts/
│   └── canvas-doodle.js    ← 新创建
├── source/
├── themes/
├── _config.yml
└── package.json
```

### 步骤2：整合插件代码

由于 `scripts/` 目录下的脚本会被 Hexo 自动加载，但需要注意：

1. 不能使用 `fs.readFileSync` 读取外部 CSS/JS 文件（路径问题）
2. 需要将 CSS 和 JS 内容直接嵌入到脚本中
3. 使用全局 `hexo` 变量注册标签

创建 `scripts/canvas-doodle.js`：

```javascript
/* global hexo */

'use strict';

console.log('[hexo-canvas-doodle] Plugin loading from scripts directory...');

if (typeof hexo !== 'undefined' && hexo.extend && hexo.extend.tag) {
  console.log('[hexo-canvas-doodle] hexo is available, registering tag...');
  
  // 将 CSS 内容直接嵌入
  const cssContent = `
.hexo-canvas-doodle-container {
  margin: 20px 0;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}
/* ... 其余 CSS 内容 ... */
`;

  // 将 JS 内容直接嵌入
  const jsContent = `
(function() {
  'use strict';
  // ... 画布交互逻辑 ...
})();
`;

  let resourcesInjected = false;

  hexo.extend.tag.register('canvas', function(args) {
    console.log('[hexo-canvas-doodle] canvas tag called with args:', args);
    
    const canvasId = args[0] || 'doodle-canvas-' + Math.random().toString(36).substr(2, 9);
    const width = args[1] || '800';
    const height = args[2] || '400';
    
    let resourcesHtml = '';
    if (!resourcesInjected) {
      resourcesInjected = true;
      resourcesHtml = '<style>' + cssContent + '</style><script>' + jsContent + '</script>';
    }
    
    const canvasHtml = resourcesHtml + 
      '<div class="hexo-canvas-doodle-container" data-canvas-id="' + canvasId + '">' +
        '<canvas id="' + canvasId + '" width="' + width + '" height="' + height + '" class="hexo-canvas-doodle"></canvas>' +
        // ... 控制按钮 ...
      '</div>';
    
    return canvasHtml;
  }, { ends: false });
  
  console.log('[hexo-canvas-doodle] Tag registered successfully!');
}
```

### 步骤3：验证修复

运行 `hexo clean && hexo generate`，观察输出：

```
INFO  Validating config
[hexo-canvas-doodle] Plugin loading from scripts directory...
[hexo-canvas-doodle] typeof hexo: object
[hexo-canvas-doodle] hexo is available, registering tag...
[hexo-canvas-doodle] Tag registered successfully!
INFO  Deleted database.
```

**插件现在被正确加载了！**

继续观察生成过程：

```
INFO  Start processing
[hexo-canvas-doodle] canvas tag called with args: [ 'my-canvas', '800', '400' ]
[hexo-canvas-doodle] canvasId: my-canvas
[hexo-canvas-doodle] width: 800
[hexo-canvas-doodle] height: 400
[hexo-canvas-doodle] Injecting resources for first time...
[hexo-canvas-doodle] Returning HTML, length: 7054
INFO  Files loaded in 1.54 s
...
INFO  Generated: 2026/03/31/CLRS4th/index.html
INFO  107 files generated in 2.53 s
```

**标签被正确调用，HTML 成功生成！**

### 步骤4：验证生成的 HTML

检查生成的 `public/2026/03/31/CLRS4th/index.html`：

```html
<!-- CSS 已注入 -->
<style>
.hexo-canvas-doodle-container {
  margin: 20px 0;
  ...
}
</style>

<!-- JS 已注入 -->
<script>
(function() {
  'use strict';
  ...
})();
</script>

<!-- 画布组件已生成 -->
<div class="hexo-canvas-doodle-container" data-canvas-id="my-canvas">
  <canvas id="my-canvas" width="800" height="400" class="hexo-canvas-doodle"></canvas>
  <div class="hexo-canvas-doodle-controls">
    <button class="hexo-canvas-btn hexo-canvas-clear" data-canvas-id="my-canvas">清除</button>
    <button class="hexo-canvas-btn hexo-canvas-save" data-canvas-id="my-canvas">保存</button>
    <button class="hexo-canvas-btn hexo-canvas-load" data-canvas-id="my-canvas">加载</button>
    <span class="hexo-canvas-status" data-canvas-id="my-canvas"></span>
  </div>
</div>
```

**所有内容都正确生成了！**

---

## 技术原理

### Hexo 插件加载机制详解

Hexo 有两种插件加载方式：

#### 方式1：npm 包插件（标准方式）

**加载流程**：
1. Hexo 读取 `package.json` 的 `dependencies` 和 `devDependencies`
2. 筛选出名字以 `hexo-` 开头的包
3. 使用 `require()` 加载这些包
4. 包中的代码使用全局 `hexo` 变量注册扩展

**代码位置**：`node_modules/hexo/dist/hexo/load_plugins.js`

```javascript
function loadModules(ctx) {
    return bluebird_1.default.map([ctx.base_dir, ctx.theme_dir], basedir => loadModuleList(ctx, basedir))
        .then(([hexoModuleList, themeModuleList]) => {
            return Object.entries(Object.assign(themeModuleList, hexoModuleList));
        })
        .map(([name, path]) => {
            return ctx.loadPlugin(path).then(() => {
                ctx.log.debug('Plugin loaded: %s', (0, picocolors_1.magenta)(name));
            });
        });
}
```

#### 方式2：scripts 目录脚本（本地方式）

**加载流程**：
1. Hexo 检查 `scripts/` 目录是否存在
2. 加载该目录下所有 `.js` 文件
3. 脚本中的代码使用全局 `hexo` 变量注册扩展

**代码位置**：`node_modules/hexo/dist/hexo/load_plugins.js`

```javascript
function loadScripts(ctx) {
    const baseDirLength = ctx.base_dir.length;
    return bluebird_1.default.filter([
        ctx.theme_script_dir,  // 主题的 scripts 目录
        ctx.script_dir          // 博客根目录的 scripts 目录
    ], scriptDir => {
        return scriptDir ? (0, hexo_fs_1.exists)(scriptDir) : false;
    }).map(scriptDir => (0, hexo_fs_1.listDir)(scriptDir).map(name => {
        const path = (0, path_1.join)(scriptDir, name);
        return ctx.loadPlugin(path).then(() => {
            ctx.log.debug('Script loaded: %s', displayPath(path, baseDirLength));
        });
    }));
}
```

### 两种方式的对比

| 特性 | npm 包插件 | scripts 目录脚本 |
|------|-----------|-----------------|
| 需要修改 package.json | ✅ 是 | ❌ 否 |
| 适合本地开发 | ❌ 否 | ✅ 是 |
| 适合发布 | ✅ 是 | ❌ 否 |
| 版本管理 | ✅ npm 管理 | ❌ 手动管理 |
| 多文件支持 | ✅ 可以使用 require | ⚠️ 需要手动处理 |

### 为什么 scripts 方式更可靠

1. **不依赖 package.json**：无论 `dependencies` 如何配置，`scripts/` 目录下的脚本都会被加载
2. **加载时机更早**：`loadScripts()` 和 `loadModules()` 是并行执行的
3. **调试更方便**：修改脚本后直接运行 `hexo generate` 即可看到效果
4. **适合快速原型**：不需要发布到 npm 就可以测试

---

## 经验教训

### 教训1：理解 Hexo 的插件加载机制

在开发 Hexo 插件之前，必须理解：

1. **Hexo 7.x 只会加载 `package.json` 中列出的插件**
2. **`scripts/` 目录是本地开发的最佳选择**
3. **全局 `hexo` 变量在插件加载时可用**

### 教训2：添加调试信息的重要性

如果没有添加调试信息：
```javascript
console.log('[hexo-canvas-doodle] Plugin loading...');
```

我可能永远不会发现插件根本没有被加载，而是在错误的方向上浪费时间。

### 教训3：查看源码是解决问题的关键

当文档不明确或行为不符合预期时：
1. 查看 Hexo 的源码（`node_modules/hexo/dist/`）
2. 理解 `load_plugins.js` 的工作原理
3. 对比其他成功运行的插件（如 `hexo-math`）

### 教训4：本地开发 vs 发布

**本地开发阶段**：
- 使用 `scripts/` 目录
- 快速迭代，无需修改 `package.json`
- 所有代码整合到一个文件中

**发布阶段**：
- 重构为标准 npm 包结构
- 在 `package.json` 中声明依赖
- 使用 `fs.readFileSync` 读取外部资源文件

---

## 最终文件结构

### 开发项目（trae0415/）

```
trae0415/
├── index.js                    # 原始插件入口（npm 包格式）
├── package.json                # 插件配置
├── assets/
│   ├── canvas-doodle.css       # 样式文件
│   └── canvas-doodle.js        # 前端逻辑
├── README.md                   # 项目说明
├── USER_GUIDE.md               # 用户手册
├── BUG0_FIX.md                 # 第一次修复记录
└── BUG2.0_FIX.md               # 本次修复记录（本文档）
```

### Hexo 博客（blog/）

```
blog/
├── scripts/
│   └── canvas-doodle.js        # 整合后的脚本（CSS/JS 直接嵌入）
├── source/
│   └── _posts/
│       └── CLRS4th.md          # 使用 {% canvas %} 标签
├── node_modules/
│   └── hexo-canvas-doodle/     # 原始插件文件（不再使用）
├── _config.yml
└── package.json
```

---

## 验证步骤

### 步骤1：清理并生成

```bash
cd C:\Users\Ha ha\Desktop\HexoBlog\blog
hexo clean
hexo generate
```

### 步骤2：检查输出

确认看到以下调试信息：
```
[hexo-canvas-doodle] Plugin loading from scripts directory...
[hexo-canvas-doodle] hexo is available, registering tag...
[hexo-canvas-doodle] Tag registered successfully!
[hexo-canvas-doodle] canvas tag called with args: [ 'my-canvas', '800', '400' ]
```

### 步骤3：检查生成的 HTML

打开 `public/2026/03/31/CLRS4th/index.html`，确认包含：
- `<style>` 标签中的 CSS 样式
- `<script>` 标签中的 JS 逻辑
- `<canvas>` 元素和控制按钮

### 步骤4：启动服务器测试

```bash
hexo server
```

访问 `http://localhost:4000/2026/03/31/CLRS4th/`，测试：
1. 画布是否显示
2. 是否可以涂鸦
3. 保存/加载功能是否正常

---

## 相关文件

- **修复前**：`node_modules/hexo-canvas-doodle/index.js`
- **修复后**：`scripts/canvas-doodle.js`
- **本文档**：`BUG2.0_FIX.md`

---

## 总结

### 问题根因

| 层级 | 问题 | 说明 |
|------|------|------|
| 表象 | `unknown block tag: canvas` | 标签未注册 |
| 中间 | 插件未加载 | 调试信息无输出 |
| 根本 | 不在 `package.json` 依赖中 | Hexo 7.x 只加载列出的插件 |

### 解决方案

| 方案 | 适用场景 | 实施方式 |
|------|----------|----------|
| 方案A | 发布的 npm 包 | 在 `package.json` 中添加依赖 |
| 方案B | 本地开发 | 使用 `scripts/` 目录 |

### 关键知识点

1. **Hexo 7.x 插件加载机制**：只加载 `package.json` 中 `dependencies` 列出的、名字以 `hexo-` 开头的包
2. **`scripts/` 目录**：Hexo 会自动加载该目录下的所有 `.js` 文件，无需任何配置
3. **调试技巧**：在插件中添加 `console.log` 确认是否被加载
4. **源码分析**：当遇到问题时，查看 `node_modules/hexo/dist/hexo/load_plugins.js` 理解加载机制

---

**修复日期**：2026-04-15  
**影响版本**：hexo-canvas-doodle v1.0.0 + Hexo 7.3.0  
**修复状态**：已完成 ✅
