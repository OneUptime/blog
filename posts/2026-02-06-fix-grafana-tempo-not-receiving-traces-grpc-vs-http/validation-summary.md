# Validation Summary: How to Fix Grafana Tempo Not Receiving Traces Because the Collector Uses

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Grafana Tempo
- Kubernetes Services and kubectl
- gRPC and HTTP transports
- Grafana Tempo Helm chart

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- OpenTelemetry Collector OTLP HTTP exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlphttpexporter
- OpenTelemetry telemetrygen package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen
- Grafana Tempo configuration documentation: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo OpenTelemetry Collector setup documentation: https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `otlphttp` as the HTTP exporter name. Current OpenTelemetry Collector documentation identifies `otlp_http` as the non-deprecated component name and states that `otlphttp` is a deprecated alias, so the HTTP exporter examples and summary were updated.
- The post used `otlp` as the gRPC exporter name without noting current naming. Current Collector documentation uses `otlp_grpc`, while older examples and Grafana docs may still show `otlp`, so the examples were updated to `otlp_grpc` and a compatibility note was added.
- The gRPC connectivity test used an HTTP `wget --spider` probe against port 4317. That can produce misleading results for a gRPC endpoint, so it was replaced with a TCP reachability check using `nc -vz`, with `grpcurl` kept only for endpoints that support reflection.
- The HTTP connectivity test used `wget` for a GET request to `/v1/traces`. OTLP/HTTP trace export uses POST, so the example was changed to `curl -i` to make the expected HTTP status visible.
- The test trace example used `otel-cli` flags that were not verified against official OpenTelemetry documentation. It was replaced with `telemetrygen traces --otlp-endpoint ... --otlp-insecure --traces 1`, which is documented in the OpenTelemetry Collector contrib tooling, and the Tempo search query was updated to look for `service.name="telemetrygen"`.

## Review Notes
The Tempo receiver configuration and Kubernetes Service examples are technically sound for exposing OTLP gRPC on 4317 and OTLP HTTP on 4318. The Helm values example is plausible for the Grafana Tempo chart, but chart keys can vary between the single-binary and distributed charts, so users should still compare against the values for the exact chart they deploy.
