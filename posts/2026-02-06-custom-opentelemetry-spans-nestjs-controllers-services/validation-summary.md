# Validation Summary: How to Create Custom OpenTelemetry Spans in NestJS Controllers and Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript API
- NestJS
- TypeScript
- TypeORM
- Node.js / npm

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript API reference for `@opentelemetry/api`: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html
- OpenTelemetry JavaScript `Tracer` API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html
- OpenTelemetry JavaScript `Span` API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry exception semantic convention documentation: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- NestJS custom decorators documentation: https://docs.nestjs.com/custom-decorators
- TypeScript decorators documentation: https://www.typescriptlang.org/docs/handbook/decorators
- TypeORM repository API documentation: https://typeorm.io/docs/working-with-entity-manager/repository-api/
- TypeORM find options documentation: https://typeorm.io/docs/working-with-entity-manager/find-options/

## Issues Found
- The setup section implied that installing `@opentelemetry/api` was enough to create recording spans. Updated the text to clarify that the OpenTelemetry SDK and tracer provider must already be initialized, because `@opentelemetry/api` provides no-op implementations until an SDK is registered.
- The text described the injectable wrapper as a "tracer provider service". Changed it to "tracer service" because the code calls `trace.getTracer()` and does not implement or register a tracer provider.
- The main tracer service imported an unused `Context` type and accepted `Record<string, any>` attributes. Removed the unused import and changed the attribute type to `Record<string, AttributeValue>` to match the OpenTelemetry JavaScript API.
- Several TypeScript `catch` blocks accessed `error.message` or `error.constructor` directly. Updated them to normalize caught values to an `Error` instance before calling `recordException()`, setting the span status message, or adding error attributes. This keeps the examples compatible with strict TypeScript settings where catch variables are `unknown`.
- The recommendations service imported `SpanStatusCode` without using it. Removed the unused import from that snippet.

## Review Notes
The code examples assume a NestJS application configured for legacy TypeScript decorators, which is the normal NestJS setup. The decorator example is technically valid for that setup, but production projects may prefer interceptors for Nest-specific cross-cutting tracing behavior.
