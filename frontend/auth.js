// frontend/auth.js (Phiên bản cuối cùng, đã sửa lỗi export)

import { registerUser, loginUser, getUserProfile } from './apiService.js';

// === HÀM 1: LẤY TOKEN (ĐÃ EXPORT) ===
/**
 * Lấy token của người dùng từ localStorage.
 * @returns {string|null} - Token hoặc null nếu không có.
 */
export function getToken() {
    return localStorage.getItem('token');
}

// === HÀM 2: CẬP NHẬT GIAO DIỆN (ĐÃ EXPORT) ===
/**
 * Cập nhật các thông số hiển thị trên UI (điểm, tiền tệ).
 * @param {object} profileData - Object chứa affection_points và currency.
 */
export function updateProfileDisplay(profileData) {
    const affectionPointsDisplay = document.getElementById('affection-points-display');
    const currencyDisplay = document.getElementById('currency-display');
    
    if (profileData && affectionPointsDisplay && currencyDisplay) {
        affectionPointsDisplay.textContent = profileData.affection_points;
        currencyDisplay.textContent = profileData.currency;
    }
}

/**
 * Hàm chính, cập nhật toàn bộ giao diện dựa trên trạng thái đăng nhập.
 */
async function updateUI() {
    const token = getToken();
    
    const userInfoPanel = document.getElementById('user-info-panel');
    const welcomeMessage = document.getElementById('welcome-message');
    const userBtn = document.getElementById('user-btn');

    if (token) {
        try {
            const profileData = await getUserProfile(token);
            
            userInfoPanel.style.display = 'block';
            userBtn.innerHTML = '👤';
            welcomeMessage.textContent = `Chào, ${profileData.username}`;
            
            // Sử dụng hàm đã export để cập nhật UI
            updateProfileDisplay(profileData);
            
        } catch (error) {
            console.error("Token không hợp lệ, đang đăng xuất:", error);
            logout();
        }
    } else {
        userInfoPanel.style.display = 'none';
        userBtn.innerHTML = '🔑';
    }
}

/**
 * Hàm xử lý đăng xuất.
 */
function logout() {
    localStorage.removeItem('token');
    // Tải lại trang để reset toàn bộ trạng thái ứng dụng
    location.reload();
}

/**
 * Hàm thiết lập các sự kiện cho form.
 */
function setupAuthEvents() {
    // ... (toàn bộ code trong hàm này giữ nguyên như cũ) ...
    const userBtn = document.getElementById('user-btn');
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authMessage = document.getElementById('auth-message');
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    userBtn.addEventListener('click', () => {
        if (!getToken()) {
            authModal.classList.remove('hidden');
        } else {
            document.getElementById('interaction-panel-btn').click();
        }
    });
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.classList.add('hidden');
        }
    });
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });
    registerBtn.addEventListener('click', async () => {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        try {
            const data = await registerUser(username, email, password);
            authMessage.style.color = 'green';
            authMessage.textContent = data.message + " Vui lòng đăng nhập.";
            showLoginLink.click();
        } catch (error) {
            authMessage.style.color = 'red';
            authMessage.textContent = error.message;
        }
    });
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        try {
            const data = await loginUser(email, password);
            localStorage.setItem('token', data.token);
            location.reload();
        } catch (error) {
            authMessage.style.color = 'red';
            authMessage.textContent = error.message;
        }
    });
    logoutBtn.addEventListener('click', logout);
}

// Chạy khi DOM đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    setupAuthEvents();
    updateUI();
});