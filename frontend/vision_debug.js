// frontend/vision_debug.js

export function initVisionDebug() {
    // -------------------------------------------------------------------------
    // 1. TẠO HTML CHO CỬA SỔ DEBUG VÀ NÚT TOGGLE
    // -------------------------------------------------------------------------
    
    // Nút nhỏ để mở lại debug
    const toggleButton = document.createElement('div');
    toggleButton.id = 'vision-debug-toggle';
    toggleButton.innerHTML = '👁️ Vision';
    toggleButton.title = "Kéo để di chuyển - Click để mở";
    toggleButton.style.display = 'none'; // Mặc định ẩn vì cửa sổ đang mở

    // Cửa sổ Debug chính
    const debugContainer = document.createElement('div');
    debugContainer.id = 'vision-debug-container';
    debugContainer.innerHTML = `
        <div class="debug-header" id="debug-header-drag">
            <span>👁️ Vision Debug</span>
            <div class="header-controls">
                <button id="minimize-debug" title="Thu nhỏ">_</button>
            </div>
        </div>
        <div class="video-wrapper">
            <video id="debug-video" autoplay playsinline muted></video>
            <div id="debug-overlay">
                <div id="debug-action">Action: Idle</div>
                <div id="debug-objects" style="display:none">Objects: ---</div>
            </div>
        </div>
    `;

    // -------------------------------------------------------------------------
    // 2. CSS STYLE
    // -------------------------------------------------------------------------
    const style = document.createElement('style');
    style.textContent = `
        /* --- NÚT TOGGLE (DRAGGABLE) --- */
        #vision-debug-toggle {
            position: fixed;
            top: 25px;           /* Vị trí mặc định theo yêu cầu */
            left: 350px;         /* Vị trí mặc định theo yêu cầu */
            
            background: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            cursor: move;        /* Con trỏ hình mũi tên di chuyển */
            z-index: 10000;
            font-family: sans-serif;
            font-size: 13px;
            font-weight: bold;
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255,255,255,0.3);
            transition: transform 0.1s, background 0.2s;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            user-select: none;   /* Không bôi đen chữ khi kéo */
            display: flex;
            align-items: center;
            gap: 5px;
        }
        #vision-debug-toggle:hover { 
            background: rgba(0, 0, 0, 0.8); 
        }
        #vision-debug-toggle:active {
            transform: scale(0.95);
        }

        /* --- CỬA SỔ DEBUG --- */
        #vision-debug-container {
            position: fixed;
            top: 80px; 
            left: 20px;
            width: 240px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 12px;
            z-index: 9999;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            overflow: hidden;
            font-family: sans-serif;
            display: block;
        }

        .debug-header {
            background: linear-gradient(90deg, #34495e, #2c3e50);
            color: white;
            padding: 8px 10px;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            user-select: none;
        }

        .header-controls button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            cursor: pointer;
            font-size: 14px;
            width: 20px;
            height: 20px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding-bottom: 4px;
        }
        .header-controls button:hover { background: rgba(255,255,255,0.4); }

        .video-wrapper { position: relative; width: 100%; aspect-ratio: 4/3; background: #000; }
        #debug-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        
        #debug-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; padding: 10px; box-sizing: border-box;
            display: flex; flex-direction: column; gap: 5px;
        }
        #debug-action { 
            background: rgba(46, 204, 113, 0.9); color: #fff;
            padding: 3px 8px; border-radius: 4px; 
            font-size: 11px; font-weight: bold; width: fit-content; 
        }
        #debug-objects { 
            background: rgba(230, 126, 34, 0.9); color: #fff;
            padding: 3px 8px; border-radius: 4px; 
            font-size: 11px; width: fit-content;
        }
    `;

    document.head.appendChild(style);
    document.body.appendChild(toggleButton);
    document.body.appendChild(debugContainer);

    // -------------------------------------------------------------------------
    // 3. LOGIC KÉO THẢ (DRAGGABLE) - DÙNG CHUNG
    // -------------------------------------------------------------------------
    
    function makeDraggable(element, handle, isClickable = false, onClickCallback = null) {
        let isDragging = false;
        let hasMoved = false; // Biến kiểm tra xem có phải đang kéo không (để tránh click nhầm)
        let startX, startY, initialLeft, initialTop;

        handle.addEventListener('mousedown', (e) => {
            isDragging = true;
            hasMoved = false;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Nếu di chuyển chuột quá 3px thì tính là đang kéo (Drag), không phải Click
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasMoved = true;
            }

            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
            
            // Xóa các thuộc tính định vị khác để tránh xung đột
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }

        function onMouseUp() {
            isDragging = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            // Nếu không di chuyển (tức là Click) và element có chức năng click
            if (!hasMoved && isClickable && onClickCallback) {
                onClickCallback();
            }
        }
    }

    // Áp dụng kéo thả cho Cửa sổ Debug (kéo bằng Header)
    const header = document.getElementById('debug-header-drag');
    makeDraggable(debugContainer, header);

    // Áp dụng kéo thả cho Nút Toggle (kéo bằng chính nó)
    // Khi click (không kéo) -> Gọi hàm mở cửa sổ
    makeDraggable(toggleButton, toggleButton, true, () => {
        debugContainer.style.display = 'block';
        toggleButton.style.display = 'none';
    });

    // -------------------------------------------------------------------------
    // 4. LOGIC ẨN CỬA SỔ
    // -------------------------------------------------------------------------
    const minimizeBtn = document.getElementById('minimize-debug');
    minimizeBtn.onclick = () => {
        debugContainer.style.display = 'none';
        toggleButton.style.display = 'flex'; // Hiện lại nút toggle
    };

    // -------------------------------------------------------------------------
    // 5. LOGIC CAMERA VÀ CẬP NHẬT DỮ LIỆU
    // -------------------------------------------------------------------------
    const video = document.getElementById('debug-video');
    const actionEl = document.getElementById('debug-action');
    const objectsEl = document.getElementById('debug-objects');

    navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.warn("Vision Debug: Camera Error", err);
            actionEl.innerText = "Cam Error";
            actionEl.style.background = "#e74c3c";
        });

    window.addEventListener('vision-data', (e) => {
        const data = e.detail;

        if (data.type === "action_result") {
            const conf = (data.action_confidence * 100).toFixed(0);
            actionEl.innerText = `Action: ${data.action} (${conf}%)`;
            
            if (data.action !== 'Idle' && data.action !== 'Unknown') {
                actionEl.style.background = 'rgba(46, 204, 113, 0.9)';
            } else {
                actionEl.style.background = 'rgba(149, 165, 166, 0.9)';
            }

            if (data.objects && data.objects.length > 0) {
                const names = data.objects.map(o => o.name).join(", ");
                objectsEl.innerText = `Seeing: ${names}`;
                objectsEl.style.display = 'block';
            } else {
                objectsEl.style.display = 'none';
            }
        }
    });
}