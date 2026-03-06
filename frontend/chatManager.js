// frontend/chatManager.js

import { listConversations, createConversation, getConversationMessages, deleteConversationApi} from './apiService.js';
import { getToken } from './auth.js';

// 1. Khởi tạo State và đọc từ LocalStorage
let state = {
    conversations: [],
    activeChatId: localStorage.getItem('activeChatId') ? parseInt(localStorage.getItem('activeChatId')) : null
};

// 2. Hàm cập nhật ID (Hàm bạn đang thiếu)
export function setActiveChatId(id) {
    state.activeChatId = id;
    if (id) {
        localStorage.setItem('activeChatId', id);
    } else {
        localStorage.removeItem('activeChatId');
    }
}

export function getActiveChatId() {
    return state.activeChatId;
}

// 3. Hàm render tin nhắn
function renderMessageHistory(messages) {
    const listElement = document.getElementById('message-list');
    const panel = document.getElementById('message-history-panel');
    if (!listElement || !panel) return;

    // Logic: Nếu không có tin nhắn (mới tạo) -> Không làm gì cả để giữ nguyên tin nhắn User vừa gửi
    if (messages.length === 0) {
        panel.classList.remove('hidden'); // Đảm bảo panel hiện
        return; 
    }

    // Nếu có tin nhắn cũ từ DB -> Xóa trắng và vẽ lại
    listElement.innerHTML = '';
    panel.classList.remove('hidden');

    messages.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${msg.role}`;
        
        const roleEl = document.createElement('div');
        roleEl.className = 'role';
        roleEl.textContent = msg.role === 'user' ? 'Bạn' : 'Rin';

        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        contentEl.textContent = msg.content;
        
        bubble.appendChild(roleEl);
        bubble.appendChild(contentEl);
        listElement.appendChild(bubble);
    });
    
    listElement.scrollTop = listElement.scrollHeight;
}

// 4. Render danh sách hội thoại bên trái
export function renderConversationsList() {
    const listElement = document.getElementById('conversations-list');
    if (!listElement) return;
    listElement.innerHTML = '';

    state.conversations.forEach(convo => {
        const item = document.createElement('div');
        item.className = 'conversation-item';
        if (convo.id === state.activeChatId) item.classList.add('active');

        const titleSpan = document.createElement('span');
        titleSpan.className = 'convo-title';
        titleSpan.textContent = convo.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '🗑️';

        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); 
            if (confirm(`Xóa hội thoại này chứ?`)) await handleDeleteConversation(convo.id);
        });

        // Khi click vào hội thoại cũ -> Xóa màn hình để load lại
        item.addEventListener('click', () => setActiveConversation(convo.id, true));
        
        item.appendChild(titleSpan);
        item.appendChild(deleteBtn);
        listElement.appendChild(item);
    });
}

export function updateConversationTitleLocally(id, newTitle) {
    const convo = state.conversations.find(c => c.id === id);
    if (convo) {
        convo.title = newTitle;
        renderConversationsList();
    }
}

async function handleDeleteConversation(chatId) {
    const token = getToken();
    try {
        await deleteConversationApi(chatId, token);
        state.conversations = state.conversations.filter(c => c.id !== chatId);
        
        if (state.activeChatId === chatId) {
            setActiveChatId(null);
            document.getElementById('message-history-panel').classList.add('hidden');
        }
        renderConversationsList();
    } catch (error) {
        console.error("Lỗi khi xóa:", error);
    }
}

/**
 * Đặt hội thoại Active
 * @param {number} chatId 
 * @param {boolean} shouldClear - Mặc định TRUE (xóa màn hình). Khi tạo mới thì truyền FALSE.
 */
export async function setActiveConversation(chatId, shouldClear = true) {
    setActiveChatId(chatId); // Gọi hàm đã định nghĩa ở trên
    renderConversationsList();
    
    const listElement = document.getElementById('message-list');
    
    // CHỈ XÓA NẾU ĐƯỢC PHÉP
    if (shouldClear && listElement) {
        listElement.innerHTML = ''; 
    }

    const token = getToken();
    if (!token || !chatId) return;

    try {
        const messages = await getConversationMessages(chatId, token);
        // Chỉ render lại nếu có tin nhắn cũ
        if (messages.length > 0) {
            renderMessageHistory(messages);
        }
    } catch (error) {
        console.error("Lỗi tải tin nhắn:", error);
    }
}

export async function initializeConversations() {
    const token = getToken();
    if (!token) return;

    try {
        const conversations = await listConversations(token);
        state.conversations = conversations;
        renderConversationsList();

        if (state.activeChatId) {
            const exists = conversations.some(c => c.id === state.activeChatId);
            if (exists) setActiveConversation(state.activeChatId, true);
        }
    } catch (error) {
        console.error("Lỗi khởi tạo:", error);
    }
}

export async function startNewConversation() {
    const token = getToken();
    if (!token) return null;

    try {
        const newConvo = await createConversation(token);
        state.conversations.unshift(newConvo);
        
        // QUAN TRỌNG: shouldClear = false để giữ tin nhắn User vừa gửi
        await setActiveConversation(newConvo.id, false);
        
        return newConvo.id;
    } catch (error) {
        console.error("Lỗi tạo mới:", error);
        return null;
    }
}

// Hàm này dùng cho Optimistic UI
export function appendMessageToUI(role, text) {
    const listElement = document.getElementById('message-list');
    const panel = document.getElementById('message-history-panel');
    
    if (!listElement || !panel) return;

    panel.classList.remove('hidden');

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role}`;
    
    const roleEl = document.createElement('div');
    roleEl.className = 'role';
    roleEl.textContent = role === 'user' ? 'Bạn' : 'Rin';

    const contentEl = document.createElement('div');
    contentEl.className = 'content';
    contentEl.textContent = text;
    
    bubble.appendChild(roleEl);
    bubble.appendChild(contentEl);
    listElement.appendChild(bubble);
    listElement.scrollTop = listElement.scrollHeight;
}

export function setupConversationControls() {
    const newChatBtn = document.getElementById('new-chat-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const historyPanel = document.getElementById('message-history-panel');

    // Nút tạo mới ở Sidebar (Click tay thì vẫn xóa màn hình)
    if (newChatBtn) {
        newChatBtn.addEventListener('click', async () => {
            const id = await startNewConversation();
            // Nếu click tay vào nút "+", ta muốn màn hình sạch sẽ
            const listElement = document.getElementById('message-list');
            if (listElement) listElement.innerHTML = '';
        });
    }

    if (closeHistoryBtn && historyPanel) {
        closeHistoryBtn.addEventListener('click', () => {
            historyPanel.classList.add('hidden'); 
        });
    }

    if (getToken()) {
        initializeConversations();
    }
}