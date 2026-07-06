FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build notifications frontend
COPY apps/notifications/frontend/package*.json ./apps/notifications/frontend/
RUN cd apps/notifications/frontend && npm ci

COPY apps/notifications/frontend/ ./apps/notifications/frontend/
RUN cd apps/notifications/frontend && npm run build

# Build flashcard frontend
COPY apps/flashcard/frontend/package*.json ./apps/flashcard/frontend/
RUN cd apps/flashcard/frontend && npm ci

COPY apps/flashcard/frontend/ ./apps/flashcard/frontend/
RUN cd apps/flashcard/frontend && npm run build

# Install backend deps (better-sqlite3 needs native compile)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend, portal, seed DBs, and startup script
COPY server/ ./server/
COPY apps/notifications/backend/ ./apps/notifications/backend/
COPY apps/flashcard/backend/ ./apps/flashcard/backend/
COPY apps/playground/public/ ./apps/playground/public/
COPY database/flashcards.db ./database/flashcards.db
COPY start.sh ./start.sh
RUN chmod +x start.sh

RUN mkdir -p /data apps/flashcard/backend/uploads

EXPOSE 3002

CMD ["./start.sh"]
