# Validation Summary: How to Reduce Beyla CPU and Memory Usage with Narrower Discovery, Filters, and Trace Sampling

## Status

validated

## Post Type

Technical optimization guide

## Technologies Covered

- Grafana Beyla
- eBPF application and network instrumentation
- OpenTelemetry metrics, traces, OTLP export, and head sampling
- Grafana Alloy
- Kubernetes metadata informers and kubelet/cAdvisor resource metrics
- Prometheus metrics

## Sources Consulted

- [Grafana Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Grafana Beyla routes decorator](https://grafana.com/docs/beyla/latest/configure/routes-decorator/)
- [Grafana Beyla metric and trace filtering](https://grafana.com/docs/beyla/latest/configure/filter-metrics-traces/)
- [Grafana Beyla OpenTelemetry data export](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Grafana Beyla trace sampling](https://grafana.com/docs/beyla/latest/configure/sample-traces/)
- [Grafana Beyla instrumentation, context propagation, payload extraction, and buffers](https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/)
- [Grafana Beyla Kubernetes metadata attributes](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/#kubernetes-decorator)
- [Grafana Beyla network configuration](https://grafana.com/docs/beyla/latest/network/config/)
- [Grafana Beyla exported and internal metrics](https://grafana.com/docs/beyla/latest/metrics/)
- [Grafana Alloy `beyla.ebpf` resource metrics](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/#resource-metrics)
- [Kubernetes component metrics reference](https://kubernetes.io/docs/reference/instrumentation/metrics/)
- [OpenTelemetry OTLP exporter endpoint specification](https://opentelemetry.io/docs/specs/otel/protocol/exporter/)
- [Grafana Beyla v3.33.0 source](https://github.com/grafana/beyla/tree/v3.33.0)

## Issues Found

- The metrics example placed `features` under `otel_metrics_export`. That compatibility field is deprecated in current Beyla source. Moved it to the current top-level `metrics.features` block while leaving exporter-specific `instrumentations` under `otel_metrics_export`.
- The route example used `routes.ignored_patterns` and `routes.ignore_mode`. These fields still run in Beyla v3.33 but are deprecated in current source in favor of attribute filtering. Removed the deprecated fields, retained `routes.unmatched: low-cardinality`, and used the existing singular `filter.application.url.path.not_match` configuration for dropping health and metrics paths.
- The protocol-selection paragraph implied that exporter `instrumentations` also controls HTTP payload detectors. Clarified that GraphQL, Elasticsearch/OpenSearch, and AWS payload detectors are configured separately under `ebpf.http`, and distinguished them from opt-in HTTP header/body enrichment.
- The sampling explanation implied that a parent-based sampler alone guarantees downstream consistency. Clarified that it respects a parent only when Beyla captures that context, noted the relevant defaults for incoming `traceparent` processing and Beyla propagation, and documented the gRPC/HTTP/2 propagation limitation.
- The network paragraph described CIDRs as a collection restriction. Corrected it because `network.cidrs` decorates flows with `src.cidr` and `dst.cidr`; it does not filter flows. Interface and protocol settings are the actual collection/filtering controls discussed there.

## Review Notes

- Reviewed against the current Grafana Beyla v3.33.x documentation and v3.33.0 source. No specific Beyla version is pinned in the post, so future `latest` changes may require another review.
- The signal-specific OTLP/HTTP endpoints correctly include `/v1/metrics` and `/v1/traces`; the protocol and sampler values are valid.
- `container_cpu_usage_seconds_total` is cumulative and should be evaluated with a rate or delta over the comparison window.
- All six official documentation links in the post resolved to the intended current pages, including both fragment anchors.
