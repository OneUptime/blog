# Validation Summary: How to Add OpenTelemetry to JAX-RS Services in Jakarta EE

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry Java API, SDK, Java agent, semantic conventions, OTLP exporter, and context propagation
- JAX-RS / Jakarta RESTful Web Services
- Jakarta EE CDI
- Jakarta REST Client API
- Maven dependency configuration
- MicroProfile Config-style properties

## Sources Consulted
- OpenTelemetry Java agent instrumentation suppression/configuration docs: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java SDK configuration docs: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java SDK/exporter docs: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Java API docs: https://opentelemetry.io/docs/languages/java/api/
- Jakarta REST 3.1 specification and API docs: https://jakarta.ee/specifications/restful-ws/3.1/
- Jakarta REST Invocation.Builder API docs: https://jakarta.ee/specifications/restful-ws/3.1/apidocs/jakarta.ws.rs/jakarta/ws/rs/client/Invocation.Builder
- Maven Central artifacts inspected for the versions used in the post: `io.opentelemetry.semconv:opentelemetry-semconv:1.23.1-alpha`, `io.opentelemetry:opentelemetry-exporter-otlp:1.37.0`, and `jakarta.ws.rs:jakarta.ws.rs-api:3.1.0`

## Issues Found
- The JAX-RS client propagation example used `Invocation.Builder.getHeaders()`, but the portable Jakarta REST `Invocation.Builder` API does not expose that method. Changed the `TextMapSetter` carrier to `Invocation.Builder` and injects headers via `carrier.header(key, value)`.
- The server tracing filter set 4xx HTTP responses to `StatusCode.ERROR`. OpenTelemetry HTTP semantic conventions say 4xx status codes on `SpanKind.SERVER` should be left unset unless application-specific context treats them as errors. Removed the 4xx error branch and left only 5xx as error in the generic filter.
- The server tracing filter unconditionally set `SemanticAttributes.URL_QUERY` from `URI.getQuery()`, which can be null. Added a null check before setting the attribute.
- The route fallback returned a path without a leading slash, while the route examples use route patterns such as `/users/{id}`. Updated the fallback to return `"/" + path`.
- The custom `@TraceOperation` annotation was presented as tracing specific methods, but the post does not implement an interceptor or processor for it. Clarified that the annotation is a marker unless additional code reads it.

## Review Notes
- The post pins OpenTelemetry Java 1.37.0 and `opentelemetry-semconv` 1.23.1-alpha. Those semantic convention constants exist in the inspected artifact, but the semconv Java artifact is alpha and version-sensitive.
- Maven, `javap`, and `jar` were not available in the local environment, so full compilation was not possible. Artifact ZIP/class-name and string inspection was used where local tool support allowed it.
