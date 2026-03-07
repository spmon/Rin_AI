// frontend/api_chat.js

import { speak } from './api_t2s.js';
import { sendChatMessage } from './apiService.js';
import { getToken } from './auth.js';
import { getActiveChatId, renderConversationsList, appendMessageToUI, startNewConversation } from './chatManager.js';

let responseTimeout;
let actionTimers = {}; 
const TRIGGER_THRESHOLD = 2000; 
const ACTION_COOLDOWN = 30000; 
let lastTriggeredActionTime = {};
let pendingUserQuestion = ""; // Lưu câu hỏi chờ bối cảnh từ Vision
let latestEmotion = "Neutral"; 
const EMOTION_VI = {
    'Happy': 'đang cười rất vui vẻ',
    'Sad': 'trông có vẻ buồn bã',
    'Angry': 'đang cau mày tức giận',
    'Surprise': 'đang rất ngạc nhiên',
    'Fear': 'trông có vẻ sợ hãi',
    'Disgust': 'đang nhăn mặt khó chịu',
    'Neutral': 'có nét mặt bình thường',
    'No Face': 'đã rời đi, không có mặt trước màn hình'
};
const VISION_KEYWORDS = ["là gì", "cái này", "đây là", "nhìn", "thấy không", "màu gì", "what is this", "look", "thấy", "trông", "đẹp không","xấu không", "cầm gì"];

function showResponse(text) {
    const responseElement = document.getElementById('response-text');
    if (responseElement) {
        responseElement.innerText = text;
        responseElement.style.opacity = '1';
        if (responseTimeout) clearTimeout(responseTimeout);
        responseTimeout = setTimeout(() => {
            responseElement.style.opacity = '0';
        }, 20000);
    }
}

function ensureHistoryPanelOpen() {
    const historyPanel = document.getElementById('message-history-panel');
    if (historyPanel && !historyPanel.classList.contains('active')) {
        historyPanel.classList.add('active');
    }
}

/**
 * Hàm gửi tin nhắn chính (Tích hợp bối cảnh Thị giác và Não bộ Gemini)
 * @param {Object} model - Model Live2D
 * @param {String} customText - Dùng cho tin nhắn hệ thống (vẫy tay)
 * @param {String} visionDescription - Mô tả từ AI Vision gửi về
 */
// frontend/api_chat.js

// frontend/api_chat.js

export async function sendMessage(model, customText = null, visionDescription = null) {
    const inputElement = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-btn');
    
    // 1. userInput: LUÔN LUÔN là câu hỏi gốc của bạn (để hiển thị)
    const userInput = customText || inputElement.value.trim();
    const currentPersonality = localStorage.getItem('rin_personality') || 'genki';
    
    if (!userInput) return;

    // 2. LOGIC HIỂN THỊ (Chỉ chạy 1 lần duy nhất khi bắt đầu)
    // Nếu có visionDescription nghĩa là đây là lần gọi lại nội bộ, KHÔNG hiển thị thêm bubble nữa
    if (!visionDescription) {
        appendMessageToUI('user', userInput); // Chỉ hiện câu hỏi "thấy tôi đang làm gì ko"
        ensureHistoryPanelOpen();
        showResponse("Rin đang suy nghĩ...");
    }

    // 3. KIỂM TRA TỪ KHÓA THỊ GIÁC (Lần đầu tiên)
    const needsVision = VISION_KEYWORDS.some(key => userInput.toLowerCase().includes(key));
    if (needsVision && !visionDescription && !customText) {
        pendingUserQuestion = userInput; // Lưu câu hỏi gốc vào biến tạm
        askRinAboutObject(model, userInput); 
        inputElement.value = '';
        return; // Dừng lại, đợi Vision trả về rồi hàm này sẽ được gọi lại kèm visionDescription
    }

    // 4. CHUẨN BỊ NỘI DUNG GỬI AI (Xử lý ngầm)
    let messageToSendToAPI = userInput;
    let emotionText = EMOTION_VI[latestEmotion] || latestEmotion;
    let contextPrompt = `[Bối cảnh ngầm từ Camera: Người dùng ${emotionText}] `;
    
    // Ghép bối cảnh ngầm vào câu nói của người dùng
    messageToSendToAPI = contextPrompt + userInput;
    if (visionDescription) {
        // Chỉ ghép bối cảnh vào biến gửi đi, KHÔNG động vào biến userInput
        messageToSendToAPI = `${userInput}`;
        console.log("🧠 Gửi ngầm cho AI:", messageToSendToAPI);
    }

    // 5. CÁC THỦ TỤC AUTH & ID
    const token = getToken();
    if (!token) { showResponse("Vui lòng đăng nhập!"); return; }
    let conversationId = getActiveChatId();
    const isFirstMessage = !conversationId; 

    // UI States
    if (!customText && !visionDescription) inputElement.value = '';
    sendButton.disabled = true;
    inputElement.disabled = true;

    try {
        if (isFirstMessage) {
            conversationId = await startNewConversation(); 
            if (!conversationId) throw new Error("Lỗi tạo hội thoại");
        }

        // 6. GỌI API VỚI NỘI DUNG ĐÃ GHÉP (messageToSendToAPI)
        const data = await sendChatMessage(conversationId, messageToSendToAPI, token, currentPersonality, visionDescription); 
        
        const rinResponse = data.response || "...";
        const rinExpression = data.expression;

        // Xử lý biểu cảm và nói
        if (rinExpression && model && typeof model.expression === 'function') {
            model.expression(rinExpression.toLowerCase() === 'surprised' ? 'surprise' : rinExpression.toLowerCase());
        }

        appendMessageToUI('assistant', rinResponse);
        showResponse(rinResponse);
        
        if (speak) speak(rinResponse, model);
        if (typeof renderConversationsList === 'function') renderConversationsList(); 

    } catch (error) {
        console.error('❌ [DEBUG] Lỗi:', error);
    } finally {
        sendButton.disabled = false;
        inputElement.disabled = false;
        if (!customText) inputElement.focus();
    }
}

/**
 * Lắng nghe dữ liệu từ Vision (Webcam)
 */
export function setupVisionListener(model) {
    window.addEventListener('vision-data', (e) => {
        const data = e.detail;

        // 1. LUỒNG NHANH: Xử lý Hành động (Waving, Stretching...)
        if (data.type === "action_result") {
            const currentAction = data.action;
            const confidence = data.action_confidence;
            if (data.emotion && data.emotion !== "Error") {
                latestEmotion = data.emotion;
            }
            if (confidence > 0.8) {
                const now = Date.now();
                if (!actionTimers[currentAction]) actionTimers[currentAction] = now;

                const duration = now - actionTimers[currentAction];
                const lastTrigger = lastTriggeredActionTime[currentAction] || 0;

                if (duration >= TRIGGER_THRESHOLD && (now - lastTrigger) > ACTION_COOLDOWN) {
                    console.log(`🎯 Kích hoạt hành động: ${currentAction}`);
                    handleActionTrigger(currentAction, model);
                    lastTriggeredActionTime[currentAction] = now;
                    actionTimers[currentAction] = null;
                }
            } else {
                actionTimers[currentAction] = null;
            }
        }

        // 2. LUỒNG CHẬM: Nhận kết quả mô tả vật thể (VQA)
        if (data.type === "caption_result") {
            const visionDesc = data.text;
            console.log("📸 Vision trả về mô tả:", visionDesc);
            
            // Gửi mô tả này + Câu hỏi đang chờ sang Não Gemini
            if (pendingUserQuestion) {
                sendMessage(model, pendingUserQuestion, visionDesc);
                pendingUserQuestion = ""; // Reset
            }
        }
    });
}

function handleActionTrigger(action, model) {
    if (action === "waving") {
        sendMessage(model, "Rin ơi, mình vừa vẫy tay chào bạn đó!");
    } else if (action === "stretching") {
        sendMessage(model, "Rin ơi, mình đang vươn vai mệt mỏi quá...");
    }
}

export function askRinAboutObject(model, question) {
    // Ưu tiên video từ debug, nếu không có thì tìm video chung
    const video = document.getElementById('debug-video') || document.querySelector('video'); 
    if (!video) {
        showResponse("Rin không thấy camera...");
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const rawBase64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

    showResponse("Để Rin nhìn kỹ xem nào...");

    // Gửi lệnh sang vision_manager.js qua Custom Event
    window.dispatchEvent(new CustomEvent('send-vision-qa', { 
        detail: { image: rawBase64, question: question } 
    }));
}

export function setupChat(model) {
    const inputElement = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-btn');
    
    setupVisionListener(model);

    if (sendButton && inputElement) {
        sendButton.onclick = () => sendMessage(model);
        inputElement.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') sendMessage(model);
        });
    }
}