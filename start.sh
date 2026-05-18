#!/bin/sh
if [ ! -f /data/notifications.db ]; then
  echo "Initializing database on volume..."
  cp /app/database/notifications.db /data/notifications.db 2>/dev/null || true
fi
exec node backend/server.js
