import { useState, useEffect } from 'react';

const PRIORITY_OPTIONS = [
  { value: 0, label: 'Normal', desc: 'Respects quiet hours' },
  { value: 1, label: 'High', desc: 'Bypasses quiet hours' },
  { value: 2, label: 'Emergency', desc: 'Repeats until acknowledged' },
];

const REPEAT_PRESETS = [
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h', value: 60 },
  { label: '2h', value: 120 },
  { label: 'Daily', value: 1440 },
];

const TZ = 'Asia/Taipei';

function toLocalDatetimeValue(isoOrDatetime) {
  if (!isoOrDatetime) return '';
  const d = new Date(isoOrDatetime);
  if (isNaN(d)) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (type) => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export default function NotificationForm({ initial, onSubmit, onClose }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [message, setMessage] = useState(initial?.message || '');
  const [scheduledAt, setScheduledAt] = useState(
    toLocalDatetimeValue(initial?.scheduled_at) || toLocalDatetimeValue(new Date(Date.now() + 60000))
  );
  const [repeat, setRepeat] = useState(!!initial?.repeat_interval_min);
  const [repeatMin, setRepeatMin] = useState(initial?.repeat_interval_min || 60);
  const [priority, setPriority] = useState(initial?.priority ?? 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return setError('Message is required');
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        title: title.trim() || null,
        message: message.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        repeat_interval_min: repeat ? repeatMin : null,
        priority,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Edit Notification' : 'New Notification'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Meeting reminder"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message <span className="text-red-500">*</span></label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What should the notification say?"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setRepeat(v => !v)}
                className={`relative shrink-0 w-10 h-5 rounded-full overflow-hidden transition-colors ${repeat ? 'bg-blue-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${repeat ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm font-medium text-gray-700">Repeat</span>
            </div>
            {repeat && (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  {REPEAT_PRESETS.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setRepeatMin(p.value)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${repeatMin === p.value ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={repeatMin}
                    onChange={e => setRepeatMin(Number(e.target.value))}
                    className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-500">minutes</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriority(opt.value)}
                  title={opt.desc}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    priority === opt.value
                      ? opt.value === 2 ? 'bg-red-500 text-white border-red-500'
                        : opt.value === 1 ? 'bg-orange-400 text-white border-orange-400'
                        : 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{PRIORITY_OPTIONS.find(o => o.value === priority)?.desc}</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : initial ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
