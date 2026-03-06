// backend/src/server.js (Phiên bản đã sửa lỗi)

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

// --- KIỂM TRA CÁC DÒNG IMPORT ---
const userRoutes = require('./api/userRoutes');
const chatRoutes = require('./api/chatRoutes');
const conversationRoutes = require('./api/conversationRoutes'); // <-- KIỂM TRA DÒNG NÀY

const app = express();
const PORT = 4000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- API Routes ---
// Đăng ký các route với ứng dụng Express
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationRoutes);

// Route mặc định
app.get('/', (req, res) => {
    res.send('Rin Backend (Local) is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});