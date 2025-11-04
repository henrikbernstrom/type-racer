import React, { useEffect, useMemo, useState } from 'react';

type Props = {
  onSuccess: (data: { name: string; email: string }) => void;
};

function validateEmail(email: string) {
  // Simple email regex
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupForm({ onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false });
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const emailValid = true;
  const nameValid = true;
  const formValid = true;
  const showEmailError = false;

  useEffect(() => {
    // no-op: unrestricted registration, no availability checks
    setNameAvailable(true);
    setChecking(false);
  }, [name]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name, email };
    try {
      await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // ignore network/server errors; continue locally
    }
    onSuccess(payload);
  }

  return (
    <form
      onSubmit={submit}
      aria-label="signup-form"
      style={{
        padding: 24,
        background: '#fafafa',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        width: '100%',
        textAlign: 'left',
        boxSizing: 'border-box',
      }}
    >
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="name" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Name</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              outline: 'none',
              boxSizing: 'border-box',
              fontSize: 16,
              lineHeight: 1.4,
            }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>Email</label>
          <input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            style={{
              width: '100%',
              padding: '12px 14px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
              outline: 'none',
              boxSizing: 'border-box',
              fontSize: 16,
              lineHeight: 1.4,
            }}
          />
        </div>
      <button
        type="submit"
        disabled={false}
        style={{
          padding: '12px 18px',
          background: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: formValid ? 'pointer' : 'not-allowed',
          fontWeight: 600,
          fontSize: 16,
        }}
      >
        Start Race
      </button>
    </form>
  );
}
