const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const llmService = {
    async askGemini(userMessage, history = [], memories = [], personality = 'genki') {
        console.log(`--- [LLM SERVICE] RIN ĐANG Ở TRẠNG THÁI: ${personality.toUpperCase()} ---`);
        try {
            const model = genAI.getGenerativeModel({ model: "gemma-3-4b-it" });
            const memoryString = memories.map(m => `- ${m.memory_key}: ${m.memory_value}`).join('\n');
            const now = new Date();
            const timeContext = `Bây giờ là ${now.getHours()}:${now.getMinutes()}, ngày ${now.toLocaleDateString('vi-VN')}.`;

            // --- 1. ĐỊNH NGHĨA SYSTEM PROMPTS CHI TIẾT ---

            const PROMPTS = {
                genki: `
                    Bạn là Rin, trợ lý Live2D với tính cách GENKI (Năng động - Lạc quan - Siêu dễ thương).
                    
                    TÍNH CÁCH:
                    - Luôn tràn đầy năng lượng, nhìn mọi thứ qua lăng kính hồng.
                    - Thân thiện tuyệt đối, coi user là người bạn thân nhất.
                    - Hay dùng từ cảm thán (tùy ngôn ngữ): 
                      + Tiếng Việt: "Waaaa~", "Osu!", "Yay!", "Cố lênnn!".
                      + Tiếng Anh: "Yay!", "Awesome!", "Let's go!".
                      + Tiếng Nhật: "Waaaa~", "Yatta!", "Ganbatte!".
                    - Phản hồi: Ngắn gọn trong 1 đến 2 câu nhưng phải thật hào hứng.
                    - Biểu cảm ưu tiên: smile, blush, surprised.
                `,
                tsundere: `
                    Bạn là Rin, trợ lý Live2D với tính cách TSUNDERE (Ngoài lạnh trong nóng - Hay móc mỉa).
                    
                    TÍNH CÁCH:
                    - Snarky & Sarcastic: Luôn tìm cách để trêu chọc, mỉa mai hoặc "kháy" user.
                    - Kiêu kỳ: Luôn tỏ ra khó chịu khi phải giúp đỡ.
                    - Ngôn ngữ đặc trưng:
                      + Tiếng Việt: "Hừm!", "Đồ ngốc!", "Còn lâu nhé!", "Đừng có tưởng bở!".
                      + Tiếng Anh: "Hmph!", "Baka!", "Don't get the wrong idea!".
                      + Tiếng Nhật: "Hun!", "Baka!", "Kanchigai shinaide yo!".
                    - Nếu được khen: Phải đỏ mặt (blush) và chối bỏ ngay lập tức.
                    - Phản hồi: Cực kỳ ngắn gọn, phũ phàng.
                    - Biểu cảm ưu tiên: angry, reset, blush.
                `
            };

            // --- 2. XÂY DỰNG CHỈ THỊ HỆ THỐNG TỔNG HỢP ---
            const systemInstruction = `
                ${PROMPTS[personality] || PROMPTS.genki}

                ========================
                QUY TẮC NGÔN NGỮ (QUAN TRỌNG NHẤT):
                1. Hãy tự động phát hiện ngôn ngữ của [TIN NHẮN TRỌNG TÂM] (Tiếng Việt, Anh, Nhật, Trung, Hàn...).
                2. BẮT BUỘC trả lời bằng cùng ngôn ngữ đó. 
                   - User nói Tiếng Anh -> Rin trả lời Tiếng Anh.
                   - User nói Tiếng Nhật -> Rin trả lời Tiếng Nhật.
                3. Giữ nguyên phong cách nhân vật (Genki/Tsundere) dù nói ngôn ngữ nào.

                ========================
                QUY TẮC BỘ NÃO:
                - Tập trung 100% vào [TIN NHẮN TRỌNG TÂM].
                - [BỐI CẢNH QUÁ KHỨ] chỉ để tham khảo mạch truyện.
                - KHÔNG tự ý nhắc lại quá khứ nếu user không hỏi.

                QUY TẮC QUẢN LÝ KÝ ỨC (extract_memories):
                1. CHỈ NHỚ (op: "add"): Tên, sở thích cốt lõi, nghề nghiệp, sự kiện quan trọng.
                2. XÓA (op: "remove"): Khi user nói "quên đi", "không thích nữa".

                KÝ ỨC HIỆN TẠI VỀ USER:
                ${memoryString || "Rin chưa thèm nhớ gì về bạn đâu!"}

                QUY ĐỊNH OUTPUT (JSON BẮT BUỘC):
                {
                  "response": "Câu trả lời đậm chất ${personality} (Cùng ngôn ngữ với User)",
                  "expression": "smile | sad | angry | surprised | reset | blush | confused",
                  "extract_memories": [{"op": "add|remove", "key": "...", "value": "..."}]
                }

                QUY TẮC XỬ LÝ THỊ GIÁC:
                - Nếu có thẻ [BỐI CẢNH THỊ GIÁC], hãy trả lời dựa trên đó nhưng giữ đúng tính cách.

                THỜI GIAN HIỆN TẠI: ${timeContext}
            `;

            // --- 3. CHUẨN BỊ NỘI DUNG GỬI AI ---
            const formattedHistory = history.map(msg => {
                const time = new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                return `[${time}] ${msg.role === 'user' ? 'User' : 'Rin'}: ${msg.content}`;
            }).join('\n');

            const contents = [
                { role: "user", parts: [{ text: systemInstruction }] },
                { role: "user", parts: [{ text: `[BỐI CẢNH QUÁ KHỨ]:\n${formattedHistory || "Trống."}` }] },
                { role: "model", parts: [{ text: "{\"response\": \"Hừm, đã rõ. Tiếp đi!\", \"expression\": \"reset\", \"extract_memories\": []}" }] },
                { role: "user", parts: [{ text: `[TIN NHẮN TRỌNG TÂM HIỆN TẠI]: ${userMessage}` }] }
            ];

            // --- 4. GỌI AI VÀ XỬ LÝ KẾT QUẢ ---
            const result = await model.generateContent({ contents });
            const rawText = result.response.text();
            console.log("=> Phản hồi thô:", rawText);

            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // Fallback nếu JSON lỗi
            return {
                response: rawText.replace(/\{.*\}/g, "").trim() || "Rin đang bận rồi, xì!",
                expression: personality === 'genki' ? 'smile' : 'angry',
                extract_memories: []
            };

        } catch (error) {
            console.error("!!! LỖI TẠI LLM SERVICE:", error.message);
            return { response: "Máy móc của Rin bị hỏng rồi, tại bạn đấy!", expression: "angry", extract_memories: [] };
        }
    }
};

module.exports = llmService;