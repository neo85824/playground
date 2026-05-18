FROM node:20-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install backend deps (better-sqlite3 needs native compile)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend and startup script
COPY backend/ ./backend/
COPY database/ ./database/
COPY start.sh ./start.sh
RUN chmod +x start.sh

RUN mkdir -p /data

EXPOSE 3002

CMD ["./start.sh"]
