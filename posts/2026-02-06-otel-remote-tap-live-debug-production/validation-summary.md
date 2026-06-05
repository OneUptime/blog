# Validation Summary: How to Use the Remote Tap Processor to Live-Debug Production Telemetry Without

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Remote Tap processor (`remotetapprocessor`)
- OTLP receiver/exporter configuration
- WebSocket clients with `websocat`
- `jq` JSON filtering
- Kubernetes `kubectl port-forward`

## Sources Consulted
- OpenTelemetry Collector Contrib Remote Tap processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/README.md
- Remote Tap processor package docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/remotetapprocessor
- Remote Tap processor config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/config.go
- Remote Tap processor implementation source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/processor.go
- Remote Tap processor channel handling source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/remotetapprocessor/channelset.go
- OpenTelemetry Collector processors registry: https://opentelemetry.io/docs/collector/components/processor/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- `websocat` README: https://docs.rs/crate/websocat/latest/source/README.md
- `jq` manual for `select` and `any`: https://jqlang.org/manual/

## Issues Found
- The post said Remote Tap exposes a WebSocket or gRPC endpoint. The processor exposes a WebSocket endpoint, so the gRPC mention was removed.
- The post described `limit` as a simultaneous connection limit. The official config defines `limit` as tapped messages per second, so the YAML comments and safety guidance were corrected.
- The post claimed query-string filtering such as `?service.name=payment-service` and `?otel.status_code=ERROR`. The Remote Tap processor does not implement query-parameter filtering; it streams a rate-limited copy of telemetry passing through the processor. The examples were changed to client-side filtering with `jq`.
- The post used `curl -N http://localhost:12001/v1/traces` as a quick check. The processor endpoint is WebSocket-based, so the curl example was removed.
- The post implied zero overhead while idle. The processor does not buffer missed telemetry, but it remains in the pipeline and can still serialize rate-limited telemetry as implemented, so the wording was adjusted to avoid a zero-overhead claim.
- The practical workflow and script examples used path and query-filter URLs. They were updated to connect to the WebSocket endpoint and filter the received JSON stream locally.

## Review Notes
- The `remotetapprocessor` is currently documented as alpha for logs, metrics, and traces, and is available in the contrib and Kubernetes Collector distributions.
- The tap output is OpenTelemetry Collector pdata JSON. The exact shape depends on the signal and the Collector pdata JSON marshaler.
