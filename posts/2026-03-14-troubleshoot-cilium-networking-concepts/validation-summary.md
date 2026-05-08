# Validation Summary: Troubleshooting Cilium Networking Concepts

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF/BPF datapath
- Hubble
- Linux networking tools

## Sources Consulted
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium BPF debugging and testing reference: https://docs.cilium.io/en/stable/reference-guides/bpf/debug_and_test/

## Issues Found
- The post used `cilium` inside Cilium agent pods for local datapath commands such as `monitor`, `endpoint list`, `metrics list`, and BPF map inspection. Current Cilium documentation uses `cilium-dbg` for local agent and datapath inspection, so those commands were updated.
- The "Check BPF program status" command actually listed the tunnel map rather than loaded BPF programs. The comment was changed to describe tunnel map status accurately.
- The pod-to-service connectivity test used plain HTTP against Kubernetes API port 443. It was changed to an HTTPS request to `/version` so the command matches the service protocol.
- The verification section used `cilium endpoint list`, which is not part of the cluster-level Cilium CLI. It was changed to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The troubleshooting note used `cilium bpf ct list global`; current documentation shows `cilium-dbg bpf ct list` without a `global` argument. The command was updated.
- The troubleshooting note referenced `cilium bpf prog list`, which is not documented in the current `cilium-dbg bpf` command reference. It was changed to recommend `bpftool prog`, which Cilium's BPF debugging reference documents for inspecting loaded BPF programs.

## Review Notes
The post remains version-neutral. Some commands assume Cilium is installed in `kube-system` and that `kubectl exec ds/cilium` selects an appropriate agent pod; these are common defaults but may need adjustment in customized installations.
