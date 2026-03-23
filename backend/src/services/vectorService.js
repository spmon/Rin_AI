const { ChromaClient } = require('chromadb');

const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
const parsedUrl = new URL(chromaUrl);

// 2. Tách URL ra để chiều lòng phiên bản mới của ChromaDB
const client = new ChromaClient({
    host: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 8000),
    ssl: parsedUrl.protocol === 'https:'
});

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