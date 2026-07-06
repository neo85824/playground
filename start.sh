#!/bin/sh
mkdir -p /data
# On first run, seed the volume with the bundled flashcard database
if [ ! -f /data/flashcards.db ]; then
  echo "Seeding flashcards database from bundle..."
  cp /app/database/flashcards.db /data/flashcards.db
fi
exec node backend/server.js
