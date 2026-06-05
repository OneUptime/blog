# Validation Summary: How to Integrate OpenTelemetry Web Tracing in a Vue.js Application

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- Vue.js
- Vue Router
- Vuex
- Axios
- OTLP/HTTP trace export
- JavaScript browser instrumentation

## Sources Consulted
- OpenTelemetry JavaScript browser guide: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry resources package README/API: https://www.npmjs.com/package/@opentelemetry/resources
- OpenTelemetry semantic conventions package/API: https://www.npmjs.com/package/@opentelemetry/semantic-conventions
- Vue Router navigation guards: https://router.vuejs.org/guide/advanced/navigation-guards.html
- Vue Router navigation failures: https://router.vuejs.org/guide/advanced/navigation-failures.html
- Vue Composition API lifecycle hooks: https://vuejs.org/api/composition-api-lifecycle
- Vuex plugins guide: https://vuex.vuejs.org/guide/plugins.html
- Axios interceptors documentation: https://axios-http.com/docs/interceptors

## Issues Found
- The dependency list omitted `@opentelemetry/sdk-trace-base` even though the article imports `BatchSpanProcessor` from it. Added the package to the install command.
- The tracing module used older OpenTelemetry JS APIs: `new Resource(...)`, `SemanticResourceAttributes`, and `tracerProvider.addSpanProcessor(...)`. Updated it to use `resourceFromAttributes`, stable semantic convention constants, and `spanProcessors` in the `WebTracerProvider` constructor.
- The production sampling example configured `sampling`, but the tracing module ignored it. Added `TraceIdRatioBasedSampler` support so the example works as described.
- The fetch custom attribute callback assumed every request has `request.url`. Updated it to handle `Request`, `RequestInit`, and `Response` shapes safely.
- The article implied browser OpenTelemetry instrumentation is fully settled. Added the official caveat that browser instrumentation is still experimental.
- The Vue Router example used the legacy `next` pattern and always marked completed navigations as successful. Updated it for Vue Router 4 guard style and to handle `afterEach` navigation failures.
- The component tracing composable imported an unused hook and could produce `undefined.spanName` custom span names when no component name was passed. Removed the unused import and used the resolved component name.
- The component example set a span attribute from `user.value.id`, but the sample user object did not define `id`. Added an `id` value to the sample object.
- The Axios example claimed Axios always requires manual instrumentation because there is no automatic instrumentation. Corrected this because browser Axios requests can be covered by XMLHttpRequest instrumentation, while interceptors are still useful for higher-level spans.
- The Axios propagation example created an empty headers object and did not inject trace context. Updated it to use `propagation.inject`.
- The Vuex dispatch wrapper only handled the simplest `dispatch(type, payload)` signature and dropped other dispatch arguments. Updated it to preserve Vuex dispatch overloads.
- The Vuex store example used `apiClient` without importing it. Added the missing import.
- The performance section gave an unsupported fixed overhead claim. Replaced it with guidance to measure overhead in the target application.

## Review Notes
- The examples intentionally keep custom attributes such as `http.host` and `http.path` for readability, but newer OpenTelemetry HTTP semantic conventions prefer stable attributes such as `server.address` and `url.path`.
- Propagating trace headers to all URLs with `propagateTraceHeaderCorsUrls: [/.+/]` is valid API usage, but production apps should restrict it to backends that allow the required CORS headers.
