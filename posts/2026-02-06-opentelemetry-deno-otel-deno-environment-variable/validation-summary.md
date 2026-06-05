# Validation Summary: How to Enable Built-In OpenTelemetry in Deno

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno
- OpenTelemetry
- OTLP exporters
- TypeScript
- Docker
- Docker Compose

## Sources Consulted
- Deno OpenTelemetry documentation: https://docs.deno.com/runtime/fundamentals/open_telemetry/
- Deno `Deno.telemetry` API documentation: https://docs.deno.com/api/deno/~/Deno.telemetry
- Deno `Deno.serve` API documentation: https://docs.deno.com/api/deno/~/Deno.serve
- Deno distributed tracing/context propagation tutorial: https://docs.deno.com/examples/otel_span_propagation_tutorial/
- Deno basic OpenTelemetry tutorial: https://docs.deno.com/examples/basic_opentelemetry_tutorial/
- Deno 2.4 release notes for stable OpenTelemetry support: https://deno.com/blog/v2.4
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/

## Issues Found
- The post used `OTEL_DENO=1`, but Deno's documentation and the OpenTelemetry boolean environment variable convention use `OTEL_DENO=true`. Updated all commands, Docker examples, and references.
- The automatic instrumentation list claimed support for WebSockets, dynamic imports, worker threads, file system operations, and timer operations. Deno's current docs list automatic spans for `Deno.serve`, `fetch`, and `Deno.cron()` invocations, plus metrics and logs. Replaced the list with the documented coverage.
- The HTTP examples imported `serve` from an old Deno standard library URL. Replaced those examples with the current built-in `Deno.serve({ port }, handler)` API.
- Several examples claimed timer operations or entire background jobs are automatically traced. Updated the wording to describe automatic HTTP/fetch spans and recommend custom spans for whole-job lifecycle traces.
- The API gateway and microservices sections overclaimed distributed tracing behavior. Updated the text to clarify that trace context propagation works when downstream services are also instrumented and honor W3C trace context.
- The post listed `OTEL_EXPORTER_OTLP_PROTOCOL` as only `http/protobuf` or `grpc`. Updated the reference to include Deno's documented `http/json` and `console` values and noted that gRPC support requires Deno 2.8 or later.
- The Dockerfile used `denoland/deno:1.39.0`, which predates built-in OpenTelemetry support. Updated it to a Deno 2.8 image.
- The performance section claimed typical overhead under 5% and recommended `OTEL_TRACES_SAMPLER=traceidratio`. Deno's current docs list traces as always sampled, so the claim and sampling command were replaced with current guidance.
- The limitations section incorrectly stated that custom spans cannot be created. Updated it to explain Deno's support for `npm:@opentelemetry/api@1` and corrected the custom span example to use `startActiveSpan`, `SpanStatusCode`, and a `finally` block.
- The debugging section recommended `OTEL_LOG_LEVEL=debug` as the way to see traced output. Replaced it with Deno's documented console exporter using `OTEL_EXPORTER_OTLP_PROTOCOL=console`.
- Removed an obsolete extra collector port mapping from the Docker Compose example.

## Review Notes
- Deno's OpenTelemetry integration has changed quickly across Deno 2.x. The reviewed post is now aligned with the current documentation as of 2026-06-05, including stable built-in OpenTelemetry support, current exporter protocol options, and current limitations.
