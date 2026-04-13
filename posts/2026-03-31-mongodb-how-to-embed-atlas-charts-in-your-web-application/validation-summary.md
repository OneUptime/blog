# Validation Summary: How to Embed Atlas Charts in Your Web Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Charts
- `@mongodb-js/charts-embed-dom` SDK (v3.x)
- JavaScript (ES Modules)
- Node.js / Express
- JSON Web Tokens (JWT) for authenticated embedding
- React (component wrapper example)

## Sources Consulted
- `@mongodb-js/charts-embed-dom` npm package (v3.3.1) — TypeScript type definitions at `dist/types/`
- GitHub repository: `mongodb-js/charts-embed-sdk` — official examples at `examples/charts/`
- Type definitions inspected: `index.d.ts`, `types.d.ts`, `chart.d.ts`, `base-embed-item.d.ts`, `mixins/filterable.d.ts`, `mixins/refreshable.d.ts`

## Issues Found
1. **Non-existent `destroy()` method in React cleanup (Step 7):** The React component's `useEffect` cleanup called `chartRef.current?.destroy?.()`. The `@mongodb-js/charts-embed-dom` SDK does not expose a `destroy()`, `dispose()`, `unmount()`, or any other teardown method on chart instances. While the optional chaining (`?.`) prevented a runtime error, the cleanup was silently doing nothing. **Fix:** Replaced with `containerRef.current.innerHTML = ''` to properly remove the embedded iframe from the DOM on unmount.

## Review Notes
- All other API usage is correct: `ChartsEmbedSDK` constructor options (`baseUrl`, `getUserToken`, `theme`), `createChart()` options (`chartId`, `height`, `width`, `filter`), `chart.render()`, `chart.setFilter()`, and `chart.refresh()` all match the current SDK type definitions.
- The JWT authentication pattern (backend signs token, frontend passes `getUserToken` callback to SDK) matches the official authenticated embedding examples.
- The `filter` option is correctly used both as an initial `createChart()` option and dynamically via `setFilter()`.
- The SDK also supports `autoRefresh` and `maxDataAge` options as alternatives to the manual `setInterval` refresh pattern shown in Step 6, but the manual approach is valid.
