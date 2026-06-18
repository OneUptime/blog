# Validation Summary: How to Use eBPF with OpenTelemetry for Kernel-Level Observability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry eBPF Instrumentation (OBI)
- Grafana Beyla
- eBPF
- BCC Python bindings
- Kubernetes DaemonSets and RBAC
- Linux capabilities
- OpenTelemetry Python metrics API

## Sources Consulted
- OpenTelemetry OBI Kubernetes setup: https://opentelemetry.io/docs/zero-code/obi/setup/kubernetes/
- OpenTelemetry OBI configuration options: https://opentelemetry.io/docs/zero-code/obi/configure/options/
- OpenTelemetry OBI export modes: https://opentelemetry.io/docs/zero-code/obi/configure/export-modes/
- OpenTelemetry OBI network metrics configuration: https://opentelemetry.io/docs/zero-code/obi/network/config/
- OpenTelemetry OBI announcement and project status: https://opentelemetry.io/blog/2025/obi-announcing-first-release/
- OpenTelemetry Python metrics instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- BCC reference guide: https://github.com/iovisor/bcc/blob/master/docs/reference_guide.md
- eBPF verifier documentation: https://docs.ebpf.io/linux/concepts/verifier/
- Linux capabilities manual: https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- The Kubernetes example used a non-current OBI image path and unsupported environment variables (`OTEL_EBPF_PROTOCOLS`, `OTEL_EBPF_SAMPLE_RATE`). Updated the example to use the documented OBI image, `OTEL_EBPF_CONFIG_PATH`, and an OBI YAML ConfigMap with OTLP export configuration.
- The Kubernetes example enabled Kubernetes metadata but did not include a service account or RBAC. Added minimal `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding` objects for pod, node, and service metadata reads.
- The custom TCP retransmission example was described as `bpftrace` syntax, but it is a BCC Python program. Corrected the description.
- The TCP retransmission example recorded `skc_dport` without converting it from network byte order. Updated the BPF code to use `ntohs()`.
- The DNS section claimed eBPF could capture every DNS lookup at the kernel level, while the example attaches uprobes to libc `getaddrinfo`. Reworded the section and metric description to accurately describe libc `getaddrinfo` latency measurement.
- The post stated that the Collector enriches eBPF spans by looking up source PIDs. Reworded this to attribute Kubernetes metadata enrichment to the eBPF agent using process and Kubernetes metadata.

## Review Notes
The BCC examples are illustrative and depend on kernel symbols, libc symbol availability, BCC installation, and sufficient privileges on the target host. OBI configuration and image tags change quickly; production deployments should pin a released image tag instead of using `main`.
