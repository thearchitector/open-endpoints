import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import kontra from "rollup-plugin-kontra";
import babel from "@rollup/plugin-babel";
import terser from "@rollup/plugin-terser";
import lightningcss from "rollup-plugin-lightningcss";

export default {
  input: "src/polypong.js",
  output: {
    file: "static/polypong.js",
    format: "umd",
    name: "polypong",
    sourcemap: false, // broken by kontra reduction
  },
  plugins: [
    resolve(),
    commonjs(),
    kontra({
      gameObject: {
        velocity: true,
        anchor: true,
      },
      text: {
        align: true,
      },
    }),
    babel({ babelHelpers: "bundled" }),
    terser({
      ecma: 2015,
      module: true,
      compress: {
        arrows: true,
        hoist_funs: true,
        keep_fargs: false,
        passes: 2,
        unsafe: true,
        // breaks peerjs
        // unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_Function: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
      },
    }),
    lightningcss({
      files: ["src/polypong.css"],
      options: {
        sourceMap: true,
      },
    }),
  ],
};
