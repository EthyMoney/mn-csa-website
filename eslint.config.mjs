import { defineConfig } from "eslint/config";
import globals from "globals";
import js from "@eslint/js";

export default defineConfig([
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },

      ecmaVersion: "latest",
      sourceType: "commonjs",
    },

    rules: {
      indent: ["warn", 2, {
        SwitchCase: 1,
      }],

      "linebreak-style": ["warn", "windows"],
      quotes: ["warn", "single"],
      semi: ["error", "always"],
    },
  },
]);
