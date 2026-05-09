# Validation Summary: Tuning Cilium Performance and Scalability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Hubble
- eBPF and BPF maps
- Prometheus and Grafana
- iperf3 and netperf

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes Without kube-proxy guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium eBPF Maps documentation: https://docs.cilium.io/en/stable/network/ebpf/maps/
- Cilium Limiting Identity-Relevant Labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command reference for `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html

## Issues Found
- The datapath tuning example used `--set tunnel=disabled`, which is not the current Helm value for selecting native routing. Removed it and kept `--set routingMode=native`, which is the current documented setting.
- The BPF map sizing example used old Helm keys `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`. Updated them to the current Helm keys `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The identity label example used `k8s:`-prefixed label patterns that do not match the documented Helm value examples for identity-relevant label filtering. Updated the example to use `app io\\.kubernetes\\.pod\\.namespace`, including the required escaping for the namespace label pattern.
- The identity monitoring commands used `cilium identity list`, but current command documentation exposes identity listing through `cilium-dbg identity list`. Updated the examples to run `cilium-dbg identity list` through the Cilium DaemonSet with `kubectl exec`.

## Review Notes
The remaining tuning values are environment-dependent. Native routing, XDP load-balancer acceleration, BPF masquerading, map sizing, and resource limits should be tested against the target kernel, NIC driver, topology, service count, and workload profile before production rollout.
