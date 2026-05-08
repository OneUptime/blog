# Validation Summary: Validating Native Routing Performance in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF/BPF host routing
- Native routing
- BGP
- iperf3
- netperf
- Prometheus and Grafana
- Bash, jq, bc, and gawk

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Performance Tuning Guide, eBPF Host-Routing: https://docs.cilium.io/en/stable/operations/performance/tuning.html
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium Cluster Scope IPAM documentation: https://docs.cilium.io/en/stable/network/concepts/ipam/cluster-pool.html
- Cilium command reference for cilium-dbg status and identity list: https://docs.cilium.io/en/stable/cmdref/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/

## Issues Found
- The route completeness check counted routes matching `10\.` and assumed all PodCIDRs were in the 10.0.0.0/8 range. Updated it to read PodCIDRs from CiliumNode resources, with a fallback to Kubernetes Node `spec.podCIDRs`, and check each remote PodCIDR explicitly.
- The route completeness section implied the check applies to every native-routing deployment. Updated the comment to clarify that this check is for per-node direct routes, since native routing can also rely on an upstream router.
- The verification command used the external `cilium status --verbose` output and grepped for fields that are reported by the agent-side status command. Updated it to run `cilium-dbg status` inside the Cilium DaemonSet.
- The BPF host routing troubleshooting note omitted `bpf.masquerade=true`, which Cilium documents as a requirement alongside eBPF kube-proxy replacement. Added it and clarified the kernel requirement as 5.10+ or equivalent.
- The statistical analysis snippet used `awk` with `asort()`, which is a GNU awk extension. Updated the command to `gawk` and added `gawk` to prerequisites.
- The report generator used `cilium identity list`, but the documented command is `cilium-dbg identity list` from a Cilium pod. Updated the snippet accordingly.
- The prerequisites omitted `jq` and `bc` even though the examples require them. Added both utilities.

## Review Notes
The numeric acceptance criteria and 90% efficiency threshold are environment-specific validation targets, not universal Cilium guarantees. They are acceptable as example criteria, but future revisions could clarify that readers should adjust them for their hardware, kernel, NIC, workload, and Cilium feature set.
