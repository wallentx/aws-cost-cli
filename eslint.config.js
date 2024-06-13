import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      'jest.config.cjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
);
