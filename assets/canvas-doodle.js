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
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    function getPosition(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      if (e.touches && e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
    
    function startDrawing(e) {
      e.preventDefault();
      isDrawing = true;
      const pos = getPosition(e);
      lastX = pos.x;
      lastY = pos.y;
    }
    
    function draw(e) {
      if (!isDrawing) return;
      e.preventDefault();
      
      const pos = getPosition(e);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      lastX = pos.x;
      lastY = pos.y;
    }
    
    function stopDrawing() {
      isDrawing = false;
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
      ctx: ctx
    };
    
    loadCanvas(canvasId);
  }
  
  function saveCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) return false;
    
    try {
      const dataURL = canvasData.canvas.toDataURL('image/png');
      localStorage.setItem('hexo-canvas-' + canvasId, dataURL);
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
