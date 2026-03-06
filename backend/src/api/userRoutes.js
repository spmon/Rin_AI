// backend/src/api/userRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { register, login, getProfile } = require('../controllers/userController');
// Khi có một request POST tới địa chỉ /api/users/register
// thì sẽ gọi hàm userController.register
router.post('/register', register);
router.post('/login', login);
// (Trong tương lai, các route khác như /login sẽ được thêm vào đây)
// --- ROUTE MỚI: ĐƯỢC BẢO VỆ ---
// GET /api/users/profile
// Chỉ những ai có token hợp lệ mới có thể truy cập route này
// Route mới sẽ gọi hàm getProfile
router.get('/profile', protect, getProfile);
module.exports = router;