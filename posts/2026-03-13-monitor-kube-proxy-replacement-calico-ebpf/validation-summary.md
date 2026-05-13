# Validation Summary: Monitor Kube-Proxy Replacement with Calico eBPF

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Calico (Tigera operator, Felix, calicoctl)
- eBPF data plane / BPF kube-proxy replacement
- Kubernetes (kubectl, Installation CRD, DaemonSet patching, kubectl debug node)
- bpftool, iptables-save, hping3
- Prometheus / PrometheusRule alerting
- nicolaka/netshoot debug image

## Sources Consulted
- Calico documentation — Enabling eBPF: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation — Install eBPF: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico — Monitor component metrics (Felix Prometheus metric names): https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Tigera Operator `Installation` API reference (operator.tigera.io/v1, `spec.calicoNetwork`)
- projectcalico/calico GitHub repo (calico-node `-felix-live` / `-felix-ready` probes)

## Issues Found
1. **Kernel version requirement was too low.** The post stated Linux 5.3+ as the minimum kernel for Calico eBPF kube-proxy replacement. Calico's current documented requirement is **5.10+** (with backports on RHEL 4.18.0-305+). Updated both the Prerequisites bullet and the Step 1 comment to say `5.10+`.
2. **`kubeAPIServer` patch on the `Installation` resource is fabricated.** The `operator.tigera.io/v1` `Installation` CRD has no `spec.calicoNetwork.kubeAPIServer.host/port` field. The documented mechanism for telling Calico's eBPF data plane how to reach the API server is a `kubernetes-services-endpoint` ConfigMap in the `tigera-operator` namespace with `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT` data keys. Replaced the bogus `kubectl patch installation` command with the correct `kubectl create configmap -n tigera-operator kubernetes-services-endpoint ...` command.
3. **`felix_int_dataplane_failures_total` had an incorrect `_total` suffix.** Calico's Felix exporter documents this counter as `felix_int_dataplane_failures` (no `_total`). Updated the `CalicoEBPFDataplaneFailed` alert expression accordingly.
4. **`felix_bpf_enabled` is not a real Felix metric.** Felix does not export a boolean "BPF enabled" gauge. Replaced the `CalicoNodeNotEBPFReady` alert expression with `absent(felix_bpf_num_endpoints)` — `felix_bpf_num_endpoints` is a real Felix BPF-mode metric, and `absent()` fires when no series are present (i.e., no node is reporting BPF endpoint metrics). The alert annotation was rewritten to match the new semantics (cluster-wide absence rather than per-node `!= 1`).

## Review Notes
- `linuxDataplane: BPF` on the `Installation` resource is correct.
- `calico-node -felix-live` is a valid health-check sub-command for the calico-node binary.
- `bpftool prog list`, `kubectl debug node/...`, and the `nicolaka/netshoot` debug image are all standard.
- The `hping3 ... | grep "round-trip"` pipeline is a rough latency probe; hping3's output uses `rtt` lines, but `grep` patterns are illustrative rather than load-bearing so left as-is per "minimal fixes" guidance.
- The `CalicoNodeNotEBPFReady` alert is now cluster-scope (loses per-node granularity). Achieving true per-node detection from Felix metrics requires picking a BPF-only metric and joining against the Felix instance list — out of scope for a minimal correctness fix, worth a follow-up if per-node alerting is desired.
- The kube-proxy disable via a non-existent `nodeSelector` value (`non-calico=true`) is a legitimate technique; the Calico docs also discuss simply scaling the DaemonSet to zero or deleting it — either approach is fine.
