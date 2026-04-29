# Validation Summary: How to Monitor Microservice Communication over IPv4 Networks

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Prometheus (node_exporter, scrape config, alerting rules, promtool)
- Node.js with `prom-client` library (Histogram, Counter)
- OpenTelemetry JS (`@opentelemetry/sdk-node`, OTLP HTTP exporter, HTTP instrumentation)
- Jaeger (distributed tracing backend, OTLP ingestion)
- Istio service mesh (Telemetry API, Prometheus integration)
- Kubernetes (`kubectl exec`)
- Linux network tooling (`ss`, `awk`, `cut`, `watch`)

## Sources Consulted
- Prometheus node_exporter metric reference and Robust Perception write-up on netdev/netstat collectors
- promtool CLI reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- OpenTelemetry JS exporter-jaeger README (deprecation notice): https://github.com/open-telemetry/opentelemetry-js/tree/main/packages/opentelemetry-exporter-jaeger
- Jaeger deployment docs (OTLP ingestion on 4317/gRPC and 4318/HTTP): https://www.jaegertracing.io/docs/latest/deployment/
- Istio Telemetry v1 GA announcement: https://istio.io/latest/blog/2024/v1-apis/
- prom-client GitHub README (`startTimer` deferred-labels pattern): https://github.com/siimon/prom-client
- iproute2 `ss(8)` man page (state filters, `-tn` flags)

## Issues Found
1. **Deprecated OpenTelemetry Jaeger exporter.** The original code used `@opentelemetry/exporter-jaeger` and the legacy Jaeger collector endpoint `http://10.0.0.20:14268/api/traces`. That package was deprecated in March 2024 and Jaeger now accepts OTLP natively. Replaced the import with `@opentelemetry/exporter-trace-otlp-http` (`OTLPTraceExporter`) and updated the endpoint to `http://10.0.0.20:4318/v1/traces` (Jaeger's OTLP/HTTP port).
2. **Missing server URL in `promtool query instant`.** The original command piped only an expression to `promtool query instant`, which would have failed because the subcommand requires a positional `<server>` argument before `<expr>`. Added `http://localhost:9090` between the subcommand and the PromQL expression so the command works inside the Istio Prometheus pod.

## Review Notes
- The Istio Telemetry resource uses `apiVersion: telemetry.istio.io/v1alpha1`. This is still supported, but `telemetry.istio.io/v1` became GA in Istio 1.22 and is now the preferred apiVersion. Left as-is since both work and the schema is identical.
- The "Alertmanager Rules" section actually defines Prometheus alerting rules (loaded by the Prometheus server), not Alertmanager configuration (routing/silencing). The YAML itself is correct; only the section heading is loose terminology. Left untouched to preserve author's voice.
- All `node_netstat_*` and `node_network_*` metric names match what `node_exporter` exposes via the `netstat` and `netdev` collectors.
- The `prom-client` `startTimer(labels)` pattern with deferred labels at `end()` time is valid and matches the library's documented API.
- The `ss` pipelines work as written; `ss -tn` and `ss -tn state established` both emit a header row, so `NR>1` correctly skips it in the second example.
