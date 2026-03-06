// <<< THÊM MỚI: Import hàm khóa/mở khóa từ interaction manager >>>
import { lockInteractions, unlockInteractions } from './interaction_manager.js';

const T2S_API_ENDPOINT = 'https://14.224.188.206:8996/t2s_stream';
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Biến để điều khiển vòng lặp cập nhật lip sync
let isPlaying = false;
let lipSyncAnimationId = null;
let currentSourceNode = null; // Thêm biến để theo dõi source node hiện tại

/**
 * Tự xây dựng cơ chế lip sync (Giữ nguyên, không thay đổi)
 */
function manualLipSync(analyserNode, model) {
    const mouthParamId = 'ParamMouthOpenY';
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    function update() {
        if (!isPlaying) {
            if (model.internalModel && model.internalModel.coreModel) {
                model.internalModel.coreModel.setParameterValueById(mouthParamId, 0);
            }
            cancelAnimationFrame(lipSyncAnimationId);
            return;
        }

        analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        const averageVolume = sum / dataArray.length;
        const mouthOpen = Math.min(1.0, averageVolume / 100); 

        if (model.internalModel && model.internalModel.coreModel) {
            model.internalModel.coreModel.setParameterValueById(mouthParamId, mouthOpen);
        }

        lipSyncAnimationId = requestAnimationFrame(update);
    }
    update();
}

/**
 * NHẬN VĂN BẢN, gọi API T2S, sau đó phát và lip sync.
 * @param {string} text - Văn bản cần chuyển thành giọng nói.
 * @param {Live2DModel} model - Đối tượng model để điều khiển lip sync.
 */
export async function speak(text, model) {
    if (!text || !model) return;

    // Ngừng âm thanh và animation đang chạy nếu có
    if (currentSourceNode) {
        currentSourceNode.onended = null; // Hủy sự kiện onended cũ để tránh unlock nhầm
        currentSourceNode.stop();
        currentSourceNode = null;
    }
    if (lipSyncAnimationId) {
        cancelAnimationFrame(lipSyncAnimationId);
        lipSyncAnimationId = null;
    }
    isPlaying = false;


    // <<< ĐIỂM MẤU CHỐT 1: KHÓA TƯƠNG TÁC NGAY LẬP TỨC >>>
    // Ngay khi hàm được gọi và quyết định sẽ nói, hãy khóa mọi tương tác khác.
    lockInteractions();

    try {
        const t2sResponse = await fetch(T2S_API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "chabot_answer": text })
        });
        if (!t2sResponse.ok) throw new Error(`T2S API Error: ${t2sResponse.status}`);
        
        const arrayBuffer = await t2sResponse.arrayBuffer();
        // Kiểm tra xem audio context có bị treo không, nếu có thì resume
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        currentSourceNode = sourceNode; // Lưu lại source node hiện tại

        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 256;

        sourceNode.connect(analyserNode);
        analyserNode.connect(audioContext.destination);

        isPlaying = true;
        sourceNode.start();
        
        manualLipSync(analyserNode, model);

        // <<< ĐIỂM MẤU CHỐT 2: MỞ KHÓA KHI NÓI XONG >>>
        sourceNode.onended = () => {
            console.log("Speech finished successfully.");
            isPlaying = false;
            currentSourceNode = null;
            unlockInteractions(); // Mở khóa tương tác khi âm thanh kết thúc.

                        // --- THÊM DÒNG NÀY ---
            // Phát đi một tín hiệu thông báo Rin đã nói xong
            window.dispatchEvent(new CustomEvent('rin-done-speaking'));
        };

    } catch (error) {
        console.error("Lỗi khi xử lý giọng nói:", error);
        isPlaying = false;
        
        // <<< ĐIỂM MẤU CHỐT 3: MỞ KHÓA KHI GẶP LỖI >>>
        // Rất quan trọng! Nếu không, model sẽ bị khóa vĩnh viễn nếu API lỗi.
        unlockInteractions();
    }
}