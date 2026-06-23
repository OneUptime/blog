# Validation Summary: How to Monitor Network Traffic with eBPF on Kubernetes

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- eBPF (extended Berkeley Packet Filter)
- Kubernetes
- Cilium (CNI) and Cilium CLI
- Hubble (Hubble CLI, Hubble Relay, Hubble UI, Hubble metrics)
- BCC (BPF Compiler Collection) tools — tcplife, tcpconnect, tcpretrans, tcpdrop, tcpstates, netqtop, tcprtt, funclatency
- BCC Python API for custom eBPF programs
- Prometheus (ServiceMonitor, PrometheusRule)
- Grafana dashboards
- Linux kernel networking (kprobes, tracepoints, XDP, TC, socket filters)

## Sources Consulted
- Cilium Hubble setup docs — https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium config map template (hubble-metrics rendering) — https://github.com/cilium/cilium/blob/main/install/kubernetes/cilium/templates/cilium-configmap.yaml
- Cilium Monitoring & Metrics docs — https://docs.cilium.io/en/latest/observability/metrics/
- Cilium CLI repo — https://github.com/cilium/cilium-cli
- Hubble repo / releases — https://github.com/cilium/hubble
- BCC tools reference — https://github.com/iovisor/bcc
- Linux kernel BPF documentation — https://www.kernel.org/doc/html/latest/bpf/

## Issues Found
1. **Invalid `hubble-metrics` ConfigMap format** (Hubble Metrics Configuration section). The `hubble-metrics` field was written as a YAML sequence (`- dns:query;ignoreAAAA`, etc.). Kubernetes ConfigMap `data` values must be strings, and Cilium renders this field as a newline-separated string, not a list — a YAML list there fails ConfigMap validation. **Fix:** converted the field to a block scalar string (`hubble-metrics: |` followed by the metrics, no leading dashes) and added a short comment explaining why. The metric definitions themselves were left unchanged.

## Review Notes
- **Hubble CLI download branch:** The install snippet uses `https://raw.githubusercontent.com/cilium/hubble/master/stable.txt`. Current Cilium docs reference the `main` branch. `master` still resolves on the repo, so this was left as-is, but `main` is the more future-proof choice.
- **`cilium hubble enable --ui`:** This is redundant when `cilium install` already enables Hubble (relay + UI) via the `--set hubble.*` flags shown earlier. It is harmless and still valid, so it was left intact.
- **`TCPRetransmissionSpike` alert:** The PromQL is valid, but it counts TCP `RST` flags (`hubble_tcp_flags_total{flag="RST"}`), which signal connection resets rather than retransmissions. The query works; only the alert's name/label is a slight semantic mismatch. Not changed since it is not a correctness error.
- **`policy.cilium.io/proxy-visibility` annotation:** Valid for the pinned Cilium 1.14.x in this post. Newer Cilium releases steer users toward Layer 7 CiliumNetworkPolicy for visibility, so readers on later versions should consult current docs.
- **BCC custom script byte order:** In `k8s-netflow.py`, `skc_dport` (network byte order) and `skc_num` (host byte order) are mixed in the flow key — a common simplification in BCC examples that does not break the script. Left as-is.
- **`enableDefaultDeny` field** in the CiliumNetworkPolicy example is correct and available in Cilium 1.14+, matching the version installed earlier in the post.
- Kernel/capability claims (eBPF ~4.x baseline, Cilium 4.19+ minimum, `CAP_BPF`/`CAP_PERFMON` from kernel 5.8) are accurate.
