const { ChromaClient } = require('chromadb');

// Đã sửa lại cách cấu hình kết nối để hết cảnh báo "path is deprecated"
const client = new ChromaClient({ host: "localhost", port: 8000 }); 

// Tạo một hàm nhúng "giả" để đánh lừa ChromaDB. 
// Việc này nói với Chroma rằng: "Đừng dùng model mặc định nữa, tao đã có Gemini lo phần Vector rồi!"
const dummyEmbeddingFunction = {
    generate: (texts) => { return texts.map(() => []) }
};

const vectorService = {
    async addMessageToVector(userId, messageId, content, embedding) {
        try {
            const collection = await client.getOrCreateCollection({ 
                name: `user_${userId}_memory`,
                embeddingFunction: dummyEmbeddingFunction // <--- Khóa mõm cảnh báo ở đây
            });
            await collection.add({
                ids: [messageId.toString()],
                embeddings: [embedding],
                metadatas: [{ content: content, role: 'user' }], 
            });
            console.log(`[Vector DB] Đã lưu ký ức cho user ${userId}`);
        } catch (error) {
            console.error("[Vector DB] Lỗi lưu ký ức:", error);
        }
    },

    async searchRelatedMessages(userId, queryEmbedding, limit = 5) {
        try {
            const collection = await client.getOrCreateCollection({ 
                name: `user_${userId}_memory`,
                embeddingFunction: dummyEmbeddingFunction // <--- Khóa mõm cảnh báo ở đây
            });
            const results = await collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: limit
            });
            
            if (results.metadatas && results.metadatas[0].length > 0) {
                return results.metadatas[0].map(m => m.content);
            }
            return [];
        } catch (error) {
            console.log("[Vector DB] Chưa có ký ức hoặc lỗi (bỏ qua).");
            return [];
        }
    },

    async deleteUserMemory(userId) {
        try {
            await client.deleteCollection({ name: `user_${userId}_memory` });
        } catch (error) {
            // Bỏ qua
        }
    }
};

module.exports = vectorService;