# Validation Summary: How to Tune TCP Throughput (TCP_STREAM) in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Linux TCP sysctl tuning
- eBPF datapath and BPF host routing
- iperf3
- ethtool and NIC offloads

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/latest/operations/performance/tuning/
- Cilium Routing Concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/latest/network/kubernetes/bandwidth-manager/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging guide: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux kernel /proc/sys/net documentation: https://docs.kernel.org/admin-guide/sysctl/net.html

## Issues Found
- The Cilium values snippet used `tunnel: disabled`, which is not a current Helm value in the Cilium Helm reference. Removed it and kept `routingMode: native`.
- The Cilium values snippet used `enableIPv6: false`, but current Helm values use `ipv6.enabled`. Changed it to the nested `ipv6.enabled: false` form.
- The monitor aggregation values were shown as top-level `monitorAggregation` and `monitorAggregationInterval`, but current Helm values are `bpf.monitorAggregation` and `bpf.monitorInterval`. Moved them under `bpf` and used the documented field names.
- The post implied host-level BBR sysctls were sufficient for pod throughput. Cilium documents pod BBR through Bandwidth Manager with `bandwidthManager.enabled=true` and `bandwidthManager.bbr=true`, so the values file and troubleshooting text were updated accordingly.
- The Cilium snippet enabled BPF host routing without also showing `kubeProxyReplacement=true` and `bpf.masquerade=true`, which Cilium lists as requirements for eBPF host routing. Added both values.
- The Helm upgrade command did not restart Cilium agents after changing datapath configuration. Added a Cilium DaemonSet rollout restart and a maintenance-window note because datapath changes affect pod connectivity and may require workload pod restarts or per-node rollout.
- The diagram said "Disable monitor for perf" while the configuration only aggregates monitor events. Changed the diagram label to "Monitor aggregation".
- The BBR troubleshooting note only mentioned kernel 4.9 and `tcp_bbr`. Updated it to distinguish host-level BBR from Cilium BBR for pods, which Cilium documents as requiring Bandwidth Manager, eBPF host routing, kube-proxy replacement, eBPF masquerading, and kernel 5.18 or newer.

## Review Notes
The benchmark commands and Kubernetes debug commands are plausible against current Kubernetes CLI documentation, but they depend on cluster permissions, image availability, and node security policies. The NIC tuning commands are intentionally best-effort because supported offloads vary by driver and cloud provider.
