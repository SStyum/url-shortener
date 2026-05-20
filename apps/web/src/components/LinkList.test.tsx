import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../lib/queries', () => ({
  useLinks: vi.fn(),
}));

import { LinkList } from './LinkList';
import { useLinks } from '../lib/queries';

const mockUseLinks = vi.mocked(useLinks);

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('LinkList', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('mostra estado de loading', () => {
    mockUseLinks.mockReturnValue({ isLoading: true } as ReturnType<typeof useLinks>);
    renderWithRouter(<LinkList />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('mostra estado de erro', () => {
    mockUseLinks.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('Falhou feio'),
    } as ReturnType<typeof useLinks>);
    renderWithRouter(<LinkList />);
    expect(screen.getByText(/falhou feio/i)).toBeInTheDocument();
  });

  it('mostra estado vazio quando lista vem sem links', () => {
    mockUseLinks.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [],
    } as ReturnType<typeof useLinks>);
    renderWithRouter(<LinkList />);
    expect(screen.getByText(/nenhum link ainda/i)).toBeInTheDocument();
  });

  it('renderiza cada link com originalUrl, shortUrl e contador', () => {
    mockUseLinks.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          id: 'id-1',
          originalUrl: 'https://example.com/foo',
          shortCode: 'abc12345',
          shortUrl: 'http://localhost:3000/abc12345',
          clicks: 7,
          createdAt: '2026-05-20T12:00:00.000Z',
        },
      ],
    } as ReturnType<typeof useLinks>);

    renderWithRouter(<LinkList />);

    expect(screen.getByText('https://example.com/foo')).toBeInTheDocument();
    expect(screen.getByText('http://localhost:3000/abc12345')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /detalhes/i })).toHaveAttribute('href', '/links/id-1');
  });
});
