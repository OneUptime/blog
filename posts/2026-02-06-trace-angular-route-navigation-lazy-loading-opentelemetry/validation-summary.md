# Validation Summary: How to Trace Angular Route Navigation and Lazy Loading with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Angular
- Angular Router
- Angular lazy-loaded routes
- Angular route guards and resolvers
- OpenTelemetry JavaScript
- OpenTelemetry Web SDK
- OpenTelemetry browser fetch and document-load instrumentation
- TypeScript

## Sources Consulted
- Angular Router lifecycle and events: https://angular.dev/guide/routing/lifecycle-and-events
- Angular `NavigationSkipped` API: https://angular.dev/api/router/NavigationSkipped
- Angular lazy-loading feature modules: https://v18.angular.dev/guide/ngmodules/lazy-loading/
- Angular `provideAppInitializer` API: https://angular.dev/api/core/provideAppInitializer
- Angular `EnvironmentProviders` API: https://angular.dev/api/core/EnvironmentProviders
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Web SDK API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-trace-web.html
- OpenTelemetry `WebTracerProvider` API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-trace-web.WebTracerProvider.html
- OpenTelemetry resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry semantic conventions API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry fetch instrumentation API: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_instrumentation-fetch.FetchInstrumentation.html

## Issues Found
- The OpenTelemetry setup used outdated APIs: `new Resource(...)`, `SemanticResourceAttributes`, and `provider.addSpanProcessor(...)`. Updated the snippet to use `resourceFromAttributes`, `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and the `spanProcessors` provider option.
- The tracing setup imported `BatchSpanProcessor` from `@opentelemetry/sdk-trace-base` even though the browser SDK exports the browser-facing setup from `@opentelemetry/sdk-trace-web`. Updated the import.
- The lazy-loading section used a custom class decorator, which would measure module class construction rather than Angular's lazy route configuration and chunk loading window. Replaced it with `RouteConfigLoadStart` and `RouteConfigLoadEnd` router-event tracing.
- The router tracing example did not handle `NavigationSkipped`, which Angular documents as a possible terminal navigation event. Added skipped navigation handling and context cleanup.
- The guard and module-load monitor snippets used `SpanStatusCode` without importing it. Added the missing imports.
- The guard and resolver examples used class-based router guard/resolver interfaces directly. Updated the snippets to expose functional `CanActivateFn` and `ResolveFn` wrappers with `inject(...)`, matching Angular's current guidance.
- The app initializer example used deprecated `APP_INITIALIZER`. Updated it to `provideAppInitializer`.
- The trace hierarchy wording implied guaranteed parent-child relationships. Adjusted the wording to clarify that hierarchy depends on starting child spans with the navigation span context.
- The performance section claimed a fixed less-than-5ms overhead and no ZoneContextManager overhead. Replaced this with a version-neutral statement that overhead depends on span volume, attributes, browser performance, exporter behavior, batching, and sampling.
- The ZoneContextManager guidance omitted OpenTelemetry's build-target caveat. Added a note that the context manager is intended for ES2015-compatible output.

## Review Notes
The article is technically relevant and salvageable. The corrected examples now align with current Angular router events and current OpenTelemetry JavaScript API shapes. Future improvements could show a complete shared navigation-context helper so manually instrumented guard and resolver spans are always parented under the navigation span.
