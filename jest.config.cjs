var esmModules = [
  'chalk',
  'ora',
  'cli-cursor',
  'restore-cursor',
  'log-symbols',
  'is-unicode-supported',
  'strip-ansi',
  'ansi-regex',
  'is-interactive',
  'stdin-discarder',
  'aws-sdk-client-mock',
  'node-fetch',
  'data-uri-to-buffer',
  'fetch-blob',
  'formdata-polyfill',
];

module.exports = {
  preset: 'ts-jest/presets/js-with-babel',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    `node_modules/(?!(?:.pnpm/)?(${esmModules.join('|')}))`,
  ],
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
};
