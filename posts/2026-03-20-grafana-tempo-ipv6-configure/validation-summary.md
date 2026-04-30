# Validation Summary: How to Configure Grafana Tempo with IPv6

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Grafana Tempo
- Grafana provisioning for the Tempo data source
- OpenTelemetry Collector
- OTLP over gRPC and HTTP
- TraceQL
- IPv6 URI literals
- Kubernetes Deployments

## Sources Consulted
- Grafana Tempo configuration: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo manifest reference: https://grafana.com/docs/tempo/latest/configuration/manifest/
- Grafana Tempo command-line flags: https://grafana.com/docs/tempo/latest/set-up-for-tracing/setup-tempo/command-line-flags/
- Grafana Tempo HTTP API: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana Tempo TraceQL reference: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/
- Grafana Tempo data source provisioning: https://grafana.com/docs/grafana/latest/datasources/tempo/configure-tempo-data-source/provision/
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP specification and JSON encoding rules: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry semantic conventions for general network attributes: https://opentelemetry.io/docs/specs/semconv/general/attributes/
- OpenTelemetry semantic conventions registry for network attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/network/
- RFC 3986 URI generic syntax: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The post used invalid IPv6 host examples such as `[2001:db8::tempo]`. I replaced them with valid IPv6 documentation literals such as `[2001:db8::1]` because bracketed URI hosts must be IPv6 literals under RFC 3986, and `2001:db8::/32` is the reserved documentation prefix from RFC 3849.
- The OpenTelemetry Collector snippet was incomplete because it referenced `receivers: [otlp]` and `processors: [batch]` without defining those components. I added `receivers.otlp` and `processors.batch`, which are required by the Collector configuration model.
- The Grafana provisioning snippet used `tracesToLogs`, while the current Grafana Tempo provisioning docs use `tracesToLogsV2`. I updated the key to the current form.
- The TraceQL examples used outdated or incorrect attributes such as `.net.peer.ip` and `.network.source.ip`, and mixed in noncanonical intrinsic syntax. I replaced them with current TraceQL and OpenTelemetry semantic-convention examples using `span.network.type`, `span.client.address`, `span:duration`, and `span:kind`.
- The Kubernetes Deployment manifest was invalid because `spec.template.metadata.labels` was missing, so the pod template did not match the Deployment selector. I added the required `app: tempo` label to the pod template.
- The trace-ingestion verification example sent an empty OTLP envelope (`"resourceSpans": []`), which does not actually create a trace and is discouraged by the OTLP spec. I replaced it with a valid OTLP/HTTP JSON trace payload and updated the follow-up query to search for the injected span through Tempo’s TraceQL search API.
- The Tempo startup command used `-config.file`; I updated it to `--config.file` to match the current Grafana Tempo command-line documentation and adjusted the `ss` verification note to reflect IPv6 listener output more accurately.

## Review Notes
- The examples are technically correct as of 2026-04-30 based on current Grafana Tempo, Grafana, and OpenTelemetry documentation.
- The Kubernetes example still uses `grafana/tempo:latest`, which is valid but not ideal for reproducible deployments. Pinning a specific Tempo version would make the guide more stable over time.
- The server `http_listen_address` and `grpc_listen_address` entries are left empty, while the OTLP receivers are explicitly bound on `[::]`. That is acceptable for this guide, but exact dual-stack behavior for the server listeners can still depend on host networking settings.
