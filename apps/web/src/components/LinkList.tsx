import { Link } from 'react-router-dom';
import { useLinks } from '../lib/queries';
import { CopyButton } from './CopyButton';

export function LinkList() {
  const { data, isLoading, isError, error } = useLinks();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Carregando links…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Falha ao carregar: {error instanceof Error ? error.message : 'erro desconhecido'}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        Nenhum link ainda. Crie seu primeiro acima.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">URL original</th>
            <th className="px-4 py-3 font-medium">Link curto</th>
            <th className="px-4 py-3 font-medium text-right">Cliques</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.map((link) => (
            <tr key={link.id} className="hover:bg-slate-50">
              <td className="max-w-xs truncate px-4 py-3 text-slate-700" title={link.originalUrl}>
                {link.originalUrl}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-slate-900 hover:underline"
                  >
                    {link.shortUrl}
                  </a>
                  <CopyButton value={link.shortUrl} />
                </div>
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900">
                {link.clicks}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  to={`/links/${link.id}`}
                  className="text-xs font-medium text-slate-900 hover:underline"
                >
                  Detalhes →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
