const llmService = require('../services/llmService');
const db = require('../config/db');

/**
 * Xử lý gửi tin nhắn chat
 */
exports.handleChatMessage = async (req, res) => {
    // 1. Lấy thông tin từ Request
    const userId = req.user?.userId || req.user?.id; 
    const { conversationId } = req.params;
    
    // Lấy visionContext riêng biệt
    const { message, personality = 'genki', visionContext = null } = req.body; 

    console.log(`--- [CHAT START] User: ${userId}, Conv: ${conversationId}, Tính cách: ${personality} ---`);

    try {
        // --- XỬ LÝ BỐI CẢNH THỊ GIÁC ---
        // Biến này chỉ dùng để gửi cho AI, KHÔNG dùng để lưu DB
        let promptForAI = message;
        if (visionContext) {
            promptForAI = `[BỐI CẢNH THỊ GIÁC: AI Vision thấy: ${visionContext}] Câu hỏi của user: ${message}`;
            console.log("🧠 [Backend] Đang gửi bối cảnh sang AI:", promptForAI);
        }

        // 2. Kiểm tra quyền sở hữu hội thoại
        const [convInfo] = await db.query(
            'SELECT title FROM conversations WHERE id = ? AND user_id = ?', 
            [conversationId, userId]
        );

        if (convInfo.length === 0) {
            return res.status(403).json({ message: 'Bạn không có quyền truy cập hội thoại này.' });
        }
        const currentTitle = convInfo[0].title;

        // 3. Lấy ký ức dài hạn
        const [memories] = await db.query(
            'SELECT memory_key, memory_value FROM user_memories WHERE user_id = ?',
            [userId]
        );

        // 4. Lấy lịch sử 10 tin nhắn
        const [historyRows] = await db.query(
            'SELECT role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10',
            [conversationId]
        );
        const history = historyRows.reverse();

        // 5. GỌI AI (SỬA Ở ĐÂY: Truyền promptForAI thay vì message)
        const rinData = await llmService.askGemini(promptForAI, history, memories, personality);

        // 6. Quản lý ký ức mới
        if (rinData.extract_memories && Array.isArray(rinData.extract_memories)) {
            for (let m of rinData.extract_memories) {
                const op = m.op || 'add';
                if (op === 'add' && m.key && m.value) {
                    await db.query(
                        `INSERT INTO user_memories (user_id, memory_key, memory_value) 
                         VALUES (?, ?, ?) 
                         ON DUPLICATE KEY UPDATE memory_value = VALUES(memory_value)`,
                        [userId, m.key, m.value]
                    );
                    console.log(`[Memory] Đã lưu: ${m.key}`);
                } 
                else if (op === 'remove' && m.key) {
                    await db.query(
                        'DELETE FROM user_memories WHERE user_id = ? AND memory_key = ?',
                        [userId, m.key]
                    );
                    console.log(`[Memory] Đã xóa: ${m.key}`);
                }
            }
        }

        // 7. Đổi tên hội thoại (Dùng message gốc để đặt tên cho gọn)
        if (currentTitle === 'Hội thoại mới' || history.length === 0) {
            const newTitle = message.length > 30 ? message.substring(0, 30) + "..." : message;
            await db.query('UPDATE conversations SET title = ? WHERE id = ?', [newTitle, conversationId]);
        }

        // 8. LƯU TIN NHẮN VÀO DB (SỬA Ở ĐÂY: Lưu message gốc để UI sạch sẽ)
        const saveSql = `
            INSERT INTO chat_messages (user_id, conversation_id, role, content) 
            VALUES (?, ?, ?, ?), (?, ?, ?, ?)
        `;
        const values = [
            userId, conversationId, 'user', message, // <--- Chỉ lưu "cái này là gì"
            userId, conversationId, 'assistant', rinData.response
        ];
        await db.query(saveSql, values);

        // 9. Trả về cho Frontend
        res.status(200).json({ 
            response: rinData.response,
            expression: rinData.expression
        });

        console.log("--- [CHAT SUCCESS] ---");

    } catch (error) {
        console.error("---------- !!! LỖI CHI TIẾT TẠI BACKEND ----------");
        console.error("Lỗi:", error.message);
        res.status(500).json({ message: 'Rin gặp lỗi rồi!', error: error.message });
    }
};