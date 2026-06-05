# Validation Summary: How to Reduce OpenTelemetry Browser SDK Bundle Size with Tree Shaking

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry JavaScript browser tracing SDK
- OpenTelemetry context managers, span processors, resources, exporters, and instrumentations
- Webpack tree shaking and module resolution
- Vite 8 / Rolldown build configuration
- Rollup Visualizer and Webpack Bundle Analyzer
- JavaScript bundle size monitoring in CI

## Sources Consulted
- OpenTelemetry JavaScript SDK docs for `@opentelemetry/sdk-trace-web`: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-web.html
- OpenTelemetry OTLP HTTP trace exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry `ZoneContextManager` API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_context-zone-peer-dep.ZoneContextManager.html
- OpenTelemetry resources docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry generated TypeScript declarations from current npm packages (`@opentelemetry/*` 2.7.1 and exporter 0.218.0)
- Webpack tree shaking guide: https://webpack.js.org/guides/tree-shaking/
- Webpack resolve configuration docs: https://webpack.js.org/configuration/resolve/
- Vite build options docs for v8.0.16: https://vite.dev/config/build-options.html
- Vite 8 announcement: https://vite.dev/blog/announcing-vite8
- Rolldown code splitting docs: https://rolldown.rs/reference/OutputOptions.codeSplitting
- Rolldown `manualChunks` docs: https://rolldown.rs/reference/OutputOptions.manualChunks

## Issues Found
- `StackContextManager` guidance overstated `context.with()` as sufficient for async propagation. Updated the text to explain that async callbacks must be wrapped or bound explicitly, and that apps needing automatic async context propagation should keep `ZoneContextManager` with a compatible build target.
- Webpack config incorrectly described `sideEffects: true` as declaring packages side-effect-free and overrode conditional export resolution with an incomplete `conditionNames` list. Updated the comment, removed the risky `conditionNames` override, and restored browser-first `mainFields`.
- Vite section was outdated for current Vite 8. Updated the explanation from Rollup-only production builds to Rolldown in Vite 8, replaced deprecated `rollupOptions` usage with `rolldownOptions`, and replaced Rollup object-form `manualChunks` with Rolldown `codeSplitting.groups`.
- Lazy-loading example used `new Resource(...)` and `provider.addSpanProcessor(...)`, which are not valid current OpenTelemetry JS APIs. Replaced `Resource` with `resourceFromAttributes` and moved `BatchSpanProcessor` into the `WebTracerProvider` `spanProcessors` constructor option.
- Bundle analyzer text called `rollup-plugin-visualizer` built into Vite. Updated it to describe the plugin as a commonly used external visualizer.
- Lightweight exporter example imported `ReadableSpan`, which is type-only and not a runtime export, and used numeric result codes directly. Removed the invalid import, imported `ExportResultCode`, and added `forceFlush()`.
- Exporter explanation said the OTLP HTTP exporter includes Protocol Buffers serialization. Corrected it because `@opentelemetry/exporter-trace-otlp-http` is the OTLP HTTP/JSON exporter.
- Minimal bundle target text claimed a traces + fetch-only setup captures page-load traces. Clarified that document-load instrumentation is required for automatic page-load traces.
- CI bundle-size script described a gzipped threshold but checked raw file size. Updated it to gzip the chunk with `gzipSync(readFileSync(...))` before comparing.

## Review Notes
Approximate bundle-size numbers remain inherently build-dependent. They should be treated as rough targets, not package-size guarantees, because actual output varies by OpenTelemetry package versions, bundler version, minifier, target browsers, enabled instrumentations, and gzip settings.
