# Validation Summary: How to Export Grafana Alloy `beyla.ebpf` Traces to Tempo

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered

- Grafana Alloy
- Grafana Beyla and eBPF auto-instrumentation
- Grafana Tempo
- OpenTelemetry and OTLP
- OTLP over gRPC and HTTP
- Prometheus scraping and remote write
- Kubernetes service discovery, Services, RBAC, and Pod security
- OpenTelemetry trace sampling

## Sources Consulted

- [Grafana Alloy `beyla.ebpf` component reference](https://grafana.com/docs/alloy/v1.19/reference/components/beyla/beyla.ebpf/)
- [Grafana Alloy v1.19.2 `beyla.ebpf` argument schema](https://github.com/grafana/alloy/blob/v1.19.2/internal/component/beyla/ebpf/internal/config/args.go#L9-L32)
- [Grafana Alloy v1.19.2 `beyla.ebpf` validation logic](https://github.com/grafana/alloy/blob/v1.19.2/internal/component/beyla/ebpf/internal/config/validation.go#L110-L139)
- [Grafana Alloy v1.19.2 trace-output validation tests](https://github.com/grafana/alloy/blob/v1.19.2/internal/component/beyla/ebpf/internal/config/validation_test.go#L668-L715)
- [Grafana Alloy OTLP/gRPC exporter](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlp/)
- [Grafana Alloy OTLP/HTTP exporter](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/)
- [Grafana Alloy batch processor](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.batch/)
- [Grafana Alloy Prometheus scrape component](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/)
- [Grafana Tempo distributor configuration](https://grafana.com/docs/tempo/latest/configuration/#distributor)
- [Grafana Tempo with Grafana Alloy](https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/grafana-alloy/)
- [Grafana Tempo OpenTelemetry Collector setup and receiver binding guidance](https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/otel-collector/)
- [Grafana Tempo TLS configuration](https://grafana.com/docs/tempo/latest/configuration/network/tls/)
- [Grafana Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Grafana Beyla Kubernetes quickstart and RBAC](https://grafana.com/docs/beyla/latest/quickstart/kubernetes/)
- [Grafana Beyla security, permissions, and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Grafana Beyla trace sampling](https://grafana.com/docs/beyla/latest/configure/sample-traces/)
- [Grafana Beyla v3.28.0 trace-printer implementation](https://github.com/grafana/beyla/blob/v3.28.0/vendor/go.opentelemetry.io/obi/pkg/export/debug/debug.go#L46-L170)
- [Kubernetes Service port and target port behavior](https://kubernetes.io/docs/concepts/services-networking/service/)
- [OpenTelemetry tracing SDK sampling specification](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)

## Issues Found

- The post said that `beyla.ebpf.output` is always syntactically required. The published component page says this too, but the released Alloy v1.19.2 schema marks the block optional and requires it only when global trace instrumentations or a sampler are explicitly configured. Reworded the post to describe the implementation accurately while retaining the central requirement that `output.traces` needs a consumer for trace export.
- The OTLP/gRPC security wording described `insecure = true` by intended environment rather than behavior. Clarified that it disables TLS and should be used only where clear-text traffic is permitted.
- The post said that a Kubernetes Service must expose the same protocol and port as Tempo. A Service can map its `port` to a different `targetPort`, and gRPC versus HTTP is an application transport over TCP. Reworded this to require the Alloy endpoint's Service port to route to the receiver's listening port using the matching OTLP transport.
- The rollout example used `trace_printer = "counter"` as a live, low-volume proof. In the embedded Beyla v3.28.0 implementation, the counter accumulates spans and prints its total only when its input closes, normally during shutdown. Changed the example to `trace_printer = "text"`, which provides live per-span output at controlled volume.
- The validation checklist said text trace printing proves spans leave the Beyla child process. The printer only proves that the subprocess intercepted requests and generated spans; it does not validate the separate child-to-Alloy OTLP handoff. Corrected the checklist boundary.
- The sampling guidance implied that omitting ratio sampling guarantees an every-request baseline. Beyla defaults to `parentbased_always_on`, which can drop spans with an unsampled parent. Added `always_on` guidance for a baseline that does not drop spans at the Beyla sampler.

## Review Notes

- The Alloy snippets were combined with their referenced components and passed `grafana/alloy:v1.19.2 validate` successfully, including both an empty `output {}` block and omission of `output` when no global trace settings are present.
- Alloy v1.19 currently embeds Beyla v3.28.0, while the standalone Beyla documentation is newer. The post's warning to pin Alloy and use its component reference for supported Alloy fields is therefore important.
- The OpenTelemetry specification now marks the original `TraceIdRatioBased` sampler as deprecated in favor of newer probability sampling, but `traceidratio` remains a supported and documented value in embedded Beyla v3.28.0. Recheck this setting when upgrading Alloy.
- `otelcol_exporter_send_failed_spans_total` counts failed send attempts, including attempts that may later succeed after retry; it should be interpreted with sent-span and queue metrics rather than as a permanent-loss counter.
