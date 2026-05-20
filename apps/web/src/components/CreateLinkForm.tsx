import { useState, type FormEvent } from 'react';
import axios from 'axios';
import { useCreateLink } from '../lib/queries';

export function CreateLinkForm() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createLink = useCreateLink();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createLink.mutateAsync(url);
      setUrl('');
    } catch (err) {
      setError(extractError(err) ?? 'Não foi possível encurtar a URL');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-base font-medium text-slate-900">Encurtar URL</h2>
      <p className="mt-1 text-sm text-slate-500">
        Cole uma URL completa (com http/https) e gere um link curto.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          required
          placeholder="https://exemplo.com/um-link-bem-longo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={createLink.isPending}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {createLink.isPending ? 'Encurtando…' : 'Encurtar'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}

function extractError(err: unknown): string | null {
  if (!axios.isAxiosError(err)) return null;
  const data = err.response?.data;
  if (!data || typeof data !== 'object') return null;
  const msg = (data as { message?: unknown }).message;
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) return msg.join(', ');
  return null;
}
