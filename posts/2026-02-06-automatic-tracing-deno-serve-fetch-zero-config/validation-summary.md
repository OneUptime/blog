# Validation Summary: How to Use Automatic Tracing for Deno.serve and Fetch with Zero Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Deno runtime
- Deno.serve
- Fetch API
- OpenTelemetry
- OTLP HTTP exporter
- W3C Trace Context propagation
- Jaeger
- Docker Compose

## Sources Consulted
- Deno OpenTelemetry documentation: https://docs.deno.com/runtime/fundamentals/open_telemetry/
- Deno unstable flags documentation: https://docs.deno.com/runtime/reference/cli/unstable_flags/
- Deno run command documentation: https://docs.deno.com/runtime/reference/cli/run/
- Deno environment variables documentation: https://docs.deno.com/runtime/reference/env_variables/
- Deno.serve API reference: https://docs.deno.com/api/deno/~/Deno.serve
- Deno 2.2 release notes: https://deno.com/blog/v2.2
- Deno 2.4 release notes: https://deno.com/blog/v2.4
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.75/deployment/

## Issues Found
- The post stated that Deno 1.40 and later include native OpenTelemetry support through `--unstable-otel`. Official Deno release notes show built-in OpenTelemetry was introduced in Deno 2.2, and Deno 2.4 made it stable so `--unstable-otel` is no longer required. Updated the version and enablement guidance.
- The startup command used `-E OTEL_EXPORTER_OTLP_ENDPOINT=...` and `-E OTEL_SERVICE_NAME=...` as if `-E` sets environment variables. In Deno, `-E` is an alias for env permission, not an environment assignment. Updated the command to set environment variables before `deno run`.
- The configuration examples used `OTEL_TRACES_EXPORTER` and trace sampler environment variables as if Deno's built-in integration respects them. Current Deno documentation says supported exporters are configured via `OTEL_EXPORTER_OTLP_PROTOCOL`, and Deno currently samples all traces. Removed the misleading exporter/sampler settings and added collector/backend sampling guidance.
- The advanced configuration snippet used `OTEL_ENABLED`, which is not Deno's documented enablement variable. Changed it to `OTEL_DENO`.
- The error-handling section claimed exceptions and failed requests are automatically marked as error spans. Deno's current limitations say the `Deno.serve` server span does not set OpenTelemetry status and handler errors are not attached as span events. Updated the wording to focus on recorded HTTP metadata, correlated logs, and manual spans for application-specific error details.

## Review Notes
- The Deno.serve examples use a valid options object with `handler`, and the fetch examples use current Fetch API patterns.
- Jaeger's all-in-one image supports OTLP HTTP on port 4318 when OTLP collection is enabled.
- Deno's OpenTelemetry integration is still documented with limitations, so future reviews should re-check sampling and error-status behavior against the current Deno docs.
