import { useAuth } from '../context/AuthContext';
import { CreateLinkForm } from '../components/CreateLinkForm';
import { LinkList } from '../components/LinkList';

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">URL Shortener</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <CreateLinkForm />
        <LinkList />
      </main>
    </div>
  );
}
