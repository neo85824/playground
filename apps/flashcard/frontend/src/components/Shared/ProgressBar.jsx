export default function ProgressBar({ current, total, className = '' }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 ${className}`}>
      <div
        className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
