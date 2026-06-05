# Validation Summary: How to Report Vue.js Error Boundaries to OpenTelemetry as Exception Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Vue.js 3
- OpenTelemetry JavaScript API
- Browser error and unhandled promise rejection events
- Axios response interceptors
- Vue Test Utils

## Sources Consulted
- Vue Application API: https://vuejs.org/api/application.html#app-config-errorhandler
- Vue Composition API lifecycle hooks: https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured
- Vue component emits option: https://vuejs.org/api/options-state.html#emits
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Span API: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- MDN Window error event: https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
- MDN ErrorEvent.error: https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent/error
- MDN Window unhandledrejection event: https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event

## Issues Found
- The central error tracker assumed every thrown value was an `Error`, but Vue's error handler receives `unknown` and JavaScript can throw strings or other values. Added `normalizeError()` so exception attributes and `recordException()` receive a valid `Error`, and only set `exception.stacktrace` when a stack is available.
- The global error handler example used `getTracer()` inside `warnHandler` without importing it. Added the missing import so the snippet can run.
- The global error handler pre-stringified `vue.props` before passing it to `sanitizeContext()`, which could double-encode props. Changed it to pass the public `$props` object and let the sanitizer handle serialization.
- The error boundary snippet imported `trace` from `@opentelemetry/api` but did not use it. Removed the unused import.
- The `onErrorCaptured` comment said `return false` prevents propagation "further." Clarified that Vue stops parent `errorCaptured` hooks and `app.config.errorHandler` for that error.
- The async error section claimed Vue error handlers do not catch async code. Updated the wording to match Vue's documented Vue-managed error sources and distinguish them from unhandled promise rejections or errors outside Vue's lifecycle.
- The browser `error` event handler passed `event.error` directly to `recordException`, but OpenTelemetry's JavaScript API accepts only `Error` or string values for `recordException`, and `ErrorEvent.error` can be another JavaScript value. Normalized the value to an `Error` before reporting.
- The composable imported `onMounted` but did not use it. Removed the unused import.
- The composable recorded an exception and then called `reportToActiveSpan()` while the same span was active, which would record the exception twice. Changed it to attach sanitized context attributes to the span directly.
- The `DataTable` example called `trackError()` after `withErrorTracking()` had already recorded and rethrown the same error, causing duplicate reporting. Removed the second tracking call and kept local handling.

## Review Notes
The tutorial remains accurate as a Vue 3 and OpenTelemetry JavaScript guide after the fixes. The post intentionally uses custom attributes such as `vue.component` and `error_boundary.*`; these are valid OpenTelemetry attributes but are not standardized semantic convention keys.
