module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "rxjs"],
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: "module",
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
};
