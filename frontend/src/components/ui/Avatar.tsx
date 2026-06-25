interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away';
  className?: string;
}

const sizes = {
  xs: 'h-7 w-7 text-xs',
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

const statusColors = {
  online: 'bg-green-400',
  offline: 'bg-plane-muted',
  away: 'bg-yellow-400',
};

function getColor(name: string) {
  const colors = ['#4f8ef7', '#7c65f6', '#e879f9', '#f97316', '#22c55e', '#06b6d4'];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 'md', status, className = '' }: AvatarProps) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
  const color = getColor(name);

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`${sizes[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white`}
        style={!src ? { background: color } : {}}>
        {src ? (
          <img src={src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {status && (
        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-plane-sidebar ${statusColors[status]}`} />
      )}
    </div>
  );
}
