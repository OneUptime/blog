# Validation Summary: How to Diagnose Deploy 25 more deployments on each namespace

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Cilium CLI and cilium-dbg
- kubectl
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- Several commands used node-local `cilium` subcommands such as `cilium endpoint list`, `cilium identity list`, `cilium bpf ...`, `cilium policy get`, and `cilium metrics list`. Current Cilium documentation exposes these diagnostics through `cilium-dbg` inside a Cilium agent pod, so the commands were changed to `kubectl -n kube-system exec ds/cilium -c cilium-agent -- cilium-dbg ...`.
- The node-to-node health command was written as `cilium health status`, but the documented binary is `cilium-health status`. The command was updated to run `cilium-health status` from the Cilium agent pod.
- The BPF connection tracking example used `cilium bpf ct list global`. Current `cilium-dbg bpf ct list` documentation does not use the `global` argument, so the example was updated to `cilium-dbg bpf ct list`.
- The troubleshooting section referenced `cilium bpf tunnel list`, which is not present in the current Cilium command reference. It was replaced with `cilium-dbg bpf ipcache list` to inspect endpoint and node IP identity mappings.
- The Cilium operator selector was updated from `name=cilium-operator` to `io.cilium/app=operator`, matching the selector used by current Cilium CLI defaults.
- The prerequisites previously specified Kubernetes `v1.21+`, which is not a reliable compatibility statement for current Cilium releases. It now requires a Kubernetes version supported by the installed Cilium release.
- The troubleshooting note previously hard-coded Linux kernel `4.19 or later`. Current Cilium system requirements are version and distribution dependent, so the text now directs readers to use the kernel required by their installed Cilium version.
- The high resource usage note said "label exclusion"; it was changed to "identity-relevant labels" to match Cilium terminology for reducing unnecessary identity creation.

## Review Notes
The commands that run through `kubectl exec ds/cilium` inspect a selected Cilium agent pod. For full per-node diagnostics in a large cluster, operators may need to repeat node-local `cilium-dbg` commands per Cilium pod or use Cilium's documented helper workflow for running diagnostics on all nodes.
