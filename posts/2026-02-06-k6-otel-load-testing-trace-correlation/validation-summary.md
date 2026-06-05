# Validation Summary: How to Use k6 with OpenTelemetry Output for Load Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- OpenTelemetry Protocol and OpenTelemetry Collector
- W3C Trace Context
- Grafana Tempo and TraceQL
- Prometheus and PromQL
- JavaScript
- Python
- YAML

## Sources Consulted
- Grafana k6 OpenTelemetry output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/opentelemetry/
- Grafana k6 HTTP Params documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-http/params/
- Grafana k6 built-in metrics documentation: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector Prometheus exporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The k6 command used the old experimental output name and a generic OTLP endpoint variable. Updated it to `--out opentelemetry` and `K6_OTEL_GRPC_EXPORTER_ENDPOINT`, matching current k6 documentation.
- The introduction overstated trace creation by saying every load test request shows up as a distributed trace. Adjusted wording because this depends on the backend accepting W3C Trace Context and emitting traces.
- The trace ID and span ID generator could theoretically emit all-zero IDs, which are invalid in W3C Trace Context. Updated it to retry if the generated value is all zeros.
- The Prometheus exporter example did not make metric names predictable for the later PromQL queries. Added `translation_strategy: "UnderscoreEscapingWithoutSuffixes"` to avoid type and unit suffix drift in the example.
- The Tempo TraceQL example used `duration` instead of the current `span:duration` intrinsic. Updated the query.
- The Tempo TraceQL example used `span.http.request.header.x_load_test`, but OpenTelemetry semantic conventions preserve the normalized header name as `x-load-test`, and TraceQL requires quoted attribute syntax for special characters. Updated it to `span.http.request.header."x-load-test"`.
- The PromQL example queried `k6_vus` with a non-existent `timestamp` label. Removed that label selector because the Prometheus query API already accepts an evaluation time.
- The PromQL P95 example treated `k6_http_req_duration` as a summary with a `quantile` label. Updated it to use `histogram_quantile()` over the histogram buckets.
- The request-rate query used `_total`, which no longer matches the example after disabling Prometheus type suffixes. Updated it to `rate(k6_http_reqs[1m])`.

## Review Notes
- The `trace_id` k6 tag is technically supported, but it creates very high-cardinality metrics during large tests. In production-scale load tests, prefer exemplars, trace links, or a lower-cardinality request/test grouping tag where possible.
- Querying `http.request.header."x-load-test"` requires the backend OpenTelemetry HTTP instrumentation to be configured to capture that request header; OpenTelemetry recommends explicit header capture configuration for security reasons.
