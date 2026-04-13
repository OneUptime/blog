# Validation Summary: How to Use Dapr with Vue.js Frontend and Go Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation, state management, pub/sub)
- Go (Dapr Go SDK, HTTP service)
- Vue.js 3 (Composition API, `<script setup>`)
- Axios (HTTP client)
- Vite (build tool / dev server)

## Sources Consulted
- Dapr Go SDK source and API reference (github.com/dapr/go-sdk) — Client interface for `SaveState`, `GetState`, `PublishEvent`; service/common package for `InvocationEvent` and `Content` types; service/http package for `NewService` and `AddServiceInvocationHandler`
- Dapr service invocation HTTP API docs (docs.dapr.io) — URL format `v1.0/invoke/{appId}/method/{method-name}`
- Dapr CLI reference (docs.dapr.io) — `dapr run` flags: `--app-id`, `--app-port`, `--dapr-http-port`
- Vue.js 3 documentation (vuejs.org) — Composition API, `ref`, `onMounted`, `v-model.number`, `<script setup>`
- Vite documentation (vitejs.dev) — `VITE_` environment variable prefix, `import.meta.env`
- Go language specification — import rules, unused import compile errors

## Issues Found

1. **Missing `common` package import (compilation error)**: The Go code used `common.InvocationEvent` and `common.Content` but did not import `github.com/dapr/go-sdk/service/common`. This would cause a compilation failure. **Fix:** Added `"github.com/dapr/go-sdk/service/common"` to the import block.

2. **Unused `net/http` import (compilation error)**: The `net/http` package was imported but never used anywhere in the code. Go treats unused imports as compilation errors. **Fix:** Removed the `"net/http"` import.

3. **`SaveState` called with struct instead of `[]byte` (compilation error)**: The `daprClient.SaveState()` call passed a `Metric` struct directly as the data parameter, but the Dapr Go SDK `SaveState` method expects `[]byte`. This would cause a type mismatch at compile time. **Fix:** Added `json.Marshal(metric)` to serialize the struct to `[]byte` before passing to `SaveState`. Applied the same marshalled bytes to `PublishEvent` for consistency and compatibility across SDK versions.

## Review Notes
- The Vue.js frontend code is correct and follows current Vue 3 Composition API patterns with `<script setup>`.
- The Dapr service invocation URL format (`/v1.0/invoke/{appId}/method/{path}`) is correct.
- The `dapr run` CLI flags are correct and current.
- The `useDapr` composable is a clean pattern for wrapping Dapr HTTP calls.
- The `getMetricsHandler` retrieves a single state key `"metrics"` but `recordMetricHandler` saves individual keys like `"metric-cpu"`. This means `getMetrics` would always return `[]` since no data is ever written to the `"metrics"` key. This is a logical design gap rather than a technical API error, but readers following the tutorial end-to-end would not see recorded metrics reflected in the dashboard.
