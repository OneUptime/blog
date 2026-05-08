# Validation Summary: Troubleshooting CiliumCIDRGroup

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumCIDRGroup
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- eBPF/BPF
- Linux networking tools

## Sources Consulted
- Cilium CiliumCIDRGroup documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumcidrgroup/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium-dbg.html
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium BPF debugging documentation: https://docs.cilium.io/en/stable/reference-guides/bpf/debug_and_test/
- Kubernetes `kubectl debug` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- Commands executed inside Cilium agent pods used `cilium` for local agent inspection. Updated those examples to use `cilium-dbg`, which is the current local Cilium agent debugging CLI documented by Cilium.
- The operator log selector used `app.kubernetes.io/name=cilium-operator`. Updated it to `io.cilium/app=operator`, matching the selector used by current Cilium CLI defaults.
- The Kubernetes service connectivity test used `http://kubernetes.default.svc:443`, which sends plain HTTP to an HTTPS port. Updated it to `https://kubernetes.default.svc:443` with `curl -k`.
- Node-level `kubectl debug` examples used interactive flags for one-shot commands. Removed `-it` from those examples so the commands work better as scripted diagnostics.
- The verification section used `cilium endpoint list`, which is not part of the current cluster-level Cilium CLI. Updated it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The BPF map troubleshooting command used an outdated `cilium bpf ct list global` form. Updated it to the current `cilium-dbg bpf ct list` command and named the specific conntrack sizing settings documented by Cilium.
- The performance troubleshooting note referenced `cilium bpf prog list`, which is not in the current `cilium-dbg` command reference. Updated it to use `bpftool prog`, which Cilium documents for BPF program inspection.

## Review Notes
The post is now technically valid as a general troubleshooting guide. Some examples still depend on cluster configuration, labels, and whether Hubble Relay is enabled, so readers may need to adapt pod names, selectors, and namespaces to their environment.
