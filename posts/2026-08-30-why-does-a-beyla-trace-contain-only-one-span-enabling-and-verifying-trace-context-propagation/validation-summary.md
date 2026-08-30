# Validation Summary: Beyla Traces Have One Span? Enable Trace Context Propagation

## Status
validated

## Post Type
Troubleshooting and configuration guide

## Technologies Covered

- Grafana Beyla
- Grafana Alloy
- Grafana Tempo
- eBPF and Linux kernel capabilities
- OpenTelemetry and OTLP/HTTP
- W3C Trace Context
- Kubernetes DaemonSets, host networking, and DNS
- HTTP/1.1, HTTP/2, gRPC, TLS, HPACK, and TCP options

## Sources Consulted

- [Grafana Beyla: Distributed traces](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [Grafana Beyla: Controlling instrumentation](https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/)
- [Grafana Beyla: Export data](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Grafana Beyla: Global configuration and trace-printer formats](https://grafana.com/docs/beyla/latest/configure/options/)
- [Grafana Alloy: `beyla.ebpf`](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/)
- [Grafana Beyla v3.33.0 DaemonSet template](https://github.com/grafana/beyla/blob/v3.33.0/charts/beyla/templates/daemon-set.yaml)
- [Grafana Beyla v3.16.0 release notes](https://github.com/grafana/beyla/releases/tag/v3.16.0)
- [OpenTelemetry eBPF Instrumentation: Context-propagation architecture](https://github.com/open-telemetry/opentelemetry-ebpf-instrumentation/blob/main/devdocs/context-propagation.md)
- [OpenTelemetry eBPF Instrumentation: Support matrix](https://github.com/open-telemetry/opentelemetry-ebpf-instrumentation/blob/main/SUPPORT_MATRIX.md)
- [W3C Trace Context Recommendation](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry tracing SDK specification: Sampling](https://opentelemetry.io/docs/specs/otel/trace/sdk/#sampling)
- [Grafana Tempo: Service graphs](https://grafana.com/docs/tempo/latest/metrics-from-traces/service_graphs/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)

## Issues Found

- The introduction incorrectly implied that the entry request must already contain a `traceparent` header. Instrumentation can start a new trace when no parent arrives. The text now describes the actual requirement at each service-to-service hop: propagate context and continue the same trace ID and parent relationship.
- The propagation-mode description was outdated. Modern Beyla uses `tcp` for custom TCP option kind 25, accepts `headers,tcp`, treats `all` as the combined mode, and accepts legacy `ip` only as a no-op compatibility value. The mode list and Alloy comparison were corrected.
- The post described packet propagation as Traffic Control/IP-option encoding and required Cilium TC chaining. That implementation was removed; current propagation uses `sk_msg`/`BPF_SOCK_OPS` with HTTP headers or TCP options. References to TC-based propagation and Cilium chaining were removed, and the transport description was corrected.
- The blanket statement that generic propagation does not support HTTP/2 or gRPC was outdated. Current Beyla can inject and extract W3C context in plaintext HPACK header blocks. The post now explains the TLS limitation, why TCP-option propagation is unsuitable for multiplexed streams, and the Linux 5.17 requirement for extracting Huffman-encoded `traceparent` values.
- The Go propagation discussion omitted the `CAP_SYS_ADMIN` requirement for the `bpf_probe_write_user` path and did not qualify the kernel-lockdown restriction by affected kernel versions. The capability and Linux 5.14/backported 5.10-series qualifications were added while retaining the Secure Boot caveat.
- The DaemonSet requirements were incorrectly scoped only to `context_propagation: all` and omitted `hostPID`. The section now applies to generic network propagation, includes process discovery, explains when `ClusterFirstWithHostNet` is needed, correctly describes `NET_ADMIN` as supporting header/TCP-option injection, and records the `SYS_ADMIN` requirement for cross-namespace socket backfill.
- The hop-by-hop checklist assumed that every propagation mode produces an HTTP header and treated missing inbound tracking as the only possible reason for a changed trace ID. It now distinguishes HTTP-header and TCP-option paths and accounts for intermediaries or security boundaries that drop or restart context.
- The curl target was an illustrative hostname but was not labeled as such, and repeatedly reusing the fixed trace ID could merge separate diagnostic requests. The text now tells readers to replace the hostname, send a single diagnostic request, and choose a fresh valid trace ID for repeated tests.

## Review Notes

The YAML hierarchy, OTLP/HTTP endpoint path and protocol, `curl` syntax, W3C field lengths and sampled flag, kernel-lockdown command, root `trace_printer: text` setting, parent-chain expectations, sampling guidance, and `service.name` guidance were verified as correct.

At review time, some rendered Grafana Beyla `latest` pages still contained older `ip`/Traffic Control wording and said HTTP/2 and gRPC were unsupported, despite the current Beyla implementation, release notes, Alloy reference, and upstream OpenTelemetry eBPF documentation reflecting TCP-option and HPACK propagation. The corrections follow the current implementation and upstream support matrix.
