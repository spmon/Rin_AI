// backend/src/controllers/userController.js

const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const saltRounds = 10; // Độ "mạnh" của việc mã hóa mật khẩu

// Hàm xử lý logic đăng ký
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 1. Kiểm tra xem thông tin đã được gửi đủ chưa
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ username, email và password.' });
        }

        // 2. Mã hóa mật khẩu trước khi lưu vào database
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // 3. Lưu người dùng vào database
        const sql = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
        // Dùng '?' để tránh lỗi bảo mật SQL Injection
        const [result] = await db.query(sql, [username, email, passwordHash]);

        // 4. Gửi lại phản hồi thành công cho client
        res.status(201).json({ 
            message: 'Đăng ký tài khoản thành công!', 
            userId: result.insertId 
        });

    } catch (error) {
        // Xử lý các lỗi thường gặp
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Username hoặc email này đã tồn tại.' });
        }
        
        console.error('Lỗi trong quá trình đăng ký:', error);
        res.status(500).json({ message: 'Đã có lỗi xảy ra phía server.' });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Kiểm tra thông tin đầu vào
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp email và password.' });
        }

        // 2. Tìm người dùng trong database bằng email
        const sql = 'SELECT * FROM users WHERE email = ?';
        const [users] = await db.query(sql, [email]);

        // Nếu không tìm thấy người dùng
        if (users.length === 0) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }

        const user = users[0];

        // 3. So sánh mật khẩu người dùng gửi lên với mật khẩu đã mã hóa trong DB
        const isPasswordMatch = await bcrypt.compare(password, user.password_hash);

        // Nếu mật khẩu không khớp
        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác.' });
        }
                // --- CAMERA SỐ 1: Kiểm tra xem JWT_SECRET đã được nạp chưa ---
        console.log('JWT Secret Loaded:', process.env.JWT_SECRET);

        // 4. Mật khẩu khớp! Tạo "vé thông hành" (JWT)
        const payload = {
            userId: user.id,
            username: user.username
        };

                // --- CAMERA SỐ 2: In ra payload để chắc chắn nó đúng ---
        console.log('Creating token with payload:', payload);


        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Token sẽ hết hạn sau 1 ngày
        );

        // 5. Gửi token về cho client
        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token: token
        });

    } catch (error) {
        console.error('Lỗi trong quá trình đăng nhập:', error);
        res.status(500).json({ message: 'Đã có lỗi xảy ra phía server.' });
    }
};


exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;

        const sql = `
            SELECT u.id, u.username, u.email, p.affection_points, p.currency 
            FROM users u
            LEFT JOIN profiles p ON u.id = p.user_id
            WHERE u.id = ?;
        `;

        const [profiles] = await db.query(sql, [userId]);

        // // --- CAMERA SỐ 1: Dữ liệu lấy từ DB trông như thế nào? ---
        // console.log("✅ [BACKEND] Dữ liệu profile lấy từ DB:", profiles);

        if (profiles.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
        }
        
        // // --- CAMERA SỐ 2: Dữ liệu chuẩn bị gửi đi là gì? ---
        // console.log("✅ [BACKEND] Chuẩn bị gửi dữ liệu cho client:", profiles[0]);

        res.status(200).json(profiles[0]);

    } catch (error) {
        console.error('❌ [BACKEND] Lỗi khi lấy thông tin profile:', error);
        res.status(500).json({ message: 'Đã có lỗi xảy ra phía server.' });
    }
};