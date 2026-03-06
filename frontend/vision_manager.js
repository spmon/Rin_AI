// frontend/vision_manager.js

let ws;
const canvas = document.createElement('canvas');
canvas.width = 640;
canvas.height = 480;
const ctx = canvas.getContext('2d');
const video = document.createElement('video');
video.autoplay = true;
video.playsInline = true;

export async function initVision(wsUrl) {
    try {
        // --- Phần Camera Stream (Giữ nguyên) ---
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        video.srcObject = stream;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log("✅ Vision Socket Connected");
            // Gửi luồng cam liên tục (Fast path)
            setInterval(sendStreamFrame, 200); 
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            window.dispatchEvent(new CustomEvent('vision-data', { detail: data }));
        };

        // --- LẮNG NGHE SỰ KIỆN TỪ vision_upload.js ---
        window.addEventListener('send-vision-qa', (e) => {
            const { image, question } = e.detail;
            
            if (ws && ws.readyState === WebSocket.OPEN) {
                console.log(`📤 Đang gửi ảnh Upload để hỏi: "${question}"`);
                
                // Gửi đúng định dạng backend yêu cầu: QA,base64,câu_hỏi
                ws.send(`QA,${image},${question}`);
            } else {
                console.warn("⚠️ Vision Socket chưa sẵn sàng");
                alert("Rin chưa sẵn sàng để nhìn ảnh này. Vui lòng đợi chút!");
            }
        });   

    } catch (err) {
        console.error("Vision Error:", err);
    }
}

function sendStreamFrame() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Lưu ý: Stream thường gửi cả header hoặc raw tùy backend xử lý
        // Ở đây giả định backend xử lý được cả hai, hoặc bạn dùng .split(',')[1] nếu cần
        let base64 = canvas.toDataURL('image/jpeg', 0.4); 
        ws.send(base64);
    }
}

// Hàm gửi ảnh từ Camera hiện tại (Snapshot)
export function sendQA(question) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Lấy Raw Base64 từ Camera
        let rawBase64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
        ws.send(`QA,${rawBase64},${question}`);
    }
}