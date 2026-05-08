# Validation Summary: Fixing Single-Stream Performance Issues in Cilium

## Status
validated

## Post Type
Technical tuning guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF/BPF maps
- Linux networking, IRQ affinity, RPS, TCP sysctls
- iperf3

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium troubleshooting guide for conntrack GC: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium agent command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent/
- Cilium v1.19.3 Helm values source: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium v1.14.7 Helm values source: https://raw.githubusercontent.com/cilium/cilium/v1.14.7/install/kubernetes/cilium/values.yaml

## Issues Found
- The native routing example used `--set tunnel=disabled`, which is deprecated in current Cilium Helm values. Removed it and kept `routingMode=native`, which is the documented Helm value for native routing.
- The initial routing-mode check grepped for `tunnel`. Updated it to check `routing-mode`, matching the native routing configuration being changed.
- The BPF conntrack map Helm values used `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`, which are not the chart value names. Updated them to `bpf.ctTcpMax` and `bpf.ctAnyMax`, and adjusted the example sizes so they actually increase the common defaults while keeping the NAT table within Cilium's documented limit.
- The conntrack tuning example described a garbage collection interval but used a nonexistent/incorrect Helm value for TCP established timeout. Replaced it with `conntrackGCInterval=5m0s`, the Helm value that maps to Cilium's conntrack GC interval setting.
- The verification examples used `cilium status --verbose` and `DatapathMode` checks that do not match the documented Cilium agent status/config output for these settings. Updated host-routing verification to run `cilium-dbg status` in the Cilium DaemonSet and native-routing verification to check `routing-mode`.
- The single-stream/core explanation and performance improvement percentages were too absolute. Softened the wording to reflect typical receive queue/core behavior and to recommend measuring improvement per change.

## Review Notes
The remaining Linux tuning examples are syntactically valid, but the exact IRQ mask, RPS mask, NIC name, ring sizes, and TCP settings are hardware- and kernel-dependent. Operators should benchmark and apply them per node type rather than treating the numeric values as universal defaults.
