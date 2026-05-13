export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  label: string;
  /** Bar fill count 0–4 */
  filled: number;
};

/**
 * Heuristic strength: length, mixed case, digits, symbols.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: 0, label: '', filled: 0 };
  }

  if (password.length < 6) {
    return { level: 1, label: 'Weak', filled: 1 };
  }

  let criteria = 0;
  if (password.length >= 8) criteria++;
  if (password.length >= 12) criteria++;
  if (/[a-z]/.test(password)) criteria++;
  if (/[A-Z]/.test(password)) criteria++;
  if (/\d/.test(password)) criteria++;
  if (/[^A-Za-z0-9]/.test(password)) criteria++;

  if (criteria <= 3) {
    return { level: 1, label: 'Weak', filled: 1 };
  }
  if (criteria <= 4) {
    return { level: 2, label: 'Fair', filled: 2 };
  }
  if (criteria <= 5) {
    return { level: 3, label: 'Good', filled: 3 };
  }
  return { level: 4, label: 'Strong', filled: 4 };
}
