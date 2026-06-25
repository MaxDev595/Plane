import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const { register } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="flex h-screen w-full items-center justify-center bg-plane-bg">
      <div className="w-full max-w-sm p-8">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-plane-accent">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-plane-text">Create account</h1>
            <p className="mt-1 text-sm text-plane-muted">Join Plane today</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-sm text-plane-muted">Display Name</label>
            <input
              type="text"
              value={form.displayName}
              onChange={set('displayName')}
              required
              className="w-full rounded-lg border border-plane-border bg-plane-surface px-3 py-2.5 text-sm text-plane-text placeholder-plane-muted/50 outline-none transition focus:border-plane-accent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-plane-muted">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={set('username')}
              required
              pattern="[a-zA-Z0-9_]{3,32}"
              className="w-full rounded-lg border border-plane-border bg-plane-surface px-3 py-2.5 text-sm text-plane-text placeholder-plane-muted/50 outline-none transition focus:border-plane-accent"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-plane-muted">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              className="w-full rounded-lg border border-plane-border bg-plane-surface px-3 py-2.5 text-sm text-plane-text placeholder-plane-muted/50 outline-none transition focus:border-plane-accent"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-plane-muted">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              className="w-full rounded-lg border border-plane-border bg-plane-surface px-3 py-2.5 text-sm text-plane-text placeholder-plane-muted/50 outline-none transition focus:border-plane-accent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-plane-accent py-2.5 text-sm font-medium text-white transition hover:bg-plane-accent-hover disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-plane-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-plane-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
