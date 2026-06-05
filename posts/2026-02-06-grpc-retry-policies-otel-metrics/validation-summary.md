# Validation Summary: How to Track gRPC Retry Policies and Attempt Counts Using OpenTelemetry Per-Call

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC retry service configuration
- gRPC Go unary client interceptors
- gRPC Python unary RPC calls
- OpenTelemetry metrics for Go and Python
- Prometheus / PromQL

## Sources Consulted
- gRPC Retry guide: https://grpc.io/docs/guides/retry/
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/
- gRPC OpenTelemetry Metrics guide: https://grpc.io/docs/guides/opentelemetry-metrics/
- gRPC Python API documentation: https://grpc.github.io/grpc/python/grpc.html
- OpenTelemetry Go metric API: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The post implied that application-level retry loops could observe gRPC service-config retry attempts directly. gRPC service-config retries happen inside gRPC, and official gRPC OpenTelemetry metrics expose built-in per-attempt retry metrics. Updated the introduction and Go section title/commentary to distinguish built-in service-config retries from custom manual retry instrumentation.
- The Go interceptor used `status.FromError(err)` even when `err` could be nil, then dereferenced the returned status. Replaced this with `status.Code(err)`, which returns `OK` for nil errors.
- The Go retry loop slept after the final retryable failure even though no further attempt would run. Added a final-attempt check before sleeping.
- The Go code snippets were presented with an import block in the second snippet even though the example depends on the earlier declarations. Moved the needed imports into the first Go snippet so the Go example reads as one coherent file.
- The Python client interceptor example treated `continuation(...)` as the completed response. gRPC Python unary interceptors return a call/future object, so that example recorded success before RPC completion. Replaced it with a manual unary retry wrapper around a stub method, which matches the post's custom retry metric goal.
- The Python attempt duration metrics omitted status and attempt-number attributes on failure. Added consistent attributes for successful and failed attempt duration records.
- The PromQL average attempts query used `histogram_avg(grpc_client_call_attempts[5m])`, which is not valid for classic Prometheus histograms and does not apply a rate over the range. Replaced it with the `_sum` / `_count` rate form.
- The PromQL attempt success query returned successful attempts per second, not a success-rate fraction. Added the denominator grouped by attempt number.

## Review Notes
The retry policy JSON format is consistent with the gRPC retry and service-config documentation. The custom metric names are application-defined and not the same as gRPC's built-in OpenTelemetry metric names, such as `grpc.client.attempt.started`, `grpc.client.attempt.duration`, and `grpc.client.call.duration`.
