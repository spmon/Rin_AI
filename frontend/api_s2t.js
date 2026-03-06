/**
 * File: api_s2t.js
 * Phiên bản: Đã thêm hỗ trợ Đa ngôn ngữ (vi, en, zh, jp, kr)
 */

// 1. Chỉ giữ lại phần Base URL
const BASE_WS_URL = "wss://14.224.188.206:8996/ws/audio";
const CHUNK_SIZE_MS = 300;
const SILENCE_THRESHOLD_MS = 2000;

let websocket;
let audioContext;
let mediaStream;
let mediaStreamSource;
let scriptProcessor;
let isRecording = false;
let silenceTimer = null;
let isAutoMode = false;

// 2. Biến lưu ngôn ngữ hiện tại (Mặc định là vi)
let currentLang = "vi"; 

function floatTo16BitPCM(input) {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output;
};

async function startRecording(onTranscriptUpdate, onStatusChange, onRecordingEnd) {
    if (isRecording) return;
    console.log(`[S2T] Bắt đầu ghi âm với ngôn ngữ: ${currentLang.toUpperCase()}...`);

    try {
        onStatusChange(true, `Đang nghe (${currentLang})...`);
        
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 }
        });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
        mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
        
        const targetBufferSize = Math.ceil((audioContext.sampleRate * CHUNK_SIZE_MS) / 1000);
        let bufferSize = 256;
        while (bufferSize < targetBufferSize) bufferSize *= 2;
        if (bufferSize > 16384) bufferSize = 16384;

        scriptProcessor = audioContext.createScriptProcessor(bufferSize, 2, 1);

        scriptProcessor.onaudioprocess = (e) => {
            if (websocket?.readyState !== WebSocket.OPEN) return;
            const leftChannel = e.inputBuffer.getChannelData(0);
            const rightChannel = e.inputBuffer.getChannelData(1);
            const monoData = new Float32Array(leftChannel.length);
            for (let i = 0; i < leftChannel.length; i++) {
                monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
            }
            websocket.send(floatTo16BitPCM(monoData).buffer);
        };
        
        mediaStreamSource.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination);
        
        // 3. Tạo URL động dựa trên ngôn ngữ đã chọn
        const dynamicUrl = `${BASE_WS_URL}?lang=${currentLang}`;
        console.log("[S2T] Connecting to:", dynamicUrl);

        websocket = new WebSocket(dynamicUrl);
        websocket.binaryType = 'arraybuffer';
        
        websocket.onopen = () => {
            console.log("✅ [WebSocket] Kết nối THÀNH CÔNG.");
            isRecording = true;
            onStatusChange(true, `Đang nhận dạng (${currentLang})...`);
        };
        
        websocket.onmessage = (event) => {
            clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                console.log("[S2T] Phát hiện im lặng...");
                onRecordingEnd();
            }, SILENCE_THRESHOLD_MS);

            const message = event.data;
            if (typeof message === 'string' && message.includes("|")) {
                const [status, transcript] = message.split('|', 2);
                onTranscriptUpdate(transcript, status);
            }
        };

        websocket.onclose = (event) => {
            if (isRecording) stopRecording(onStatusChange, true);
        };

        websocket.onerror = (error) => {
            console.error("🔥 [WebSocket] Lỗi:", error);
            if (isRecording) stopRecording(onStatusChange, true);
        };

    } catch (err) {
        console.error("🔥 [S2T] Lỗi startRecording:", err);
        alert(`Không thể bắt đầu ghi âm: ${err.message}`);
        onStatusChange(false, "Lỗi ghi âm");
    }
}

function stopRecording(onStatusChange, calledFromEvent = false) {
    if (!isRecording && !calledFromEvent) return;
    
    console.log("[S2T] Đang dừng ghi âm...");
    clearTimeout(silenceTimer);
    isRecording = false;

    mediaStream?.getTracks().forEach(track => track.stop());
    scriptProcessor?.disconnect();
    mediaStreamSource?.disconnect();
    
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(console.error);
    }
    
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.close(1000, "Client stopped");
    }

    websocket = audioContext = mediaStream = scriptProcessor = mediaStreamSource = null;
    
    if (onStatusChange) {
        onStatusChange(false, "Đã dừng");
    }
}

export function setupSpeechToText(onSend) {
    const micButton = document.getElementById('mic-btn');
    const chatInput = document.getElementById('chat-input');
    
    // 4. Lấy element chọn ngôn ngữ và lắng nghe sự kiện
    const langSelect = document.getElementById('s2t-lang-select');
    
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            currentLang = e.target.value;
            console.log(`[S2T] Đã đổi ngôn ngữ sang: ${currentLang}`);
            
            // Nếu đang ghi âm mà đổi ngôn ngữ -> Dừng lại để người dùng bật lại (tránh lỗi socket)
            if (isRecording) {
                isAutoMode = false;
                stopRecording((isRec, status) => {
                    micButton.style.backgroundColor = '#555';
                    chatInput.placeholder = "Đã đổi ngôn ngữ. Nhấn Mic để nói lại.";
                });
            }
        });
    }

    let confirmedTranscript = ""; 
    let interimTranscript = "";   

    const handleTranscriptUpdate = (transcript, status) => {
        if (status === 'NEW') {
            confirmedTranscript = (confirmedTranscript + " " + interimTranscript).trim();
            interimTranscript = transcript;
        } else {
            interimTranscript = transcript;
        }
        chatInput.value = (confirmedTranscript + " " + interimTranscript).trim();
    };

    const handleStatusChange = (isRec, statusText) => {
        isRecording = isRec;
        micButton.style.backgroundColor = isRec ? '#c82333' : '#555';
        chatInput.placeholder = isRec ? statusText : "Trò chuyện với Rin...";
    };

    const handleRecordingEnd = () => {
        if (!isRecording) return;
        stopRecording(handleStatusChange);

        chatInput.value = (confirmedTranscript + " " + interimTranscript).trim();
        
        if (chatInput.value) {
            onSend(); 
        }
    };

    window.addEventListener('rin-done-speaking', () => {
        if (isAutoMode) {
            // Reset text cũ
            confirmedTranscript = "";
            interimTranscript = "";
            chatInput.value = "";
            startRecording(handleTranscriptUpdate, handleStatusChange, handleRecordingEnd);
        }
    });

    micButton.addEventListener('click', () => {
        if (isRecording) {
            isAutoMode = false;
            handleRecordingEnd();
        } else {
            isAutoMode = true;
            confirmedTranscript = "";
            interimTranscript = "";
            chatInput.value = "";
            startRecording(handleTranscriptUpdate, handleStatusChange, handleRecordingEnd);
        }
    });
}