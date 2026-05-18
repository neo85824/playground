const cron = require('node-cron');
const db = require('./db');
const { send } = require('./discord');

function start() {
  cron.schedule('* * * * *', async () => {
    const due = db.prepare(`
      SELECT * FROM notifications
      WHERE status = 'pending'
      AND datetime(next_fire_at) <= datetime('now')
    `).all();

    for (const n of due) {
      try {
        await send(n.title, n.message);
        console.log(`[Scheduler] Sent: "${n.message}" (id=${n.id})`);

        if (n.repeat_interval_min) {
          db.prepare(`
            UPDATE notifications
            SET last_sent_at = datetime('now'),
                next_fire_at = datetime('now', '+' || ? || ' minutes')
            WHERE id = ?
          `).run(n.repeat_interval_min, n.id);
        } else {
          db.prepare(`
            UPDATE notifications
            SET status = 'sent', last_sent_at = datetime('now')
            WHERE id = ?
          `).run(n.id);
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to send id=${n.id}:`, err.message);
      }
    }
  });

  console.log('[Scheduler] Started (runs every minute)');
}

module.exports = { start };
