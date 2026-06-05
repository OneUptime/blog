# Validation Summary: How to Correlate k6 Load Test Results with OpenTelemetry Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- OpenTelemetry
- OpenTelemetry Collector
- W3C Trace Context
- Jaeger-compatible trace querying
- Python OpenTelemetry API
- Bash, curl, jq

## Sources Consulted
- Grafana k6 `instrumentHTTP` documentation: https://grafana.com/docs/k6/latest/javascript-api/jslib/http-instrumentation-tempo/instrumenthttp/
- Grafana k6 OpenTelemetry output documentation: https://grafana.com/docs/k6/latest/results-output/real-time/opentelemetry/
- Grafana k6 options reference for `--traces-output`, `--out`, `--tag`, and `--summary-export`: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 HTTP `Params` documentation for request headers and tags: https://grafana.com/docs/k6/latest/javascript-api/k6-http/params/
- Grafana k6 results output and custom summary documentation: https://grafana.com/docs/k6/latest/get-started/results-output/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OneUptime OpenTelemetry ingestion documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- Jaeger API documentation: https://www.jaegertracing.io/docs/2.0/apis/

## Issues Found
- The post instructed readers to build k6 with `github.com/grafana/xk6-distributed-tracing` and then used `k6/experimental/tracing`. Current Grafana k6 docs show the HTTP tracing helper under the `http-instrumentation-tempo` jslib module, so the setup and import were updated.
- The post used `--out experimental-opentelemetry` as if it exported traces. Current k6 docs use `--out opentelemetry` for metrics and `--traces-output=otel...` for traces, so the run commands were corrected.
- The Collector example only had a traces pipeline while the k6 command exported metrics too. A metrics pipeline was added so both telemetry types can be received and forwarded.
- The Collector `attributes` processor added `test.source` to everything passing through the Collector, including application telemetry. The post now sets the k6 source tag/header at the request level and records it on application spans.
- The trace query example described an OTLP-compatible backend query. OTLP is an ingestion protocol, not a standard query API, so the example was changed to a Jaeger-compatible query and the backend-specific nature of trace queries is now stated.
- The CI script read p95 from `--out json=results.json`, which is a streaming output format rather than the end-of-test summary object shown in the `jq` expression. It now uses `--summary-export results.json`.

## Review Notes
k6 is not installed in the local review environment, so the snippets were not executed. The commands, configuration, and APIs were checked against current official documentation instead.
