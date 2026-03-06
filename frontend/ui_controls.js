// frontend/ui_controls.js

/**
 * Gắn sự kiện cho các nút điều khiển biểu cảm và chuyển động của model.
 */
function setupPersonalityLogic() {
    const btns = document.querySelectorAll('.personality-btn');
    
    // Log để kiểm tra xem JS có tìm thấy nút không
    console.log("🔍 [UI Debug] Đã tìm thấy số nút tính cách:", btns.length);

    const savedPersonality = localStorage.getItem('rin_personality') || 'genki';

    btns.forEach(btn => {
        const type = btn.getAttribute('data-type');
        
        // Khởi tạo trạng thái active
        if (type === savedPersonality) {
            btn.classList.add('active');
        }

        // Gán trực tiếp onclick (không dùng addEventListener để tránh lặp)
        btn.onclick = (e) => {
            // Ngăn chặn mọi sự kiện khóa từ interaction_manager
            e.preventDefault();
            e.stopPropagation();

            console.log("🚀 [UI Debug] Bạn đã bấm vào nút:", type);

            // Cập nhật UI
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Lưu vào máy
            localStorage.setItem('rin_personality', type);
        };
    });
}


function setupModelControls(model) {
    const expressions = ['smile', 'sad', 'angry', 'blush', 'surprised', 'confused', 'reset'];
    expressions.forEach(expr => {
        const btn = document.getElementById(`btn-expr-${expr}`);
        if (btn) {
            const exprName = expr === 'surprised' ? 'surprise' : expr;
            btn.onclick = () => model.expression(exprName);
        }
    });

    const motions = ['idle1', 'idle2', 'idle3'];
    motions.forEach(motion => {
        const btn = document.getElementById(`btn-motion-${motion}`);
        if (btn) {
            const motionName = motion.charAt(0).toUpperCase() + motion.slice(1);
            btn.onclick = () => model.motion(motionName, undefined, 1);
        }
    });
}

/**
 * Thiết lập nút đổi background ngẫu nhiên.
 */
function setupBackgroundControls() {
    const backgroundImages = [
        'bg1.jpg', 'bg2.jpg', 'bg3.jpg', 'bg4.jpg', 'bg5.gif', 'bg6.jpg',
        'bg7.gif', 'bg8.gif', 'bg9.gif', 'bg10.gif', 'bg11.gif', 'bg12.gif'
    ];
    const changeBgBtn = document.getElementById('btn-change-bg');
    let lastImage = '';

    if (changeBgBtn) {
        changeBgBtn.addEventListener('click', () => {
            let availableImages = backgroundImages.filter(img => img !== lastImage);
            if (availableImages.length === 0) availableImages = backgroundImages;
            const randomImage = availableImages[Math.floor(Math.random() * availableImages.length)];
            lastImage = randomImage;
            document.body.style.backgroundImage = `url('./background/${randomImage}')`;
        });
    }
}

/**
 * Logic quản lý giao diện chung và Đổi tính cách
 */
function setupGeneralUI() {
    const interactionPanelBtn = document.getElementById('interaction-panel-btn');
    const interactionPanel = document.getElementById('interaction-panel');
    const mainToolbar = document.getElementById('main-toolbar');
    const conversationsPanelBtn = document.getElementById('conversations-panel-btn');
    const conversationsPanel = document.getElementById('conversations-panel');
    const authModal = document.getElementById('auth-modal');
    
    // --- 1. XỬ LÝ CHỌN TÍNH CÁCH (ĐÃ ĐƯA RA NGOÀI VÀ SỬA LỖI) ---
    const personalityBtns = document.querySelectorAll('.personality-btn');
    
    // Khởi tạo trạng thái nút từ LocalStorage khi vừa load
    const savedPersonality = localStorage.getItem('rin_personality') || 'genki';
    personalityBtns.forEach(btn => {
        if (btn.dataset.type === savedPersonality) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }

        // Sự kiện click
        btn.onclick = (e) => {
            e.stopPropagation(); // Tránh kích hoạt sự kiện đóng panel
            
            // Xóa active cũ, thêm active mới
            personalityBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Lưu vào máy
            const type = btn.dataset.type;
            localStorage.setItem('rin_personality', type);
            console.log("✨ Đã đổi tính cách sang:", type);
        };
    });

    // --- 2. XỬ LÝ TABS ---
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            if (tabId) document.getElementById(tabId).classList.add('active');
        };
    });

    // --- 3. ĐÓNG/MỞ PANEL ---
    if (interactionPanelBtn && interactionPanel) {
        interactionPanelBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpening = !interactionPanel.classList.contains('visible');
            interactionPanel.classList.toggle('visible');
            if (isOpening) {
                mainToolbar.classList.add('fade-out-right');
                conversationsPanel.classList.remove('visible');
                conversationsPanelBtn.classList.remove('fade-out-left');
            } else {
                mainToolbar.classList.remove('fade-out-right');
            }
        };
    }

    if (conversationsPanelBtn && conversationsPanel) {
        conversationsPanelBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpening = !conversationsPanel.classList.contains('visible');
            conversationsPanel.classList.toggle('visible');
            if (isOpening) {
                conversationsPanelBtn.classList.add('fade-out-left');
                interactionPanel.classList.remove('visible');
                mainToolbar.classList.remove('fade-out-right');
            } else {
                conversationsPanelBtn.classList.remove('fade-out-left');
            }
        };
    }

    // --- 4. CLICK RA NGOÀI ĐỂ ĐÓNG ---
    document.addEventListener('click', (event) => {
        if (interactionPanel.classList.contains('visible') && 
            !interactionPanel.contains(event.target) && 
            event.target !== interactionPanelBtn) {
            interactionPanel.classList.remove('visible');
            mainToolbar.classList.remove('fade-out-right');
        }

        if (conversationsPanel.classList.contains('visible') && 
            !conversationsPanel.contains(event.target) && 
            event.target !== conversationsPanelBtn) {
            conversationsPanel.classList.remove('visible');
            conversationsPanelBtn.classList.remove('fade-out-left');
        }
    });
}

export function setupUIAndControls(model) {
    setupGeneralUI();
    setupPersonalityLogic();
    setupModelControls(model);
    setupBackgroundControls();
}