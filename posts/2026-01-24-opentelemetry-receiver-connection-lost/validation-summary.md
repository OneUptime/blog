# Validation Summary: How to Fix 'Receiver Connection Lost' Errors

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- OpenTelemetry Collector (contrib distribution)
- OTLP receiver/exporter (gRPC + HTTP)
- OpenTelemetry JavaScript/Node.js SDK (`@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/sdk-trace-base`, `@opentelemetry/api`)
- gRPC (`@grpc/grpc-js`, keepalive, health check)
- Kubernetes (Deployment, Service, headless Service, PodDisruptionBudget)
- AWS ALB / GKE BackendConfig for gRPC load balancing
- CLI tooling: `nc`, `grpcurl`, `curl`, `nslookup`, `docker logs`, `kubectl logs`

## Sources Consulted
- OpenTelemetry Collector Resiliency docs — https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector Troubleshooting docs — https://opentelemetry.io/docs/collector/troubleshooting/
- zPages extension README — https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector configuration references (SigNoz) — https://signoz.io/docs/opentelemetry-collection-agents/opentelemetry-collector/configuration/

## Issues Found
1. **Invalid `retry_on_failure` processor (collector config).** The post defined `retry_on_failure` as a top-level entry under `processors:`. There is no `retry_on_failure` processor in the OpenTelemetry Collector — retry is an exporter-level setting (`retry_on_failure` on the exporter, which the post already configures correctly on the `otlp` exporter). As written, the block was both invalid (would fail component validation on startup) and unused (it was never referenced in any pipeline). **Fix:** removed the bogus processor block. Retry remains correctly configured on the exporter.

2. **Incorrect comment on the `zpages` extension.** The comment labeled `zpages` as "Prometheus metrics," which is wrong. zPages is an in-process HTTP debugging interface (tracez, pipelinez, extensionz, etc.); collector Prometheus metrics are exposed separately on port 8888. **Fix:** corrected the comment to describe zPages as a live in-process debugging interface.

## Review Notes
- The exporter `retry_on_failure`, `sending_queue`, `memory_limiter`, `batch`, OTLP receiver keepalive/`enforcement_policy`, and `health_check` extension settings are all valid current configuration fields.
- The Node.js SDK code (`OTLPTraceExporter`, `BatchSpanProcessor` options, `diag` logging) uses current, non-deprecated APIs.
- The gRPC exporter `url: 'grpc://otel-collector:4317'` uses a non-standard scheme; the OTLP/gRPC exporter typically expects `http://`/`https://` or a bare `host:port`. In practice the host:port is parsed and TLS is governed by the `credentials` option (here `createInsecure()`), so the example still works. Left as-is since it is functional.
- The CLI commands (`nc -zv`, `grpcurl -plaintext`, `curl`, `nslookup`) and listed collector metric names (`otelcol_receiver_accepted_spans`, `otelcol_receiver_refused_spans`, `otelcol_exporter_queue_size`, `otelcol_process_memory_rss`) are accurate.
- The `health_check` extension's `check_collector_pipeline` is a legacy sub-feature still accepted by the contrib collector; it functions but may be deprecated in future releases.
- Kubernetes manifests (Deployment, headless Service, BackendConfig, PDB, `appProtocol: grpc`) are valid; using `image: ...:latest` is discouraged for production but is a stylistic choice, not an error.
