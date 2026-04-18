(function() {
  'use strict';
  
  const canvases = {};
  const INFINITE_CANVAS_BASE_SIZE = 2000;
  const MINIMAP_SIZE = 150;
  const MINIMAP_PADDING = 10;
  
  const WORLD_OFFSET_INITIAL = 4000;
  const INFINITE_CANVAS_INITIAL_SIZE = 8000;
  
  function initCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvases[canvasId]) return;
    
    const container = canvas.closest('.hexo-canvas-doodle-container');
    const viewport = canvas.closest('.hexo-canvas-viewport');
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
    
    let offscreenCanvas = document.createElement('canvas');
    let offscreenCtx = offscreenCanvas.getContext('2d');
    
    let worldOffsetX = WORLD_OFFSET_INITIAL;
    let worldOffsetY = WORLD_OFFSET_INITIAL;
    
    let contentMinX = 0;
    let contentMinY = 0;
    let contentMaxX = 0;
    let contentMaxY = 0;
    let hasContent = false;
    
    let minimapCanvas = null;
    let minimapCtx = null;
    let isMinimapDragging = false;
    
    offscreenCanvas.width = INFINITE_CANVAS_INITIAL_SIZE;
    offscreenCanvas.height = INFINITE_CANVAS_INITIAL_SIZE;
    offscreenCtx.lineCap = 'round';
    offscreenCtx.lineJoin = 'round';
    offscreenCtx.font = '16px Arial';
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.font = '16px Arial';
    
    function applyCameraTransform() {
      updateMinimap();
    }
    
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
      if (screenPos.y < padding) {
        needsResize = true;
        expandTop = true;
      }
      if (screenPos.y > offscreenCanvas.height - padding) {
        needsResize = true;
        expandBottom = true;
      }
      
      if (!needsResize) return;
      
      const currentWidth = offscreenCanvas.width;
      const currentHeight = offscreenCanvas.height;
      
      let newWidth = currentWidth;
      let newHeight = currentHeight;
      let offsetX = 0;
      let offsetY = 0;
      
      if (expandLeft) {
        newWidth = currentWidth * 2;
        offsetX = currentWidth;
        worldOffsetX -= currentWidth;
      }
      if (expandRight) {
        if (!expandLeft) newWidth = currentWidth * 2;
      }
      if (expandTop) {
        newHeight = currentHeight * 2;
        offsetY = currentHeight;
        worldOffsetY -= currentHeight;
      }
      if (expandBottom) {
        if (!expandTop) newHeight = currentHeight * 2;
      }
      
      const newOffscreen = document.createElement('canvas');
      newOffscreen.width = newWidth;
      newOffscreen.height = newHeight;
      const newCtx = newOffscreen.getContext('2d');
      
      newCtx.lineCap = 'round';
      newCtx.lineJoin = 'round';
      newCtx.font = '16px Arial';
      
      newCtx.drawImage(offscreenCanvas, offsetX, offsetY);
      
      offscreenCanvas = newOffscreen;
      offscreenCtx = newCtx;
    }
    
    function updateContentBounds(x, y) {
      const expandedX = x + lineWidth;
      const expandedY = y + lineWidth;
      
      if (!hasContent) {
        contentMinX = expandedX;
        contentMinY = expandedY;
        contentMaxX = expandedX;
        contentMaxY = expandedY;
        hasContent = true;
      } else {
        contentMinX = Math.min(contentMinX, expandedX);
        contentMinY = Math.min(contentMinY, expandedY);
        contentMaxX = Math.max(contentMaxX, expandedX);
        contentMaxY = Math.max(contentMaxY, expandedY);
      }
    }
    
    function syncToDisplayCanvas() {
      const viewportRect = viewport.getBoundingClientRect();
      const viewportWidth = viewportRect.width;
      const viewportHeight = viewportRect.height;
      
      if (canvas.width !== viewportWidth || canvas.height !== viewportHeight) {
        canvas.width = viewportWidth;
        canvas.height = viewportHeight;
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.font = '16px Arial';
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
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
      const srcMaxX = Math.min(offscreenCanvas.width, Math.ceil(visibleMaxScreen.x));
      const srcMaxY = Math.min(offscreenCanvas.height, Math.ceil(visibleMaxScreen.y));
      
      const srcWidth = srcMaxX - srcMinX;
      const srcHeight = srcMaxY - srcMinY;
      
      if (srcWidth > 0 && srcHeight > 0 && srcMinX < offscreenCanvas.width && srcMinY < offscreenCanvas.height) {
        const destWorldMin = screenToWorld(srcMinX, srcMinY);
        
        ctx.drawImage(
          offscreenCanvas,
          srcMinX, srcMinY, srcWidth, srcHeight,
          destWorldMin.x, destWorldMin.y, srcWidth, srcHeight
        );
      }
      
      ctx.restore();
    }
    
    function initMinimap() {
      if (!viewport) return;
      
      const existingMinimap = viewport.querySelector('.hexo-canvas-minimap');
      if (existingMinimap) {
        minimapCanvas = existingMinimap;
        minimapCtx = minimapCanvas.getContext('2d');
        return;
      }
      
      minimapCanvas = document.createElement('canvas');
      minimapCanvas.className = 'hexo-canvas-minimap';
      minimapCanvas.width = MINIMAP_SIZE;
      minimapCanvas.height = MINIMAP_SIZE;
      minimapCanvas.style.position = 'absolute';
      minimapCanvas.style.bottom = MINIMAP_PADDING + 'px';
      minimapCanvas.style.right = MINIMAP_PADDING + 'px';
      minimapCanvas.style.border = '1px solid #333';
      minimapCanvas.style.backgroundColor = '#fff';
      minimapCanvas.style.cursor = 'pointer';
      minimapCanvas.style.zIndex = '10';
      minimapCanvas.style.borderRadius = '4px';
      
      viewport.appendChild(minimapCanvas);
      minimapCtx = minimapCanvas.getContext('2d');
      
      minimapCanvas.addEventListener('mousedown', handleMinimapMouseDown);
      minimapCanvas.addEventListener('mousemove', handleMinimapMouseMove);
      minimapCanvas.addEventListener('mouseup', handleMinimapMouseUp);
      minimapCanvas.addEventListener('mouseout', handleMinimapMouseUp);
    }
    
    function getContentBounds() {
      if (!hasContent) {
        return {
          minX: worldOffsetX,
          minY: worldOffsetY,
          maxX: worldOffsetX + offscreenCanvas.width,
          maxY: worldOffsetY + offscreenCanvas.height
        };
      }
      
      const padding = 100;
      return {
        minX: contentMinX - padding,
        minY: contentMinY - padding,
        maxX: contentMaxX + padding,
        maxY: contentMaxY + padding
      };
    }
    
    function updateMinimap() {
      if (!minimapCanvas || !minimapCtx) return;
      
      const bounds = getContentBounds();
      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;
      
      if (contentWidth <= 0 || contentHeight <= 0) return;
      
      const scale = Math.min(MINIMAP_SIZE / contentWidth, MINIMAP_SIZE / contentHeight);
      const offsetX = (MINIMAP_SIZE - contentWidth * scale) / 2;
      const offsetY = (MINIMAP_SIZE - contentHeight * scale) / 2;
      
      minimapCtx.fillStyle = '#f8f9fa';
      minimapCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
      
      minimapCtx.save();
      minimapCtx.beginPath();
      minimapCtx.rect(offsetX, offsetY, contentWidth * scale, contentHeight * scale);
      minimapCtx.clip();
      
      const srcMinScreen = worldToScreen(bounds.minX, bounds.minY);
      const srcMaxScreen = worldToScreen(bounds.maxX, bounds.maxY);
      
      const srcX = Math.max(0, srcMinScreen.x);
      const srcY = Math.max(0, srcMinScreen.y);
      const srcWidth = Math.min(offscreenCanvas.width - srcX, srcMaxScreen.x - srcMinScreen.x);
      const srcHeight = Math.min(offscreenCanvas.height - srcY, srcMaxScreen.y - srcMinScreen.y);
      
      const destX = offsetX;
      const destY = offsetY;
      const destWidth = contentWidth * scale;
      const destHeight = contentHeight * scale;
      
      if (srcWidth > 0 && srcHeight > 0) {
        minimapCtx.drawImage(
          offscreenCanvas,
          srcX, srcY, srcWidth, srcHeight,
          destX, destY, destWidth, destHeight
        );
      }
      
      minimapCtx.restore();
      
      minimapCtx.strokeStyle = '#666';
      minimapCtx.lineWidth = 1;
      minimapCtx.strokeRect(offsetX, offsetY, contentWidth * scale, contentHeight * scale);
      
      const viewportRect = viewport.getBoundingClientRect();
      const viewportWidth = viewportRect.width;
      const viewportHeight = viewportRect.height;
      
      const vpMinX = (-cameraX) / cameraZoom;
      const vpMinY = (-cameraY) / cameraZoom;
      const vpMaxX = vpMinX + viewportWidth / cameraZoom;
      const vpMaxY = vpMinY + viewportHeight / cameraZoom;
      
      const vpDisplayMinX = (vpMinX - bounds.minX) * scale + offsetX;
      const vpDisplayMinY = (vpMinY - bounds.minY) * scale + offsetY;
      const vpDisplayWidth = (vpMaxX - vpMinX) * scale;
      const vpDisplayHeight = (vpMaxY - vpMinY) * scale;
      
      minimapCtx.strokeStyle = '#e74c3c';
      minimapCtx.lineWidth = 2;
      minimapCtx.strokeRect(
        Math.max(offsetX, vpDisplayMinX),
        Math.max(offsetY, vpDisplayMinY),
        Math.min(contentWidth * scale, vpDisplayWidth),
        Math.min(contentHeight * scale, vpDisplayHeight)
      );
    }
    
    function handleMinimapMouseDown(e) {
      e.preventDefault();
      e.stopPropagation();
      isMinimapDragging = true;
      navigateMinimap(e);
    }
    
    function handleMinimapMouseMove(e) {
      if (!isMinimapDragging) return;
      e.preventDefault();
      e.stopPropagation();
      navigateMinimap(e);
    }
    
    function handleMinimapMouseUp(e) {
      isMinimapDragging = false;
    }
    
    function navigateMinimap(e) {
      if (!minimapCanvas) return;
      
      const rect = minimapCanvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const bounds = getContentBounds();
      const contentWidth = bounds.maxX - bounds.minX;
      const contentHeight = bounds.maxY - bounds.minY;
      
      if (contentWidth <= 0 || contentHeight <= 0) return;
      
      const scale = Math.min(MINIMAP_SIZE / contentWidth, MINIMAP_SIZE / contentHeight);
      const offsetX = (MINIMAP_SIZE - contentWidth * scale) / 2;
      const offsetY = (MINIMAP_SIZE - contentHeight * scale) / 2;
      
      const worldX = (mouseX - offsetX) / scale + bounds.minX;
      const worldY = (mouseY - offsetY) / scale + bounds.minY;
      
      const viewportRect = viewport.getBoundingClientRect();
      const viewportWidth = viewportRect.width;
      const viewportHeight = viewportRect.height;
      
      cameraX = -(worldX - (viewportWidth / 2 / cameraZoom)) * cameraZoom;
      cameraY = -(worldY - (viewportHeight / 2 / cameraZoom)) * cameraZoom;
      
      applyCameraTransform();
      syncToDisplayCanvas();
    }
    
    function getMousePositionOnCanvas(e) {
      const rect = viewport.getBoundingClientRect();
      
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
        viewport.style.cursor = 'grabbing';
      } else if (isAddingText) {
        viewport.style.cursor = 'text';
      } else if (spaceKeyPressed) {
        viewport.style.cursor = 'grab';
      } else {
        viewport.style.cursor = 'crosshair';
      }
    }
    
    function startDrawing(e) {
      e.preventDefault();
      
      if (isAddingText && textToAdd) {
        const pos = getMousePositionOnCanvas(e);
        
        ensureCanvasSize(pos.x, pos.y);
        
        const screenPos = worldToScreen(pos.x, pos.y);
        
        offscreenCtx.save();
        offscreenCtx.fillStyle = strokeColor;
        offscreenCtx.font = `${Math.max(12, lineWidth * 4)}px Arial`;
        offscreenCtx.fillText(textToAdd, screenPos.x, screenPos.y);
        offscreenCtx.restore();
        
        updateContentBounds(pos.x, pos.y);
        syncToDisplayCanvas();
        updateMinimap();
        
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
        syncToDisplayCanvas();
        updateZoomLevel();
        return;
      }
      
      if (!isDrawing) return;
      
      const pos = getMousePositionOnCanvas(e);
      
      ensureCanvasSize(pos.x, pos.y);
      ensureCanvasSize(lastCanvasX, lastCanvasY);
      
      const lastScreenPos = worldToScreen(lastCanvasX, lastCanvasY);
      const screenPos = worldToScreen(pos.x, pos.y);
      
      offscreenCtx.save();
      offscreenCtx.beginPath();
      offscreenCtx.strokeStyle = strokeColor;
      offscreenCtx.lineWidth = lineWidth;
      offscreenCtx.lineCap = 'round';
      offscreenCtx.lineJoin = 'round';
      offscreenCtx.moveTo(lastScreenPos.x, lastScreenPos.y);
      offscreenCtx.lineTo(screenPos.x, screenPos.y);
      offscreenCtx.stroke();
      offscreenCtx.restore();
      
      updateContentBounds(lastCanvasX, lastCanvasY);
      updateContentBounds(pos.x, pos.y);
      
      syncToDisplayCanvas();
      
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
      
      const rect = viewport.getBoundingClientRect();
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
        syncToDisplayCanvas();
        updateZoomLevel();
      }
    }
    
    function zoomIn() {
      const rect = viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const worldX = (centerX - cameraX) / cameraZoom;
      const worldY = (centerY - cameraY) / cameraZoom;
      
      cameraZoom = Math.min(10, cameraZoom * 1.2);
      
      cameraX = centerX - worldX * cameraZoom;
      cameraY = centerY - worldY * cameraZoom;
      
      applyCameraTransform();
      syncToDisplayCanvas();
      updateZoomLevel();
      showStatus(canvasId, '已放大', '');
    }
    
    function zoomOut() {
      const rect = viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const worldX = (centerX - cameraX) / cameraZoom;
      const worldY = (centerY - cameraY) / cameraZoom;
      
      cameraZoom = Math.max(0.1, cameraZoom / 1.2);
      
      cameraX = centerX - worldX * cameraZoom;
      cameraY = centerY - worldY * cameraZoom;
      
      applyCameraTransform();
      syncToDisplayCanvas();
      updateZoomLevel();
      showStatus(canvasId, '已缩小', '');
    }
    
    function zoomReset() {
      cameraZoom = 1;
      cameraX = 0;
      cameraY = 0;
      applyCameraTransform();
      syncToDisplayCanvas();
      updateZoomLevel();
      showStatus(canvasId, '缩放已重置', '');
    }
    
    function panUp() {
      cameraY += 50;
      applyCameraTransform();
      syncToDisplayCanvas();
      showStatus(canvasId, '已向上移动', '');
    }
    
    function panDown() {
      cameraY -= 50;
      applyCameraTransform();
      syncToDisplayCanvas();
      showStatus(canvasId, '已向下移动', '');
    }
    
    function panLeft() {
      cameraX += 50;
      applyCameraTransform();
      syncToDisplayCanvas();
      showStatus(canvasId, '已向左移动', '');
    }
    
    function panRight() {
      cameraX -= 50;
      applyCameraTransform();
      syncToDisplayCanvas();
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
    
    viewport.addEventListener('mousedown', startDrawing);
    viewport.addEventListener('mousemove', draw);
    viewport.addEventListener('mouseup', stopDrawing);
    viewport.addEventListener('mouseleave', stopDrawing);
    
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    
    viewport.addEventListener('touchstart', function(e) {
      if (e.touches.length === 1) {
        startDrawing(e);
      }
    }, { passive: false });
    
    viewport.addEventListener('touchmove', function(e) {
      if (e.touches.length === 1) {
        draw(e);
      }
    }, { passive: false });
    
    viewport.addEventListener('touchend', stopDrawing);
    
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
      offscreenCanvas: offscreenCanvas,
      offscreenCtx: offscreenCtx,
      getWorldOffset: function() {
        return { x: worldOffsetX, y: worldOffsetY };
      },
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
        syncToDisplayCanvas();
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
        syncToDisplayCanvas();
        updateZoomLevel();
      },
      updateContentBounds: function(x, y) {
        updateContentBounds(x, y);
      },
      syncToDisplayCanvas: function() {
        syncToDisplayCanvas();
      },
      updateMinimap: function() {
        updateMinimap();
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
    
    initMinimap();
    applyCameraTransform();
    syncToDisplayCanvas();
    loadCanvas(canvasId);
  }
  
  function saveCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) return false;
    
    try {
      const bounds = getContentBoundsForCanvas(canvasId);
      const padding = 50;
      const saveWidth = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
      const saveHeight = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
      
      const saveCanvas = document.createElement('canvas');
      saveCanvas.width = saveWidth;
      saveCanvas.height = saveHeight;
      const saveCtx = saveCanvas.getContext('2d');
      
      saveCtx.fillStyle = '#ffffff';
      saveCtx.fillRect(0, 0, saveWidth, saveHeight);
      
      saveCtx.drawImage(
        canvasData.offscreenCanvas,
        bounds.minX - padding,
        bounds.minY - padding,
        saveWidth,
        saveHeight,
        0,
        0,
        saveWidth,
        saveHeight
      );
      
      const dataURL = saveCanvas.toDataURL('image/png');
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
  
  function getContentBoundsForCanvas(canvasId) {
    const canvasData = canvases[canvasId];
    if (!canvasData) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    const offscreenCanvas = canvasData.offscreenCanvas;
    const offscreenCtx = canvasData.offscreenCtx;
    
    const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const data = imageData.data;
    
    for (let y = 0; y < offscreenCanvas.height; y++) {
      for (let x = 0; x < offscreenCanvas.width; x++) {
        const idx = (y * offscreenCanvas.width + x) * 4;
        if (data[idx + 3] > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: offscreenCanvas.width, maxY: offscreenCanvas.height };
    }
    
    return { minX, minY, maxX, maxY };
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
        const offscreenCanvas = canvasData.offscreenCanvas;
        const offscreenCtx = canvasData.offscreenCtx;
        const worldOffset = canvasData.getWorldOffset();
        
        offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        
        const offsetX = Math.max(0, Math.floor((offscreenCanvas.width - img.width) / 2));
        const offsetY = Math.max(0, Math.floor((offscreenCanvas.height - img.height) / 2));
        
        offscreenCtx.drawImage(img, offsetX, offsetY);
        
        const worldX1 = offsetX + worldOffset.x;
        const worldY1 = offsetY + worldOffset.y;
        const worldX2 = offsetX + img.width + worldOffset.x;
        const worldY2 = offsetY + img.height + worldOffset.y;
        
        canvasData.updateContentBounds(worldX1, worldY1);
        canvasData.updateContentBounds(worldX2, worldY2);
        
        canvasData.syncToDisplayCanvas();
        canvasData.updateMinimap();
        
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
      const offscreenCanvas = canvasData.offscreenCanvas;
      const offscreenCtx = canvasData.offscreenCtx;
      
      offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
      
      canvasData.syncToDisplayCanvas();
      canvasData.updateMinimap();
      
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
