module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: [`${__dirname}/tsconfig.json`, `${__dirname}/tsconfig.dev.json`],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
    "/generated/**/*", // Ignore generated files.
  ],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "indent": ["warn", 2],
    "quotes": 0,
    "semi": ["error", "always"],
    "object-curly-spacing": ["error", "always"],
    "operator-linebreak": [
      "error",
      "after",
      { overrides: { "?": "ignore", ":": "ignore" } },
    ],
    "comma-dangle": ["error", "always-multiline"],
    "import/no-unresolved": 0,
    "valid-jsdoc": "off",
    "require-jsdoc": "off",
  },
};
