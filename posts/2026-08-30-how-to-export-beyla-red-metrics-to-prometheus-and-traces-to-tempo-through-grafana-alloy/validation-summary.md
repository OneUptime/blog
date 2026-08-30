# Validation Summary: How to Export Beyla RED Metrics to Prometheus and Traces to Tempo Through Grafana Alloy

## Status
validated

## Post Type
Technical tutorial and configuration guide

## Technologies Covered

- Grafana Alloy
- Grafana Beyla and eBPF auto-instrumentation
- Prometheus scraping and remote write
- Grafana Mimir and Grafana Cloud Metrics
- Grafana Tempo
- OpenTelemetry Protocol over HTTP and gRPC
- W3C Trace Context
- Kubernetes discovery, RBAC, Linux capabilities, and AppArmor

## Sources Consulted

- Grafana Alloy `beyla.ebpf` component reference: https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/
- Grafana Beyla instrumentation controls, including incoming `traceparent` handling: https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/#track-request-headers
- Grafana Beyla exported metrics: https://grafana.com/docs/beyla/latest/metrics/
- Grafana Beyla Kubernetes deployment and metadata permissions: https://grafana.com/docs/beyla/latest/setup/kubernetes/#configuring-kubernetes-metadata-decoration
- Grafana Beyla security, permissions, and capabilities: https://grafana.com/docs/beyla/latest/security/
- Grafana Alloy `prometheus.scrape` component reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/
- Grafana Alloy `prometheus.remote_write` component reference: https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/
- Prometheus configuration reference for `honor_labels`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config
- Prometheus command-line reference for `--web.enable-remote-write-receiver`: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus storage documentation for the `/api/v1/write` receiver: https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations
- Grafana Mimir HTTP API for its `/api/v1/push` remote-write endpoint: https://grafana.com/docs/mimir/latest/references/http-api/#remote-write
- Grafana Cloud Prometheus integration guide for stack-specific `/api/prom/push` URLs: https://grafana.com/docs/grafana-cloud/observe-and-act/send-data/metrics/metrics-prometheus/prometheus-config-examples/integration-guide/
- Grafana Alloy batch processor reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.batch/
- Grafana Alloy OTLP/HTTP exporter reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/
- Grafana Alloy OTLP/gRPC exporter reference: https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlp/
- Grafana Tempo OpenTelemetry Collector setup: https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- W3C Trace Context `traceparent` specification: https://www.w3.org/TR/trace-context/#traceparent-header
- Grafana Tempo TraceQL editor documentation for TraceID lookup: https://grafana.com/docs/grafana/latest/datasources/tempo/query-editor/traceql-editor/#query-by-traceid

## Issues Found

- The configuration described the namespace selector as selecting HTTP and gRPC services. The selector actually discovers services by Kubernetes namespace, while the `instrumentations` lists restrict collected protocols. The lead-in now makes that distinction.
- The fixed TraceID verification was unreliable for non-Go services because `ebpf.track_request_headers` defaults to `false`. Added `track_request_headers = true` to the `ebpf` block and explained why it is needed. The supplied `traceparent` value itself is valid W3C Trace Context syntax.
- The remote-write guidance implied that `/api/v1/write` was a common path for all named backends. Replaced it with the correct backend-specific paths: `/api/v1/write` for Prometheus's enabled receiver, `/api/v1/push` for Grafana Mimir, and the stack-specific `/api/prom/push` URL for Grafana Cloud Metrics.
- The post implied that the `application` feature exports separate rate, error, and duration instruments. Clarified that Beyla exports request-duration histograms and that their count series and status labels are used to calculate rate and errors.
- The metric verification text attributed the names in this configuration to a selected semantic-convention format, but no such selector is configured. Replaced that statement with the current HTTP and RPC request-duration series patterns and retained the advice to check the embedded Beyla version.
- The component-health instruction could imply that health proves delivery. Clarified that it catches configuration errors but does not prove successful backend export.
- The outage guidance treated the batch processor as an outage buffer. Replaced it with guidance for the OTLP exporter's sending queue and retry window, the Prometheus remote-write WAL retention and storage, and the remote-write queue's catch-up throughput.

## Review Notes

- The corrected Alloy configuration was validated successfully with the official `grafana/alloy:latest` container, which resolved to Alloy v1.19.2 on 2026-08-30. The current component reference reports embedded Beyla v3.28.0.
- The Alloy component fields, trace and metric wiring, `honor_labels` behavior, OTLP signal paths, Tempo ports, Kubernetes prerequisites, and supplied `curl` syntax are otherwise current and correct.
- Prometheus's built-in remote-write receiver is officially intended for specific low-volume use cases rather than as a general replacement for scrape-based ingestion.
- Recent Tempo releases bind OTLP receivers to localhost by default unless configured otherwise; the post's requirement that the receiver be enabled and reachable covers the need to bind it to a Service-accessible address in Kubernetes.
- All five links in the post's Official Documentation section returned HTTP 200 during validation.
