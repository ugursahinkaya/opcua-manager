/// <reference types="node" />

import { resolve } from "path";
import { transformAssetUrls } from "@quasar/vite-plugin";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
export default defineConfig(({}) => ({
  plugins: [
    cssInjectedByJsPlugin(),
    vue({
      template: {
        transformAssetUrls,
      },
    }),
    dts(),
  ],
  build: {
    minify: true,
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "./src/index.ts"),
      name: "index",
      formats: ["es"],
      fileName: () => "index.js",
    },

    rollupOptions: {
      output: {
        globals: {
          vue: "Vue",
          quasar: "Quasar",
          "@vueuse/shared": "VueUseShared",
          "@ugursahinkaya/secure-socket": "SecureSocket",
        },
      },
      external: [
        "vue",
        "quasar",
        "@vueuse/shared",
        "@ugursahinkaya/secure-socket",
      ],
    },
  },
}));
