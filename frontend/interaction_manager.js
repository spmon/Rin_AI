// =================================================================================
// == INTERACTION MANAGER UNIFIED (TAP BBOX & SHAKE)
// == Gộp và xử lý xung đột giữa tương tác nhấn và lắc.
// =================================================================================

// --- PHẦN CẤU HÌNH CHUNG ---
const DEBUG_MODE = false; // Bật/tắt vẽ các hộp hit area để debug

// --- PHẦN CẤU HÌNH: TƯƠNG TÁC NHẤN (TAP) ---
const interactionRules = {
    'Head': [
        { taps: 3, expression: 'blush', text: '...Đừng xoa đầu mình nhiều thế, mình... mình ngại lắm đó.', cooldown: 5000 },
        { taps: 1, expression: 'smile', text: 'Hihi, có chuyện gì sao?', cooldown: 5000 }
    ],
    'Body': [
        { taps: 1, expression: 'angry', text: 'Áaaa! Bạn chạm vào đâu thế!', cooldown: 5000 }
    ]
};
const COMBO_TIMEOUT = 700;   // Thời gian tối đa giữa các cú tap để được tính là combo
const TRIGGER_DELAY = 300;   // Thời gian chờ trước khi kích hoạt hành động tap

// --- PHẦN CẤU HÌNH: TƯƠNG TÁC LẮC (SHAKE) ---
const SHAKE_THRESHOLD = 250;       // Ngưỡng "năng lượng lắc" để kích hoạt phản ứng
const DRAG_CANCEL_THRESHOLD = 5; // Khoảng cách (pixel) chuột phải di chuyển để xác nhận là drag và hủy tap
const DIZZY_EXPRESSION = 'confused'; // Tên biểu cảm khi bị chóng mặt
const RESET_EXPRESSION = 'reset';    // Biểu cảm mặc định để quay về
const DIZZY_TEXT = 'Áaaaaa chóng mặt quá... dừng lại điiiiii!';
const EXPRESSION_RESET_DELAY = 10000; // 10 giây để reset biểu cảm chóng mặt

// --- BỘ MÁY QUẢN LÝ TRẠNG THÁI ---
let hitAreas = {};
let debugGraphics = null;

// <<< THAY ĐỔI LỚN 1: Quản lý trạng thái "Bận" >>>
// Biến này giờ đây là trung tâm, có thể được điều khiển từ bên ngoài
let isActionActive = false;


// Trạng thái cho Tap
let tapCount = 0;
let lastHitArea = '';
let comboResetTimer = null; // Timer để reset combo nếu chờ quá lâu
let triggerTimer = null;    // Timer để kích hoạt hành động tap sau một độ trễ

// Trạng thái cho Shake
let isDraggingModel = false;
let lastMousePosition = { x: 0, y: 0 };
let totalShakeEnergy = 0;
let expressionResetTimer = null; // Timer để reset biểu cảm sau khi bị chóng mặt

/**
 * <<< THÊM MỚI: Hàm để khóa tương tác từ bên ngoài >>>
 * Ví dụ: Khi model đang nói chuyện từ LLM.
 */
export function lockInteractions() {
    console.log("INTERACTIONS LOCKED (Model is busy).");
    isActionActive = true;
}

/**
 * <<< THÊM MỚI: Hàm để mở khóa tương tác từ bên ngoài >>>
 * Ví dụ: Khi model đã nói xong.
 */
export function unlockInteractions() {
    console.log("INTERACTIONS UNLOCKED (Model is free).");
    isActionActive = false;
}

// --- CÁC HÀM HỖ TRỢ (GIỮ NGUYÊN) ---

function updateHitAreas(model) {
    if (!model.width || !model.height) return; // Đảm bảo model đã được load
    const modelX = model.x;
    const modelY = model.y;
    const modelWidth = model.width;
    const modelHeight = model.height;

    // VÙNG ĐẦU (HEAD)
    const headX = modelX - modelWidth * 0.075;
    const headY = modelY - modelHeight * 0.15;
    const headWidth = modelWidth * 0.125;
    const headHeight = modelHeight * 0.1;
    hitAreas['Head'] = new PIXI.Rectangle(headX, headY, headWidth, headHeight);

    // VÙNG THÂN (BODY)
    const bodyX = modelX - modelWidth * 0.075;
    const bodyY = modelY - modelHeight * 0.02;
    const bodyWidth = modelWidth * 0.15;
    const bodyHeight = modelHeight * 0.5;
    hitAreas['Body'] = new PIXI.Rectangle(bodyX, bodyY, bodyWidth, bodyHeight);

    if (debugGraphics) {
        drawDebugRectangles();
    }
}

function drawDebugRectangles() {
    debugGraphics.clear();
    debugGraphics.lineStyle(2, 0x00FF00, 0.5); // Xanh lá cho đầu
    const head = hitAreas['Head'];
    if (head) debugGraphics.drawRect(head.x, head.y, head.width, head.height);

    debugGraphics.lineStyle(2, 0xFF0000, 0.5); // Đỏ cho thân
    const body = hitAreas['Body'];
    if (body) debugGraphics.drawRect(body.x, body.y, body.width, body.height);
}

// --- CÁC HÀM THỰC THI HÀNH ĐỘNG ---

/**
 * Hủy bỏ hành động tap đang chờ xử lý.
 * Đây là chìa khóa để giải quyết xung đột.
 */
function cancelPendingTapAction() {
    if (triggerTimer) {
        clearTimeout(triggerTimer);
        triggerTimer = null;
        clearTimeout(comboResetTimer);
        comboResetTimer = null;
        tapCount = 0;
        lastHitArea = '';
        console.log("Pending tap action cancelled because a drag was detected.");
    }
}


/**
 * Tìm và thực thi hành động tap phù hợp nhất.
 */
function executeTapAction(areaName, currentTapCount, model, speakFunction) {
    const rulesForArea = interactionRules[areaName];
    if (!rulesForArea) return;

    // Tìm quy tắc khớp chính xác nhất (ưu tiên nhiều tap hơn)
    const rule = [...rulesForArea]
        .sort((a, b) => b.taps - a.taps)
        .find(r => currentTapCount >= r.taps && (currentTapCount % r.taps === 0 || r.taps === 1));

    if (rule) {
        console.log(`Executing action for ${rule.taps} taps on ${areaName}.`);
        isActionActive = true; // Khóa tương tác

        model.expression(rule.expression);
        if (speakFunction) {
            speakFunction(rule.text, model);
        }

        // Bắt đầu cooldown
        setTimeout(() => {
            console.log(`Cooldown for '${areaName}' ended.`);
            isActionActive = false; // Mở khóa tương tác
        }, rule.cooldown || 3000);
    }
    // Reset combo sau khi thực thi
    tapCount = 0;
    clearTimeout(comboResetTimer);
}

/**
 * Thực thi hành động chóng mặt khi lắc.
 */
function executeShakeAction(model, speakFunction) {
    console.log("Shake threshold reached! Triggering dizzy reaction.");
    isActionActive = true; // Khóa tương tác trong khi chóng mặt

    model.expression(DIZZY_EXPRESSION);
    if (speakFunction) {
        speakFunction(DIZZY_TEXT, model);
    }

    // Hẹn giờ để reset biểu cảm
    clearTimeout(expressionResetTimer); // Xóa timer cũ nếu có
    expressionResetTimer = setTimeout(() => {
        console.log(`Resetting expression to '${RESET_EXPRESSION}' after dizzy.`);
        model.expression(RESET_EXPRESSION);
        isActionActive = false; // Mở khóa tương tác sau khi hết chóng mặt
    }, EXPRESSION_RESET_DELAY);
}


// =================================================================================
// == HÀM THIẾT LẬP CHÍNH
// =================================================================================
export function setupInteractions(app, model, speakFunction) {
    if (!model || !app) return;

    // --- Khởi tạo ban đầu ---
    updateHitAreas(model);

    if (DEBUG_MODE) {
        debugGraphics = new PIXI.Graphics();
        app.stage.addChild(debugGraphics);
        drawDebugRectangles();
    }

    app.stage.interactive = true;

    // --- LẮNG NGHE SỰ KIỆN ---

    // 1. KHI NHẤN CHUỘT XUỐNG (POINTER DOWN)
    app.stage.on('pointerdown', (event) => {
        // Nếu một hành động/cooldown đang diễn ra, bỏ qua tất cả
        if (isActionActive) {
            console.log("Action in progress, new interaction ignored.");
            return;
        }

        const point = event.data.global;
        
        // Bắt đầu logic cho SHAKE
        const modelBounds = model.getBounds();
        if (modelBounds.contains(point.x, point.y)) {
            isDraggingModel = true;
            lastMousePosition.x = point.x;
            lastMousePosition.y = point.y;
            totalShakeEnergy = 0;
        }

        // Bắt đầu logic cho TAP
        const hitAreaFound = Object.keys(hitAreas).find(areaName => hitAreas[areaName].contains(point.x, point.y));
        if (hitAreaFound) {
            clearTimeout(comboResetTimer);
            clearTimeout(triggerTimer);

            if (hitAreaFound !== lastHitArea) {
                tapCount = 1;
            } else {
                tapCount++;
            }
            lastHitArea = hitAreaFound;
            console.log(`Tap ${tapCount} on ${hitAreaFound}. Waiting for confirmation...`);

            // Đặt hẹn giờ để kích hoạt hành động tap (sẽ bị hủy nếu người dùng drag)
            triggerTimer = setTimeout(() => {
                executeTapAction(hitAreaFound, tapCount, model, speakFunction);
                triggerTimer = null; // Đánh dấu là đã thực thi
            }, TRIGGER_DELAY);

            // Đặt hẹn giờ để reset combo nếu không có tap tiếp theo
            comboResetTimer = setTimeout(() => {
                tapCount = 0;
                lastHitArea = '';
            }, COMBO_TIMEOUT);
        }
    });

    // 2. KHI DI CHUYỂN CHUỘT (POINTER MOVE)
    app.stage.on('pointermove', (event) => {
        if (!isDraggingModel) return;

        const point = event.data.global;
        const deltaX = Math.abs(point.x - lastMousePosition.x);
        const deltaY = Math.abs(point.y - lastMousePosition.y);

        // *** ĐIỂM MẤU CHỐT: HỦY TAP NẾU PHÁT HIỆN DRAG ***
        if (deltaX + deltaY > DRAG_CANCEL_THRESHOLD) {
            cancelPendingTapAction();
        }

        totalShakeEnergy += deltaX + deltaY;
        lastMousePosition.x = point.x;
        lastMousePosition.y = point.y;
    });

    // 3. KHI NHẢ CHUỘT RA (POINTER UP)
    const onPointerUp = () => {
        if (isDraggingModel) {
            isDraggingModel = false;
            console.log(`Shake energy on release: ${totalShakeEnergy}`);

            // Chỉ thực thi shake action nếu tap action chưa được kích hoạt
            // và đủ ngưỡng năng lượng.
            if (!triggerTimer && totalShakeEnergy > SHAKE_THRESHOLD) {
                executeShakeAction(model, speakFunction);
            }
            totalShakeEnergy = 0;
        }
    };

    // Lắng nghe sự kiện nhả chuột trên toàn bộ cửa sổ để không bị lỡ
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointerupoutside', onPointerUp);

    // Cập nhật hit area khi thay đổi kích thước cửa sổ
    window.addEventListener('resize', () => { 
        updateHitAreas(model); 
    });

    // Cập nhật hit area theo chuyển động của model
    app.ticker.add(() => {
        updateHitAreas(model);
    });

    console.log("Interaction Manager initialized.");
}