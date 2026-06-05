# Validation Summary: How to Instrument an Angular Application with OpenTelemetry Web SDK

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Angular
- TypeScript
- RxJS
- OpenTelemetry JavaScript API
- OpenTelemetry Web SDK
- OpenTelemetry browser auto-instrumentations
- OTLP HTTP trace exporter
- W3C trace context propagation

## Sources Consulted
- OpenTelemetry JavaScript browser getting started guide: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry JavaScript API reference for `WebTracerProvider`: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- OpenTelemetry JavaScript API reference for `Resource`: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_resources.Resource.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Angular `provideAppInitializer` API documentation: https://angular.dev/api/core/provideAppInitializer
- Angular `APP_INITIALIZER` API documentation: https://angular.dev/api/core/APP_INITIALIZER
- Angular `HttpClientModule` API documentation: https://angular.dev/api/common/http/HttpClientModule
- Angular `HTTP_INTERCEPTORS` API documentation: https://angular.dev/api/common/http/HTTP_INTERCEPTORS
- Published npm package metadata and TypeScript declarations for current OpenTelemetry packages: `@opentelemetry/sdk-trace-web` 2.7.1, `@opentelemetry/resources` 2.7.1, `@opentelemetry/semantic-conventions` 1.41.1, `@opentelemetry/auto-instrumentations-web` 0.63.0

## Issues Found
- The tracing service used `new Resource(...)`, but current `@opentelemetry/resources` exposes resources through helpers such as `resourceFromAttributes`. Updated the snippet to use `resourceFromAttributes`.
- The tracing service used `provider.addSpanProcessor(...)`, which is not available on the current `WebTracerProvider` API. Updated the provider construction to pass `spanProcessors` in the `WebTracerProvider` config.
- The tracing service used deprecated `SemanticResourceAttributes` constants. Updated the snippet to use current semantic convention constants for service name, service version, and deployment environment name.
- The browser tracing setup omitted `@opentelemetry/context-zone` while relying on Angular/RxJS async context. Added the package and registered `ZoneContextManager`.
- The production Angular environment file used `process.env`, which is not directly available in browser runtime environment files. Replaced it with a browser-safe token placeholder.
- The Angular initialization snippet used deprecated `APP_INITIALIZER` and deprecated `HttpClientModule`. Updated it to use `provideAppInitializer` and `provideHttpClient(withInterceptorsFromDi())`.
- The HTTP interceptor wording said it added attributes to automatically instrumented requests, but the code creates separate Angular-level `HttpClient` spans. Corrected the wording.
- The HTTP interceptor used older HTTP semantic attribute names and ended spans only in success/error callbacks. Updated attribute names, HTTP status handling, and span closure via `finalize`.
- The Angular service examples created spans outside Observable subscription time and ended them only on success/error. Updated them to use `defer`, active context, and `finalize`.
- The component example did not unsubscribe from the user loading subscription and could leave its manual span open on cancellation. Added subscription cleanup and `finalize`.
- The router tracing example did not handle cancelled navigations and used non-narrowing RxJS filters. Added `NavigationCancel` handling and type guard predicates.

## Review Notes
OpenTelemetry browser instrumentation is still documented by OpenTelemetry as experimental and mostly unspecified. The corrected examples are aligned with current package APIs, but future OpenTelemetry JS releases may continue to change browser instrumentation details.
