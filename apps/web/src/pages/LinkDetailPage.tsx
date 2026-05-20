import { Link, useParams } from 'react-router-dom';
import { useLink, useLinkStats } from '../lib/queries';
import { CopyButton } from '../components/CopyButton';
import { StatsChart } from '../components/StatsChart';

export function LinkDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const linkQuery = useLink(id);
  const statsQuery = useLinkStats(id);

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-sm text-slate-600 hover:underline">
            ← Voltar
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Detalhes do link</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        {linkQuery.isLoading && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
            Carregando…
          </div>
        )}

        {linkQuery.isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {linkQuery.error instanceof Error ? linkQuery.error.message : 'Link não encontrado'}
          </div>
        )}

        {linkQuery.data && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">URL original</p>
              <a
                href={linkQuery.data.originalUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-sm text-slate-900 hover:underline"
              >
                {linkQuery.data.originalUrl}
              </a>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Link curto</p>
              <div className="flex items-center gap-2">
                <a
                  href={linkQuery.data.shortUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm text-slate-900 hover:underline"
                >
                  {linkQuery.data.shortUrl}
                </a>
                <CopyButton value={linkQuery.data.shortUrl} />
              </div>
            </div>
            <div className="flex gap-6 pt-2">
              <Metric label="Cliques (total)" value={String(linkQuery.data.clicks)} />
              <Metric
                label="Criado em"
                value={new Date(linkQuery.data.createdAt).toLocaleString('pt-BR')}
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-base font-medium text-slate-900">Cliques nos últimos 7 dias</h2>
            {statsQuery.data && (
              <span className="text-sm text-slate-500">
                {statsQuery.data.total} {statsQuery.data.total === 1 ? 'clique' : 'cliques'} na janela
              </span>
            )}
          </div>

          {statsQuery.isLoading && <p className="text-sm text-slate-500">Carregando gráfico…</p>}
          {statsQuery.isError && (
            <p className="text-sm text-red-600">
              {statsQuery.error instanceof Error ? statsQuery.error.message : 'Falha ao carregar'}
            </p>
          )}
          {statsQuery.data && <StatsChart days={statsQuery.data.days} />}
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
