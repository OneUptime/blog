# Validation Summary: How to Monitor Cold Start Performance Degradation in Serverless Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry semantic conventions
- OpenTelemetry OTLP gRPC exporters
- AWS Lambda cold starts and execution environment lifecycle
- Prometheus PromQL alerts and histogram queries

## Sources Consulted
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry FaaS semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/faas/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- AWS Lambda execution environment lifecycle documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- Prometheus histogram and summary documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The Python OpenTelemetry setup used `BatchSpanProcessor` but did not import it. Added `from opentelemetry.sdk.trace.export import BatchSpanProcessor`, matching the OpenTelemetry Python exporter examples.
- The span attribute `faas.cold_start` did not match the OpenTelemetry FaaS semantic convention. Changed it to `faas.coldstart`.
- The span attribute `faas.memory_size` did not match the current OpenTelemetry FaaS semantic convention. Changed it to `faas.max_memory` and converted the AWS Lambda memory limit from MB to bytes.
- The PromQL cold start ratio queries used raw counters with mismatched label sets between cold-start and warm-start counters. Added `sum by (faas_name)` aggregation so the binary operations match correctly.
- The PromQL average duration queries attempted to average the histogram metric name directly. Replaced them with Prometheus histogram average calculations using `_sum` divided by `_count`.

## Review Notes
- The example uses custom metric names such as `faas.coldstart.duration`, which are not built-in OpenTelemetry semantic convention metrics, but they are valid custom OpenTelemetry metric names for this tutorial.
- The `process_order(event)` call is intentionally presented as the user's application logic placeholder.
