import { useEffect, useState } from 'react';

type Health = { status: string; service: string; timestamp: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/`)
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1>URL Shortener</h1>
      <p>Scaffold do monorepo funcionando. API health check:</p>
      <pre
        style={{
          background: '#111',
          color: '#0f0',
          padding: 16,
          borderRadius: 8,
          overflowX: 'auto',
        }}
      >
        {error ? `Erro: ${error}` : health ? JSON.stringify(health, null, 2) : 'Carregando…'}
      </pre>
    </main>
  );
}
