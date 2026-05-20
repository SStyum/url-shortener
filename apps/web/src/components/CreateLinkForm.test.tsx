import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/queries', () => ({
  useCreateLink: vi.fn(),
}));

import { CreateLinkForm } from './CreateLinkForm';
import { useCreateLink } from '../lib/queries';

const mockUseCreateLink = vi.mocked(useCreateLink);

describe('CreateLinkForm', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('chama mutateAsync com a URL e limpa o input ao suceder', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    mockUseCreateLink.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLink>);

    const user = userEvent.setup();
    render(<CreateLinkForm />);

    const input = screen.getByPlaceholderText(/https:\/\/exemplo/i) as HTMLInputElement;
    await user.type(input, 'https://example.com/x');
    await user.click(screen.getByRole('button', { name: /encurtar/i }));

    expect(mutateAsync).toHaveBeenCalledWith('https://example.com/x');
    await waitFor(() => expect(input.value).toBe(''));
  });

  it('exibe loading no botão enquanto a mutation está pending', () => {
    mockUseCreateLink.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    } as unknown as ReturnType<typeof useCreateLink>);

    render(<CreateLinkForm />);
    expect(screen.getByRole('button')).toHaveTextContent(/encurtando/i);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
