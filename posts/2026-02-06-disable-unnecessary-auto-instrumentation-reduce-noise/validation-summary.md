# Validation Summary: How to Disable Unnecessary Auto-Instrumentation Libraries to Reduce Noise

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry auto-instrumentation
- OpenTelemetry Python
- OpenTelemetry Java agent
- OpenTelemetry Spring Boot starter
- OpenTelemetry JavaScript/Node.js
- OpenTelemetry Go instrumentation
- OpenTelemetry Collector filter and sampling processors
- Redis, JDBC, Kafka, HTTP, Express, Gin, database/sql, otelsql

## Sources Consulted
- OpenTelemetry Python zero-code instrumentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python agent configuration: https://opentelemetry.io/docs/zero-code/python/configuration/
- OpenTelemetry Java agent suppressing instrumentation: https://opentelemetry.io/docs/zero-code/java/agent/disable/
- OpenTelemetry Java Spring Boot starter out-of-the-box instrumentation: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry JavaScript instrumentation libraries: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript package metadata for current instrumentation config types: https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node
- otelgin package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin
- XSAM otelsql package documentation: https://pkg.go.dev/github.com/XSAM/otelsql
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector processors overview: https://opentelemetry.io/docs/collector/components/processor/

## Issues Found
- The Python setup command installed `opentelemetry-instrumentation`, but current official setup uses `opentelemetry-distro`, an OTLP exporter, and `opentelemetry-bootstrap -a install`. Updated the install commands.
- The Python YAML example was presented as an OpenTelemetry config file even though it was not a standard Python agent config format. Reworded it as application-owned instrumentation configuration.
- The Java examples used `otel.instrumentation.redis.enabled` and `otel.instrumentation.httpclient.enabled`, which are not the current Java agent instrumentation names for those examples. Updated Redis to `jedis`/`lettuce` and HTTP clients to `apache-httpclient`/`java-http-client`.
- The Spring Boot Java code mixed an incorrect Spring Web MVC instrumentation package/API with Spring interceptor APIs. Replaced it with Spring configuration properties for supported instrumentation enable/disable controls.
- The Node.js example imported `@opentelemetry/exporter-trace-otlp-grpc` without installing it. Added the package to the install command.
- The Node.js route ignore hook was attached to Express instrumentation, but `ignoreIncomingRequestHook` belongs to HTTP instrumentation. Moved the hook to `@opentelemetry/instrumentation-http` and made the URL check return a boolean.
- The Node.js auto-instrumentation config included an extra Redis 4 key that is not part of the current auto-instrumentations map. Removed it.
- The Go Gin example had missing imports, an unused import, undefined handlers, and reversed `otelgin.WithFilter` semantics. Added required imports and handlers, removed the unused import, and changed the filter to return `false` for skipped requests.
- The Go database example used a non-current otelsql import path and invalid span options. Updated it to `github.com/XSAM/otelsql`, current semantic convention constants, valid `SpanOptions`, and explicit error handling.
- The Collector filter processor snippet used an outdated/deprecated shape and an invalid `span_duration` filter. Replaced it with current OTTL-based `trace_conditions`.

## Review Notes
The examples are now aligned with current official APIs and configuration names. The Collector filtering example should still be tested against the exact Collector distribution and version in production because filter processor configuration has evolved over time and older configuration styles may still be accepted by some versions.
