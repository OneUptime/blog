# Validation Summary: How to Use the OpenTelemetry Angular HTTP Interceptor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry context propagation
- W3C Trace Context
- W3C Baggage
- B3 and Jaeger propagators
- Angular HTTP interceptors
- RxJS retry/finalize operators
- TypeScript
- Node.js / Express middleware

## Sources Consulted
- Angular HTTP interceptors guide: https://angular.dev/guide/http/interceptors
- Angular HttpClientModule API/deprecation notice: https://angular.dev/api/common/http/HttpClientModule
- Angular provideHttpClient API: https://angular.dev/api/common/http/provideHttpClient
- Angular provideAppInitializer API: https://angular.dev/api/core/provideAppInitializer
- OpenTelemetry JavaScript API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry JavaScript core propagator docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_core.html
- OpenTelemetry JavaScript B3Propagator docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_propagator-b3.B3Propagator.html
- OpenTelemetry propagation specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry baggage specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- npm package metadata for current versions of `@opentelemetry/api`, `@opentelemetry/propagator-b3`, `@opentelemetry/propagator-jaeger`, and `@angular/common`.

## Issues Found
- The install command omitted `@opentelemetry/context-zone`, which is commonly required for browser/Angular context propagation. Added it to the dependency list and added a caveat that OpenTelemetry API calls are no-op until a browser tracer provider and context manager are registered.
- The main interceptor imported and instantiated `W3CTraceContextPropagator` but never used it. Removed the unused propagator and injected via the configured global propagator.
- The main interceptor used deprecated HTTP semantic convention attributes such as `http.method`, `http.url`, `http.target`, `http.host`, `http.scheme`, and `http.status_code`. Updated examples to use current attributes such as `http.request.method`, `url.full`, `url.path`, `url.query`, `server.address`, `url.scheme`, and `http.response.status_code`.
- The Angular registration example used deprecated `HttpClientModule`. Replaced it with `provideHttpClient(withInterceptorsFromDi())` while keeping the DI-based `HTTP_INTERCEPTORS` provider.
- The initializer example used deprecated `APP_INITIALIZER`. Replaced it with `provideAppInitializer()` and `inject()`.
- The composite propagator example registered two `B3Propagator` instances for single and multi-header injection. Current OpenTelemetry JS B3 docs state that B3 extraction handles both formats and the injection format should be configured on a single propagator. Removed the duplicate B3 propagator and clarified the injection-format choice.
- The selective trace interceptor created spans but never ended them. Added `finalize()` so spans end after the HTTP observable completes or errors.
- The baggage service imported non-existent `baggageUtils` from `@opentelemetry/api` and used `context.with()` in a way that did not persist baggage for future requests. Reworked it to use `propagation.createBaggage()`, store immutable baggage updates, and expose a context with the stored baggage for injection.
- The enhanced retry interceptor set a fixed `x-attempt-number: 1` header that would not change across RxJS retries. Removed the misleading header and kept retry attempts recorded as span events/attributes.
- The Express backend example attempted to call `res.setHeader('Server-Timing', ...)` inside the `finish` event, after headers have already been sent. Moved the header setting before `next()` and left duration recording on the span in the `finish` handler.

## Review Notes
- The post is now technically valid as an interceptor-focused guide. A future improvement would be to add a compact WebTracerProvider setup snippet so readers can see the SDK initialization that the interceptor examples assume.
