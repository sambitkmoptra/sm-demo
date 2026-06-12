'use client';

import React, { useState } from 'react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Hardcoded credentials for demo protection
    const DEMO_USER = 'admin';
    const DEMO_PASS = 'acme-pwds-112';

    if (username.trim() === DEMO_USER && password === DEMO_PASS) {
      localStorage.setItem('acme_agent_auth', 'true');
      onLoginSuccess();
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 selection:bg-emerald-500/20 selection:text-emerald-400 font-sans">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-8">
        {/* Top glow border decoration */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner text-xl mb-2">
            🔐
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Omni-Agent Engine</h2>
          <p className="text-xs text-zinc-400">
            Authorization required to access the campaign synthesis console.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2.5 items-center animate-shake">
            <span className="text-red-400 text-xs font-bold font-mono">!</span>
            <p className="text-xs text-red-300 font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Enter username"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-xs tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-zinc-100 transition-all shadow-lg hover:shadow-emerald-500/15 cursor-pointer mt-2"
          >
            Authenticate & Proceed
          </button>
        </form>
      </div>
    </div>
  );
}
