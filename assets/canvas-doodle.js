(function() {
  'use strict';
  
  const canvases = {};
  
  function initCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvases[canvasId]) return;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let strokeColor = '#000000';
    let lineWidth = 3;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let isAddingText = false;
    let textToAdd = '';
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = '16px Arial';
    ctx.fillStyle = strokeColor;
    
    function getPosition(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      const canvasX = (clientX - rect.left) * scaleX;
      const canvasY = (clientY - rect.top) * scaleY;
      
      return {
        x: (canvasX - offsetX) / scale,
        y: (canvasY - offsetY) / scale
      };
    }
    
    function startDrawing(e) {
      e.preventDefault();
      
      if (isAddingText && textToAdd) {
        const pos = getPosition(e);
        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        ctx.fillStyle = strokeColor;
        ctx.font = `${Math.max(12, lineWidth * 4)}px Arial`;
        ctx.fillText(textToAdd, pos.x, pos.y);
        ctx.restore();
        isAddingText = false;
        textToAdd = '';
        showStatus(canvasId, '文本已添加！', 'success');
        return;
      }
      
      isDrawing = true;
      const pos = getPosition(e);
      lastX = pos.x;
      lastY = pos.y;
    }
    
    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      
      const pos = getPosition(e);
      
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      
      lastX = pos.x;
      lastY = pos.y;
    }
    
    function stopDrawing() {
      isDrawing = false;
    }
    
    function updateZoomLevel() {
      const zoomLevelEl = document.querySelector(`.hexo-canvas-zoom-level[data-canvas-id="${canvasId}"]`);
      if (zoomLevelEl) {
        zoomLevelEl.textContent = Math.round(scale * 100) + '%';
      }
    }
    
    function zoomIn() {
      if (scale < 3) {
        scale *= 1.2;
        updateZoomLevel();
        showStatus(canvasId, '已放大', '');
      }
    }
    
    function zoomOut() {
      if (scale > 0.3) {
        scale /= 1.2;
        updateZoomLevel();
        showStatus(canvasId, '已缩小', '');
      }
    }
    
    function zoomReset() {
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      updateZoomLevel();
      showStatus(canvasId, '缩放已重置', '');
    }
    
    function panUp() {
      offsetY += 50;
      showStatus(canvasId, '已向上移动', '');
    }
    
    function panDown() {
      offsetY -= 50;
      showStatus(canvasId, '已向下移动', '');
    }
    
    function panLeft() {
      offsetX += 50;
      showStatus(canvasId, '已向左移动', '');
    }
    
    function panRight() {
      offsetX -= 50;
      showStatus(canvasId, '已向右移动', '');
    }
    
    function setColor(color) {
      strokeColor = color;
    }
    
    function setLineWidth(width) {
      lineWidth = width;
      const widthValueEl = document.querySelector(`.hexo-canvas-line-width-value[data-canvas-id="${canvasId}"]`);
      if (widthValueEl) {
        widthValueEl.textContent = width + 'px';
      }
    }
    
    function prepareAddText() {
      const textInput = document.querySelector(`.hexo-canvas-text-input[data-canvas-id="${canvasId}"]`);
      if (textInput) {
        const text = textInput.value.trim();
        if (text) {
          isAddingText = true;
          textToAdd = text;
          showStatus(canvasId, '点击画布添加文本: ' + text, '');
          canvas.style.cursor = 'text';
        } else {
          showStatus(canvasId, '请先输入文本内容', 'error');
        }
      }
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    
    canvases[canvasId] = {
      canvas: canvas,
      ctx: ctx,
      getState: function() {
        return {
          strokeColor: strokeColor,
          lineWidth: lineWidth,
          scale: scale,
          offsetX: offsetX,
          offsetY: offsetY
        };
      },
      setState: function(state) {
        if (state.strokeColor) strokeColor = state.strokeColor;
        if (state.lineWidth) lineWidth = state.lineWidth;
        if (state.scale) scale = state.scale;
        if (state.offsetX !== undefined) offsetX = state.offsetX;
        if (state.offsetY !== undefined) offsetY = state.offsetY;
        updateZoomLevel();
      }
    };
    
    window.HexoCanvasDoodleAPI = window.HexoCanvasDoodleAPI || {};
    window.HexoCanvasDoodleAPI[canvasId] = {
      setColor: setColor,
      setLineWidth: setLineWidth,
      zoomIn: zoomIn,
      zoomOut: zoomOut,
      zoomReset: zoomReset,
      panUp: panUp,
      panDown: panDown,
      panLeft: panLeft,
      panRight: panRight,
      prepareAddText: prepareAddText
    };
    
    loadCanvas(canvasId);
  }
  
  function saveCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) return false;
    
    try {
      const dataURL = canvasData.canvas.toDataURL('image/png');
      localStorage.setItem('hexo-canvas-' + canvasId, dataURL);
      
      const state = canvasData.getState();
      localStorage.setItem('hexo-canvas-state-' + canvasId, JSON.stringify(state));
      
      showStatus(canvasId, '保存成功！', 'success');
      return true;
    } catch (e) {
      showStatus(canvasId, '保存失败：' + e.message, 'error');
      return false;
    }
  }
  
  function loadCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) return false;
    
    try {
      const dataURL = localStorage.getItem('hexo-canvas-' + canvasId);
      if (!dataURL) {
        showStatus(canvasId, '暂无保存的内容', '');
        return false;
      }
      
      const stateStr = localStorage.getItem('hexo-canvas-state-' + canvasId);
      if (stateStr) {
        try {
          const state = JSON.parse(stateStr);
          canvasData.setState(state);
        } catch (e) {
          console.error('Failed to parse canvas state:', e);
        }
      }
      
      const img = new Image();
      img.onload = function() {
        canvasData.ctx.clearRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
        canvasData.ctx.drawImage(img, 0, 0);
        showStatus(canvasId, '加载成功！', 'success');
      };
      img.onerror = function() {
        showStatus(canvasId, '加载失败：图片格式错误', 'error');
      };
      img.src = dataURL;
      return true;
    } catch (e) {
      showStatus(canvasId, '加载失败：' + e.message, 'error');
      return false;
    }
  }
  
  function clearCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) return false;
    
    try {
      canvasData.ctx.clearRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
      showStatus(canvasId, '画布已清除', '');
      return true;
    } catch (e) {
      showStatus(canvasId, '清除失败：' + e.message, 'error');
      return false;
    }
  }
  
  function showStatus(canvasId, message, type) {
    const statusEl = document.querySelector(`.hexo-canvas-status[data-canvas-id="${canvasId}"]`);
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = 'hexo-canvas-status';
      if (type) {
        statusEl.classList.add(type);
      }
      
      setTimeout(function() {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
          statusEl.className = 'hexo-canvas-status';
        }
      }, 3000);
    }
  }
  
  function initAllCanvases() {
    const canvasElements = document.querySelectorAll('.hexo-canvas-doodle');
    canvasElements.forEach(function(canvas) {
      if (canvas.id) {
        initCanvas(canvas.id);
      }
    });
  }
  
  document.addEventListener('click', function(e) {
    const target = e.target;
    
    if (target.classList.contains('hexo-canvas-clear')) {
      const canvasId = target.getAttribute('data-canvas-id');
      clearCanvas(canvasId);
    }
    
    if (target.classList.contains('hexo-canvas-save')) {
      const canvasId = target.getAttribute('data-canvas-id');
      saveCanvas(canvasId);
    }
    
    if (target.classList.contains('hexo-canvas-load')) {
      const canvasId = target.getAttribute('data-canvas-id');
      loadCanvas(canvasId);
    }
    
    if (target.classList.contains('hexo-canvas-zoom-in')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].zoomIn();
      }
    }
    
    if (target.classList.contains('hexo-canvas-zoom-out')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].zoomOut();
      }
    }
    
    if (target.classList.contains('hexo-canvas-zoom-reset')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].zoomReset();
      }
    }
    
    if (target.classList.contains('hexo-canvas-pan-up')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].panUp();
      }
    }
    
    if (target.classList.contains('hexo-canvas-pan-down')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].panDown();
      }
    }
    
    if (target.classList.contains('hexo-canvas-pan-left')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].panLeft();
      }
    }
    
    if (target.classList.contains('hexo-canvas-pan-right')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].panRight();
      }
    }
    
    if (target.classList.contains('hexo-canvas-add-text')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].prepareAddText();
      }
    }
  });
  
  document.addEventListener('input', function(e) {
    const target = e.target;
    
    if (target.classList.contains('hexo-canvas-color-picker')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].setColor(target.value);
      }
    }
    
    if (target.classList.contains('hexo-canvas-line-width')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].setLineWidth(parseInt(target.value));
      }
    }
  });
  
  document.addEventListener('change', function(e) {
    const target = e.target;
    
    if (target.classList.contains('hexo-canvas-color-picker')) {
      const canvasId = target.getAttribute('data-canvas-id');
      if (window.HexoCanvasDoodleAPI && window.HexoCanvasDoodleAPI[canvasId]) {
        window.HexoCanvasDoodleAPI[canvasId].setColor(target.value);
      }
    }
  });
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllCanvases);
  } else {
    initAllCanvases();
  }
  
  window.HexoCanvasDoodle = {
    save: saveCanvas,
    load: loadCanvas,
    clear: clearCanvas,
    init: initCanvas
  };
})();