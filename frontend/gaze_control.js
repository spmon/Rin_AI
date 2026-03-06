// gaze_control.js

// --- CÁC THAM SỐ CỦA LIVE2D ---
// Thêm tham số cho nhãn cầu để mắt linh hoạt hơn
const PARAM_ANGLE_X = "ParamAngleX";       // Điều khiển góc quay trái/phải của đầu/thân
const PARAM_ANGLE_Y = "ParamAngleY";       // Điều khiển góc quay lên/xuống của đầu/thân
const PARAM_EYE_BALL_X = "ParamEyeBallX"; // Điều khiển chuyển động trái/phải của nhãn cầu
const PARAM_EYE_BALL_Y = "ParamEyeBallY"; // Điều khiển chuyển động lên/xuống của nhãn cầu
const PARAM_BODY_X = "ParamBodyAngleX";   // Thường dùng chung với AngleX để thân cũng nghiêng theo

// Biến để theo dõi trạng thái kéo-thả
let isDragging = false;

/**
 * Hàm cập nhật vị trí nhìn của model.
 * @param {PIXI.Point} point - Tọa độ toàn cục của chuột.
 * @param {PIXI.live2d.Live2DModel} model - Instance của model Live2D.
 */
function updateGaze(point, model) {
    if (!model) return;

    // Tinh chỉnh điểm tham chiếu Y (tầm mắt)
    const referenceY = window.innerHeight * 0.4;

    const viewX = point.x - window.innerWidth / 2;
    const viewY = point.y - referenceY;

    // --- CẢI TIẾN: TÁCH BIỆT CHUYỂN ĐỘNG CỦA ĐẦU VÀ MẮT ---
    
    // 1. Chuyển động của đầu/thân (AngleX/Y) - có biên độ lớn hơn.
    // Giá trị chuẩn hóa từ -1 đến 1
    const headNormX = viewX / (window.innerWidth / 2);
    const headNormY = viewY / referenceY;

    // Ánh xạ vào dải giá trị của Live2D (thường là -30 đến 30)
    const angleX = Math.max(-30, Math.min(30, headNormX * 30));
    const angleY = Math.max(-30, Math.min(30, headNormY * 30 * -1));

    // 2. Chuyển động của nhãn cầu (EyeBallX/Y) - có biên độ nhỏ và nhạy hơn.
    // Giá trị chuẩn hóa từ -1 đến 1, thường nhạy hơn một chút.
    const eyeNormX = viewX / (window.innerWidth / 4); // Dùng dải hẹp hơn để mắt nhạy hơn
    const eyeNormY = viewY / (referenceY / 1.5);

    // Ánh xạ vào dải giá trị của nhãn cầu (thường là -1 đến 1)
    const eyeBallX = Math.max(-1, Math.min(1, eyeNormX));
    const eyeBallY = Math.max(-1, Math.min(1, eyeNormY * -1));
    
    // Cập nhật tất cả các tham số
    model.internalModel.coreModel.setParameterValueById(PARAM_ANGLE_X, angleX);
    model.internalModel.coreModel.setParameterValueById(PARAM_ANGLE_Y, angleY);
    model.internalModel.coreModel.setParameterValueById(PARAM_BODY_X, angleX * 0.5); // Thân nghiêng ít hơn đầu
    model.internalModel.coreModel.setParameterValueById(PARAM_EYE_BALL_X, eyeBallX);
    model.internalModel.coreModel.setParameterValueById(PARAM_EYE_BALL_Y, eyeBallY);
}

/**
 * Hàm trả model về trạng thái nhìn thẳng ban đầu.
 * @param {PIXI.live2d.Live2DModel} model 
 */
function resetGaze(model) {
    if (!model) return;
    // Chuyển động mượt mà về 0 thay vì giật về ngay lập tức (Tùy chọn, nâng cao)
    // Hiện tại chúng ta sẽ reset ngay lập tức
    model.internalModel.coreModel.setParameterValueById(PARAM_ANGLE_X, 0);
    model.internalModel.coreModel.setParameterValueById(PARAM_ANGLE_Y, 0);
    model.internalModel.coreModel.setParameterValueById(PARAM_BODY_X, 0);
    model.internalModel.coreModel.setParameterValueById(PARAM_EYE_BALL_X, 0);
    model.internalModel.coreModel.setParameterValueById(PARAM_EYE_BALL_Y, 0);
}

/**
 * Thiết lập trình nghe sự kiện để kích hoạt tính năng theo dõi ánh mắt khi kéo-thả.
 * @param {PIXI.Application} app - Instance của ứng dụng PIXI.
 * @param {PIXI.live2d.Live2DModel} model - Instance của model Live2D.
 */
export function setupGazeTracking(app, model) {
    app.stage.interactive = true;

    // Khi người dùng nhấn chuột xuống
    app.stage.on('pointerdown', (event) => {
        isDragging = true;
        // Cập nhật vị trí nhìn ngay khi nhấn chuột
        updateGaze(event.data.global, model);
    });

    // Khi người dùng nhả chuột (bất kể ở đâu trên màn hình)
    // Lắng nghe trên window để bắt được sự kiện ngay cả khi chuột đã ra ngoài canvas
    window.addEventListener('pointerup', () => {
        if (isDragging) {
            isDragging = false;
            resetGaze(model);
        }
    });

    // Khi người dùng di chuyển chuột
    app.stage.on('pointermove', (event) => {
        // Chỉ cập nhật vị trí nhìn nếu đang trong trạng thái kéo-thả
        if (isDragging) {
            updateGaze(event.data.global, model);
        }
    });
}