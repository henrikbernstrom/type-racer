import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupForm from './SignupForm';
import { server, useNameAvailability } from '../test/server';

describe('SignupForm', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('requires name and email, validates email format, disables submit if invalid', async () => {
    render(<SignupForm onSuccess={vi.fn()} />);

    const name = screen.getByLabelText(/name/i);
    const email = screen.getByLabelText(/email/i);
    const submit = screen.getByRole('button', { name: /start race/i });

    expect(submit.getAttribute('disabled') !== null).toBe(true);

    await userEvent.type(name, 'A');
    await userEvent.type(email, 'not-an-email');

    expect(await screen.findByText(/invalid email/i)).toBeTruthy();
    expect(submit.getAttribute('disabled') !== null).toBe(true);

    await userEvent.clear(email);
    await userEvent.type(email, 'alice@example.com');

    expect(screen.queryByText(/invalid email/i)).toBeNull();
  });

  test('debounced uniqueness check disables submit when name is taken', async () => {
    useNameAvailability(false);
    render(<SignupForm onSuccess={vi.fn()} />);

    const name = screen.getByLabelText(/name/i);
    const email = screen.getByLabelText(/email/i);
    const submit = screen.getByRole('button', { name: /start race/i });

    await userEvent.type(name, 'TakenName');
    await userEvent.type(email, 'user@example.com');

    // wait for debounce + request
    await new Promise((r) => setTimeout(r, 400));

    expect(await screen.findByText(/name is already taken/i)).toBeTruthy();
    expect(submit.getAttribute('disabled') !== null).toBe(true);
  });
});
