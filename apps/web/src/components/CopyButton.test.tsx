import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  it('renderiza o label "Copiar" por padrão', () => {
    render(<CopyButton value="hello" />);
    expect(screen.getByRole('button')).toHaveTextContent('Copiar');
  });

  it('aceita label customizado', () => {
    render(<CopyButton value="hello" label="Copy URL" />);
    expect(screen.getByRole('button')).toHaveTextContent('Copy URL');
  });

  it('copia para o clipboard e mostra feedback ao clicar', async () => {
    const user = userEvent.setup();
    render(<CopyButton value="https://example.com" />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toHaveTextContent('Copiado!'));
    const written = await navigator.clipboard.readText();
    expect(written).toBe('https://example.com');
  });
});
