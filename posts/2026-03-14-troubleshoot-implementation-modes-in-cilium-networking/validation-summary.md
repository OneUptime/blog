# Validation Summary: Troubleshooting Implementation Modes in Cilium Networking

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF/BPF datapath inspection
- VXLAN, Geneve, and native routing

## Sources Consulted
- Cilium routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli.html
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/stable/cmdref/
- Hubble CLI flow inspection guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- Several in-agent datapath inspection commands used `cilium` where current Cilium documentation uses `cilium-dbg`. Updated tunnel map, monitor, endpoint, metrics, conntrack, and troubleshooting examples to use `cilium-dbg`.
- The pod-to-service connectivity test used plain HTTP against `kubernetes.default.svc:443`. Updated it to use HTTPS with `curl -sk`, which matches the Kubernetes API server port.
- The verification section used `cilium endpoint list`, which is not part of the current cluster-level Cilium CLI reference. Updated it to execute `cilium-dbg endpoint list` inside the Cilium daemonset.
- The performance troubleshooting note referenced `cilium bpf prog list` and claimed it shows program complexity. Current Cilium command references do not list that command, and loaded-program complexity is not exposed that way. Replaced it with a metrics-based check for BPF map pressure, drops, and MTU-related counters.

## Review Notes
The high-level explanations of Cilium routing modes, VXLAN/Geneve encapsulation, native routing, Hubble flow inspection, and Kubernetes node debugging are consistent with current official documentation. The post remains version-neutral, so command behavior may still vary slightly by Cilium release and cluster installation options.
