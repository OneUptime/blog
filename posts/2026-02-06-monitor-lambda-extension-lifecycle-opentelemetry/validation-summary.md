# Validation Summary: How to Monitor Lambda Extension Lifecycle with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda Extensions API
- AWS Lambda execution environment lifecycle
- OpenTelemetry Go SDK
- OpenTelemetry OTLP trace HTTP exporter
- OpenTelemetry Collector
- Go
- YAML

## Sources Consulted
- AWS Lambda Extensions API documentation: https://docs.aws.amazon.com/lambda/latest/dg/runtimes-extensions-api.html
- AWS Lambda execution environment lifecycle documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- OpenTelemetry Go OTLP trace HTTP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Collector batch processor package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector component documentation: https://opentelemetry.io/docs/collector/components/extension/

## Issues Found
- The `main.go` snippet imported `net/http` but did not use it. Removed the unused import so the snippet can compile when used as a separate file.
- The `initTracer` example passed `OTEL_EXPORTER_OTLP_ENDPOINT` to `otlptracehttp.WithEndpoint`. The OpenTelemetry Go documentation says `WithEndpoint` expects only `host:port`, while the OTLP environment variable is a full URL with scheme and optional path. Removed the explicit option so the exporter uses the standard OTLP environment variables directly.
- The `metrics.go` snippet imported `context` and `time` but did not use them. Removed the unused imports so the snippet can compile.
- The Collector batch processor comment said the default was a "200ms send batch size and 5000ms timeout." The official batch processor defaults are `send_batch_size: 8192` and `timeout: 200ms`. Corrected the comment.

## Review Notes
The Lambda lifecycle description, Extensions API paths, `Lambda-Extension-Name` and `Lambda-Extension-Identifier` headers, `/extension/event/next` blocking behavior, `deadlineMs` fields, shutdown reasons, and 2,000 ms external-extension shutdown limit were checked against AWS documentation and are technically accurate. The OpenTelemetry Collector `health_check`, `batch`, `otlp` receiver/exporter, and `retry_on_failure` configuration structure is plausible for current Collector configuration, though real deployments still need backend-specific TLS and authentication settings.
