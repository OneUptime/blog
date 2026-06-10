# Validation Summary: How to Implement Source Maps

## Status
validated

## Post Type
Guide / Tutorial — implementation guide for generating, hosting, and securing JavaScript/CSS source maps in production builds.

## Technologies Covered
- Source Map V3 specification (Base64 VLQ encoding, mappings format)
- Webpack (devtool options, `SourceMapDevToolPlugin`, `terser-webpack-plugin`, `source-map-loader`)
- Vite / Rollup (`build.sourcemap`, `rollupOptions.output.sourcemapFileNames`, `sourcemapExcludeSources`)
- esbuild (`sourcemap`, `sourcesContent`)
- TypeScript compiler (`sourceMap`, `inlineSources`, `declarationMap`)
- Sass / Dart Sass JS API (`sass.compile` with `sourceMap` / `sourceMapIncludeSources`)
- PostCSS (`map.inline`, `map.annotation`, `map.sourcesContent`)
- Node.js `--enable-source-maps` flag and the `source-map-support` package
- Sentry CLI (`sentry-cli releases new`, `sentry-cli releases files upload-sourcemaps`)
- Nginx / Express IP-restriction patterns for `.map` file serving

## Sources Consulted
- Source Map Revision 3 Proposal: https://sourcemaps.info/spec.html
- TC39 Source Map Format: https://tc39.es/source-map/
- esbuild — sourcemap option: https://esbuild.github.io/api/#sourcemap
- Webpack — devtool: https://webpack.js.org/configuration/devtool/
- Webpack — `output.sourceMapFilename`: https://webpack.js.org/configuration/output/#outputsourcemapfilename
- Webpack — `SourceMapDevToolPlugin`: https://webpack.js.org/plugins/source-map-dev-tool-plugin/
- Vite — build options (`build.sourcemap`): https://vite.dev/config/build-options.html#build-sourcemap
- Rollup — output options (`sourcemapFileNames`, `sourcemapExcludeSources`): https://rollupjs.org/configuration-options/
- TypeScript compiler options: https://www.typescriptlang.org/tsconfig#sourceMap
- Sass JS API (`compile` / source-map options): https://sass-lang.com/documentation/js-api/interfaces/options/
- PostCSS source maps guide: https://github.com/postcss/postcss/blob/main/docs/source-maps.md
- Node.js `--enable-source-maps`: https://nodejs.org/api/cli.html#--enable-source-maps
- `source-map-support`: https://github.com/evanw/node-source-map-support
- Sentry CLI sourcemaps docs: https://docs.sentry.io/cli/releases/#upload-source-maps

## Issues Found
- **esbuild `sourcemap` option comments were misleading.** The original snippet labelled `sourcemap: 'external'` as "Same as true". Per the esbuild docs, `sourcemap: true` is equivalent to `'linked'` (external file **with** `//# sourceMappingURL=` comment), while `'external'` deliberately omits that comment. The two are not equivalent — `'external'` is intended for cases where you want a separate `.map` file but no reference in the bundle (e.g., when uploading to an error tracker privately). Updated the inline comments in the esbuild example to describe each option accurately.

## Review Notes
- The V3 format description is simplified: real segments may have 1, 4, or 5 VLQ-encoded fields, not always 5. The post's "5 VLQ values" with "(optional)" qualifier on the name index is an acceptable simplification for an introductory explanation.
- `node --enable-source-maps` was added experimentally in Node.js 12.12.0 and stabilized in 16.6.0. The post's "Node.js 12+" is broadly accurate but could be tightened in a future revision.
- The Sentry CLI commands shown (`sentry-cli releases new` / `releases files <release> upload-sourcemaps`) are the legacy release-based workflow and still supported. Sentry's current recommendation for many projects is the newer `sentry-cli sourcemaps upload` (debug-ID-based) flow, but the legacy commands continue to work and the post's example remains valid.
- The "decoded `AAAA` segment" interpretation (column 0, source 0, line 0, column 0) is correct since VLQ Base64 `A` decodes to 0; this is a faithful illustration of the encoding.
- The `nosources-source-map` Webpack devtool example correctly characterises the output: original file names and positions are preserved while `sourcesContent` is omitted.
- The webpack `SourceMapDevToolPlugin` options used (`filename`, `publicPath`, `fileContext`) are all real, current options.
- CSS sourceMappingURL comment syntax (`/*# sourceMappingURL=... */`) matches the modern convention.
