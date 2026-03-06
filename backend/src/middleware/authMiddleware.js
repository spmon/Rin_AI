// backend/src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // 1. Kiểm tra xem token có được gửi trong header 'Authorization' không
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Lấy token ra khỏi header (loại bỏ chữ 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 3. Xác thực token bằng mã bí mật
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 4. Gắn thông tin người dùng đã được giải mã vào đối tượng request
            // để các hàm xử lý phía sau có thể sử dụng (ví dụ: req.user.userId)
            req.user = decoded;

            // 5. Cho phép đi tiếp tới hàm xử lý tiếp theo
            next();
        } catch (error) {
            console.error('Lỗi xác thực token:', error);
            res.status(401).json({ message: 'Token không hợp lệ, truy cập bị từ chối.' });
        }
    }

    // Nếu không có token nào được gửi
    if (!token) {
        res.status(401).json({ message: 'Không có token, truy cập bị từ chối.' });
    }
};

module.exports = { protect };