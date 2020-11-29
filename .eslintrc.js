// "off": 0 // 关闭规则
// "warn": 1 // 警告
// "error": 2 // 报错
const OFF = 0;
const WARNNING = 2;
const ERROR = 2;

module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
    "prettier/@typescript-eslint"
  ],
  plugins: [
    "@typescript-eslint",
    "prettier"
  ],
  root: true,
  rules: {
    '@typescript-eslint/no-unused-vars': ERROR,
    "@typescript-eslint/no-explicit-any": OFF,
    "@typescript-eslint/explicit-function-return-type": OFF,
    "@typescript-eslint/no-empty-function": OFF,
    // "@typescript-eslint/no-non-null-assertion": "off",
    // "@typescript-eslint/explicit-member-accessibility": "off",
    // "@typescript-eslint/no-use-before-define": "off",
    // "@typescript-eslint/no-object-literal-type-assertion": "off",
    // "@typescript-eslint/no-parameter-properties": "off"
    "no-empty": [ERROR, { "allowEmptyCatch": true }],
    'prettier/prettier': [
      ERROR,
      {
        'jsxBracketSameLine': true,
        'singleQuote': true,
        'trailingComma': 'all',
        'printWidth': 100,
        'proseWrap': 'never',
        "arrowParens": "always",
      }
    ],
  },
  env: {
    browser: true,
    node: true,
    es6: true
  },
};
