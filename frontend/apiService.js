// frontend/apiService.js

const API_BASE_URL = 'http://localhost:4000/api';
/**
 * Gửi yêu cầu đăng ký tới backend.
 */
export async function registerUser(username, email, password) {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Đăng ký thất bại.');
    }
    return data;
}

/**
 * Gửi yêu cầu đăng nhập tới backend.
 */
export async function loginUser(email, password) {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại.');
    }
    return data; // Sẽ chứa token
}

/**
 * Lấy thông tin profile người dùng (yêu cầu có token).
 */
export async function getUserProfile(token) {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'GET',
        headers: {
            // Đây là cách gửi "vé thông hành"
            'Authorization': `Bearer ${token}`,
        },
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Không thể lấy thông tin profile.');
    }
    return data;
}


// === THÊM MỚI: CONVERSATION APIS ===

/**
 * Lấy danh sách tất cả các cuộc hội thoại của người dùng.
 */
export async function listConversations(token) {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

/**
 * Tạo một cuộc hội thoại mới.
 */
export async function createConversation(token) {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

// === THAY ĐỔI: CHAT API ===
/**
 * Gửi một tin nhắn trong một cuộc hội thoại cụ thể.
 */
export async function sendChatMessage(conversationId, message, token, personality, visionContext = null) {
    const response = await fetch(`${API_BASE_URL}/chat/${conversationId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message, personality, visionContext })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}


// === THÊM HÀM MỚI ===
export async function getConversationMessages(conversationId, token) {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}

export async function deleteConversationApi(conversationId, token) {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    return data;
}