(function() {
  'use strict';
  
  const canvases = {};
  
  function initCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvases[canvasId]) return;
    
    const container = canvas.closest('.hexo-canvas-doodle-container');
    const ctx = canvas.getContext('2d');
    
    let isDrawing = false;
    let lastCanvasX = 0;
    let lastCanvasY = 0;
    
    let isPanning = false;
    let lastPanScreenX = 0;
    let lastPanScreenY = 0;
    
    let spaceKeyPressed = false;
    
    let cameraX = 0;
    let cameraY = 0;
    let cameraZoom = 1;
    
    let strokeColor = '#000000';
    let lineWidth = 3;
    let isAddingText = false;
    let textToAdd = '';
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = '16px Arial';
    
    function applyCameraTransform() {
      canvas.style.transformOrigin = '0 0';
      canvas.style.transform = `translate(${cameraX}px, ${cameraY}px) scale(${cameraZoom})`;
    }
    
    function getMousePositionOnCanvas(e) {
      const rect = canvas.getBoundingClientRect();
      
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
    
    function updateZoomLevel() {
      const zoomLevelEl = document.querySelector(`.hexo-canvas-zoom-level[data-canvas-id="${canvasId}"]`);
      if (zoomLevelEl) {
        zoomLevelEl.textContent = Math.round(cameraZoom * 100) + '%';
      }
    }
    
    function updateCursor() {
      if (isPanning) {
        canvas.style.cursor = 'grabbing';
      } else if (isAddingText) {
        canvas.style.cursor = 'text';
      } else if (spaceKeyPressed) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    }
    
    function startDrawing(e) {
      e.preventDefault();
      
      if (isAddingText && textToAdd) {
        const pos = getMousePositionOnCanvas(e);
        
        ctx.save();
        ctx.fillStyle = strokeColor;
        ctx.font = `${Math.max(12, lineWidth * 4)}px Arial`;
        ctx.fillText(textToAdd, pos.x, pos.y);
        ctx.restore();
        
        isAddingText = false;
        textToAdd = '';
        updateCursor();
        showStatus(canvasId, '文本已添加！', 'success');
        return;
      }
      
      if (e.button === 1 || (e.button === 0 && spaceKeyPressed)) {
        isPanning = true;
        
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        lastPanScreenX = clientX;
        lastPanScreenY = clientY;
        updateCursor();
        return;
      }
      
      if (e.button === 0) {
        isDrawing = true;
        const pos = getMousePositionOnCanvas(e);
        lastCanvasX = pos.x;
        lastCanvasY = pos.y;
      }
    }
    
    function draw(e) {
      e.preventDefault();
      
      if (isPanning) {
        let clientX, clientY;
        if (e.touches && e.touches.length > 0) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
        } else {
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        const deltaX = clientX - lastPanScreenX;
        const deltaY = clientY - lastPanScreenY;
        
        cameraX += deltaX;
        cameraY += deltaY;
        
        lastPanScreenX = clientX;
        lastPanScreenY = clientY;
        
        applyCameraTransform();
        updateZoomLevel();
        return;
      }
      
      if (!isDrawing) return;
      
      const pos = getMousePositionOnCanvas(e);
      
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(lastCanvasX, lastCanvasY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      
      lastCanvasX = pos.x;
      lastCanvasY = pos.y;
    }
    
    function stopDrawing(e) {
      if (isPanning) {
        isPanning = false;
        updateCursor();
        return;
      }
      
      isDrawing = false;
    }
    
    function handleWheel(e) {
      e.preventDefault();
      
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - cameraX) / cameraZoom;
      const worldY = (mouseY - cameraY) / cameraZoom;
      
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.max(0.1, Math.min(10, cameraZoom + delta));
      
      if (newZoom !== cameraZoom) {
        cameraZoom = newZoom;
        
        cameraX = mouseX - worldX * cameraZoom;
        cameraY = mouseY - worldY * cameraZoom;
        
        applyCameraTransform();
        updateZoomLevel();
      }
    }
    
    function zoomIn() {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const worldX = (centerX - cameraX) / cameraZoom;
      const worldY = (centerY - cameraY) / cameraZoom;
      
      cameraZoom = Math.min(10, cameraZoom * 1.2);
      
      cameraX = centerX - worldX * cameraZoom;
      cameraY = centerY - worldY * cameraZoom;
      
      applyCameraTransform();
      updateZoomLevel();
      showStatus(canvasId, '已放大', '');
    }
    
    function zoomOut() {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const worldX = (centerX - cameraX) / cameraZoom;
      const worldY = (centerY - cameraY) / cameraZoom;
      
      cameraZoom = Math.max(0.1, cameraZoom / 1.2);
      
      cameraX = centerX - worldX * cameraZoom;
      cameraY = centerY - worldY * cameraZoom;
      
      applyCameraTransform();
      updateZoomLevel();
      showStatus(canvasId, '已缩小', '');
    }
    
    function zoomReset() {
      cameraZoom = 1;
      cameraX = 0;
      cameraY = 0;
      applyCameraTransform();
      updateZoomLevel();
      showStatus(canvasId, '缩放已重置', '');
    }
    
    function panUp() {
      cameraY += 50;
      applyCameraTransform();
      showStatus(canvasId, '已向上移动', '');
    }
    
    function panDown() {
      cameraY -= 50;
      applyCameraTransform();
      showStatus(canvasId, '已向下移动', '');
    }
    
    function panLeft() {
      cameraX += 50;
      applyCameraTransform();
      showStatus(canvasId, '已向左移动', '');
    }
    
    function panRight() {
      cameraX -= 50;
      applyCameraTransform();
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
          updateCursor();
        } else {
          showStatus(canvasId, '请先输入文本内容', 'error');
        }
      }
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    canvas.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        startDrawing(e);
      }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1) {
        draw(e);
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', stopDrawing);
    
    document.addEventListener('keydown', function(e) {
      if (e.code === 'Space' && !spaceKeyPressed) {
        e.preventDefault();
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
    
    canvases[canvasId] = {
      canvas: canvas,
      ctx: ctx,
      getState: function() {
        return {
          strokeColor: strokeColor,
          lineWidth: lineWidth,
          cameraX: cameraX,
          cameraY: cameraY,
          cameraZoom: cameraZoom
        };
      },
      setState: function(state) {
        if (state.strokeColor) strokeColor = state.strokeColor;
        if (state.lineWidth) lineWidth = state.lineWidth;
        if (state.cameraZoom !== undefined) cameraZoom = state.cameraZoom;
        if (state.cameraX !== undefined) cameraX = state.cameraX;
        if (state.cameraY !== undefined) cameraY = state.cameraY;
        applyCameraTransform();
        updateZoomLevel();
      },
      getCameraState: function() {
        return {
          x: cameraX,
          y: cameraY,
          zoom: cameraZoom
        };
      },
      setCameraState: function(x, y, zoom) {
        cameraX = x;
        cameraY = y;
        cameraZoom = zoom;
        applyCameraTransform();
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
    
    applyCameraTransform();
    loadCanvas(canvasId);
  }
  
  function saveCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) return false;
    
    try {
      const camera = canvasData.getCameraState();
      
      canvasData.setCameraState(0, 0, 1);
      
      const dataURL = canvasData.canvas.toDataURL('image/png');
      localStorage.setItem('hexo-canvas-' + canvasId, dataURL);
      
      const state = canvasData.getState();
      localStorage.setItem('hexo-canvas-state-' + canvasId, JSON.stringify(state));
      
      canvasData.setCameraState(camera.x, camera.y, camera.zoom);
      
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
        const camera = canvasData.getCameraState();
        canvasData.setCameraState(0, 0, 1);
        
        canvasData.ctx.clearRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
        canvasData.ctx.drawImage(img, 0, 0);
        
        canvasData.setCameraState(camera.x, camera.y, camera.zoom);
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
      const camera = canvasData.getCameraState();
      canvasData.setCameraState(0, 0, 1);
      
      canvasData.ctx.clearRect(0, 0, canvasData.canvas.width, canvasData.canvas.height);
      
      canvasData.setCameraState(camera.x, camera.y, camera.zoom);
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
