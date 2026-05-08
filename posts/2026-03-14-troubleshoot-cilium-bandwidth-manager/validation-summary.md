# Validation Summary: Troubleshooting Cilium Bandwidth Manager

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium Bandwidth Manager
- Kubernetes
- Cilium CLI and cilium-dbg
- Hubble
- eBPF datapath diagnostics
- Linux node networking tools

## Sources Consulted
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for cilium-dbg: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for cilium-dbg bpf bandwidth list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_bandwidth_list.html
- Cilium command reference for cilium-dbg monitor: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for cilium-dbg metrics list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for cilium-dbg bpf ct list: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium Hubble setup and observability documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The data path inspection section used `cilium bpf tunnel list` as a BPF program status check. This inspects tunnel state rather than bandwidth-manager settings, so it was changed to `cilium-dbg bpf bandwidth list`, which is the documented Cilium command for bandwidth BPF datapath settings.
- The introduction said Cilium Bandwidth Manager does not require traditional Linux traffic control rules and broadly described EDT usage. The wording was narrowed to match the Cilium documentation: Cilium does not rely on the bandwidth CNI plugin's TBF-based shaping path, and EDT is specifically used for egress traffic.
- Several commands executed inside Cilium agent pods used `cilium`. Current Cilium documentation identifies `cilium-dbg` as the agent-local CLI for BPF maps, monitor events, endpoint state, metrics, and daemon status. These commands were updated to `cilium-dbg`.
- The Kubernetes service connectivity test used plain HTTP against port 443. This can fail due to protocol mismatch rather than connectivity, so it was changed to HTTPS with `-k` against `/version`.
- The endpoint health verification used `cilium endpoint list` from the local workstation, but endpoint listing is an agent-local operation in current command references. It was changed to run `cilium-dbg endpoint list` inside a Cilium agent pod.
- The BPF conntrack troubleshooting command used the obsolete `cilium bpf ct list global` form. It was updated to `cilium-dbg bpf ct list` based on current command documentation.
- The performance troubleshooting note referenced `cilium bpf prog list`, which is not present in the current Cilium command reference. It was replaced with documented `cilium-dbg status --verbose` and `cilium-dbg metrics list` checks.

## Review Notes
The post is technically relevant and generally accurate after the command corrections. Hubble commands executed via `kubectl exec ds/cilium` query the Hubble API from a Cilium agent pod and may show node-local flows unless Hubble Relay or the selected agent pod observes the traffic; this is acceptable for a troubleshooting guide but could be clarified in a future revision.
