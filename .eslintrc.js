module.exports = {
  root: true,
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  extends: [
    'eslint:recommended'
  ],
  rules: {
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    semi: ['warn', 'always'],
    'no-unused-vars': ['error', { args: 'none' }],
    eqeqeq: 'error',
    'no-alert': 'error',
    'no-eval': 'error',
    'space-before-function-paren': 'off',
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    parser: '@typescript-eslint/parser',
  },
  globals: {
    __dirname: false,
    process: false,
  },
};
