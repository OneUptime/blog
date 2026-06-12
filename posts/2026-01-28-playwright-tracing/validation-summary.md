# Validation Summary: How to Use Playwright Tracing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Playwright Test
- Playwright tracing and Trace Viewer
- TypeScript
- GitHub Actions
- Node.js filesystem cleanup script

## Sources Consulted
- Playwright Trace Viewer documentation: https://playwright.dev/docs/trace-viewer
- Playwright Tracing API documentation: https://playwright.dev/docs/api/class-tracing
- Playwright fixtures documentation: https://playwright.dev/docs/test-fixtures
- Playwright command line documentation: https://playwright.dev/docs/test-cli
- Playwright Test options documentation: https://playwright.dev/docs/api/class-testoptions

## Issues Found
- The trace chunks example described creating trace chunks but used repeated `context.tracing.start()` and `context.tracing.stop()` calls. Updated it to use the documented `context.tracing.start()` once, then `context.tracing.startChunk()` and `context.tracing.stopChunk()` for each chunk.
- The automatic trace fixture was not typed as a custom fixture and saved traces for passed tests despite the surrounding text saying it captured traces on failure. Updated it to use `base.extend<{ autoTrace: void }>()`, save traces only when `testInfo.status !== testInfo.expectedStatus`, and use `testInfo.outputPath('trace.zip')` for a unique per-test trace path.
- The Trace Viewer keyboard shortcuts table included shortcuts that are not documented in the official Playwright Trace Viewer docs. Removed the unsupported shortcut section.

## Review Notes
The post correctly recommends `trace: 'on-first-retry'` for CI and uses current Playwright tracing configuration values and CLI commands. The Playwright docs also note that enabling tracing through Playwright Test configuration gives a more complete trace than manual `context.tracing` because it includes test assertions; the post's programmatic examples are still valid for targeted browser-context tracing.
