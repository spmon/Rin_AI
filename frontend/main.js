// Thiết lập alias
const Application = PIXI.Application;
const Live2DModel = PIXI.live2d.Live2DModel;

// Import các module điều khiển
import { setupUIAndControls } from './ui_controls.js';
// import { setupChat, sendMessage } from './api_llm.js';
import { setupChat, sendMessage } from './api_chat.js';
import { setupSpeechToText } from './api_s2t.js';
import { setupGazeTracking } from './gaze_control.js';
import { setupInteractions } from './interaction_manager.js';
import { speak } from './api_t2s.js';
import { setupConversationControls } from './chatManager.js';
import { initVision } from './vision_manager.js';
import { initVisionDebug } from './vision_debug.js';
// Thay link ngrok vision của bạn
initVision("ws://localhost:8080");

// import { initializeChatSystem } from './chatsystem.js';

// --- CHÌA KHÓA CUỐI CÙNG: KẾT NỐI LIVE2D VỚI "NHỊP TIM" CỦA PIXI ---
// Dòng này phải được gọi một lần duy nhất, trước khi tải bất kỳ model nào.
// Nó nói cho tất cả các model Live2D biết cách tự cập nhật theo mỗi khung hình.
// Live2DModel.registerTicker(PIXI.Ticker.shared);

const modelPath = './models/lavender/Lavender.model3.json?v=' + new Date().getTime();
initVisionDebug();
window.addEventListener('DOMContentLoaded', async () => {
    document.body.style.backgroundImage = "url('./background/bg6.jpg')";
    const canvas = document.querySelector('canvas');
    const app = new Application({
        view: canvas,
        autoStart: true,
        resizeTo: window,
        backgroundColor: 0x333333,
        transparent: true,
    });
    console.log("🔵 [Main] DOM đã tải xong. Bắt đầu khởi tạo ứng dụng.");
    try {
        const model = await Live2DModel.from(modelPath);
        app.stage.addChild(model);
        window.model = model;
        model.autoInteract = false;

        setTimeout(() => {
            console.log("🔵 [Main] Bắt đầu thiết lập các hệ thống phụ...");
            // ... code thiết lập vị trí ...
            const baseScale = (window.innerHeight * 1.5) / model.height;
            const zoomFactor = 2.0;
            model.scale.set(baseScale * zoomFactor);
            model.anchor.set(0.5, 0.3);
            model.x = window.innerWidth / 2;
            const modelDisplayHeight = model.height * model.scale.y;
            model.y = (window.innerHeight / 2) + (modelDisplayHeight / 4);
            
            

            // ... code vòng lặp Idle ...
            const idleMotions = ['Idle1', 'Idle2', 'Idle3'];
            const randomIdle = idleMotions[Math.floor(Math.random() * idleMotions.length)];
            model.motion(randomIdle, undefined, 1);
            setInterval(() => {
                const randomIdle = idleMotions[Math.floor(Math.random() * idleMotions.length)];
                model.motion(randomIdle, undefined, 1);
            }, 20000);

            // Kích hoạt các nút bấm và chat
            // setupControls(model);
            setupUIAndControls(model);
            setupChat(model);
            const triggerLLMSend = () => sendMessage(model);
            setupSpeechToText(triggerLLMSend);
            setupGazeTracking(app, model);
            // setupInteractions(app, model, (text) => speak(text, model), true);
            // setupShakeInteraction(app, model, speak);
            setupInteractions(app, model, speak, true)
            setupConversationControls();
            console.log("✅ [Main] Hoàn tất thiết lập.");
        }, 0);

    } catch (error) {
        console.error("Lỗi khi tải file model Live2D:", error);
    }
});