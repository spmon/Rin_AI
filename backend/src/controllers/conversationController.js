// backend/src/controllers/conversationController.js
const db = require('../config/db');

// Lấy danh sách tất cả các cuộc hội thoại của user
exports.listConversations = async (req, res) => {
    try {
        const userId = req.user.userId;
        const sql = 'SELECT id, title, created_at FROM conversations WHERE user_id = ? ORDER BY created_at DESC';
        const [conversations] = await db.query(sql, [userId]);
        res.status(200).json(conversations);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách hội thoại.' });
    }
};

// Tạo một cuộc hội thoại mới
exports.createConversation = async (req, res) => {
    try {
        const userId = req.user.userId;
        const sql = 'INSERT INTO conversations (user_id) VALUES (?)';
        const [result] = await db.query(sql, [userId]);
        const newConversation = {
            id: result.insertId,
            title: 'Hội thoại mới',
        };
        res.status(201).json(newConversation);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi tạo hội thoại mới.' });
    }
};



// === THÊM HÀM MỚI ===
exports.getConversationMessages = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { conversationId } = req.params;

        // Kiểm tra xem user có quyền truy cập không
        const checkOwnerSql = 'SELECT id FROM conversations WHERE id = ? AND user_id = ?';
        const [ownerCheck] = await db.query(checkOwnerSql, [conversationId, userId]);
        if (ownerCheck.length === 0) {
            return res.status(403).json({ message: 'Không có quyền truy cập.' });
        }

        // Lấy tất cả tin nhắn
        const sql = 'SELECT role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC';
        const [messages] = await db.query(sql, [conversationId]);
        
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy tin nhắn.' });
    }
};

exports.deleteConversation = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { conversationId } = req.params;

        // Chỉ xóa nếu hội thoại đó thuộc về user
        const sql = 'DELETE FROM conversations WHERE id = ? AND user_id = ?';
        const [result] = await db.query(sql, [conversationId, userId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy hội thoại hoặc không có quyền xóa.' });
        }

        res.status(200).json({ message: 'Đã xóa hội thoại.' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi xóa hội thoại.' });
    }
};