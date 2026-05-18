import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  createNotification,
  updateNotification,
  cancelNotification,
  fireNotification,
} from '../api/client';
import NotificationForm from '../components/NotificationForm';

const STATUS_BADGE = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PRIORITY_LABEL = { 0: 'Normal', 1: 'High', 2: 'Emergency' };
const PRIORITY_COLOR = {
  0: 'text-gray-500',
  1: 'text-orange-500 font-medium',
  2: 'text-red-500 font-semibold',
};

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Taipei',
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatRepeat(min) {
  if (!min) return 'Once';
  if (min < 60) return `Every ${min}m`;
  if (min === 1440) return 'Daily';
  return `Every ${min / 60}h`;
}

export default function Home() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [firing, setFiring] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(data) {
    await createNotification(data);
    load();
  }

  async function handleEdit(data) {
    await updateNotification(editing.id, data);
    setEditing(null);
    load();
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this notification?')) return;
    await cancelNotification(id);
    load();
  }

  async function handleFire(id) {
    setFiring(id);
    try {
      await fireNotification(id);
    } catch (e) {
      alert('Failed to send: ' + (e.response?.data?.error || e.message));
    } finally {
      setFiring(null);
      load();
    }
  }

  const pending = notifications.filter(n => n.status === 'pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="text-sm text-gray-500 mt-0.5">Scheduled pushes to Discord</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
          >
            + New Notification
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No notifications yet</p>
            <p className="text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {pending.map(n => (
              <NotificationRow
                key={n.id}
                n={n}
                firing={firing === n.id}
                onEdit={() => setEditing(n)}
                onCancel={() => handleCancel(n.id)}
                onFire={() => handleFire(n.id)}
              />
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <NotificationForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />
      )}
      {editing && (
        <NotificationForm initial={editing} onSubmit={handleEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

function NotificationRow({ n, firing, onEdit, onCancel, onFire }) {
  return (
    <div className="flex items-start gap-4 px-5 py-4">
      <div className="flex-1 min-w-0">
        {n.title && <p className="text-xs font-medium text-gray-400 mb-0.5">{n.title}</p>}
        <p className="text-sm font-medium text-gray-900 truncate">{n.message}</p>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <span className="text-xs text-gray-500">{formatDate(n.next_fire_at)}</span>
          <span className="text-xs text-gray-400">{formatRepeat(n.repeat_interval_min)}</span>
          <span className={`text-xs ${PRIORITY_COLOR[n.priority]}`}>{PRIORITY_LABEL[n.priority]}</span>
          {n.last_sent_at && (
            <span className="text-xs text-gray-400">Last sent {formatDate(n.last_sent_at)}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[n.status]}`}>
          {n.status}
        </span>
        <button
          onClick={onFire}
          disabled={firing}
          title="Send now"
          className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {firing ? '...' : 'Send now'}
        </button>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            Edit
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs px-2.5 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
