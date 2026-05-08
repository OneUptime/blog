# Validation Summary: Troubleshooting Disadvantages of Native Routing in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium native routing
- Cilium CLI and cilium-dbg
- Kubernetes and kubectl
- Hubble
- Linux routing, eBPF maps, and bpftool

## Sources Consulted
- Cilium routing concepts and native routing requirements: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium command reference for cilium-dbg commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble setup and CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes kubectl debug node documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- Agent-local Cilium datapath commands used `cilium` where current Cilium documentation uses `cilium-dbg` inside Cilium agent pods. Updated BPF map, monitor, endpoint, metrics, verification, and troubleshooting commands to use `cilium-dbg`.
- The route inspection command ran on the operator's local machine instead of the Cilium node. Updated it to run through `kubectl exec` against the Cilium DaemonSet.
- The Kubernetes API service connectivity test used plain HTTP against port 443. Updated it to use HTTPS with `curl -k` for a connectivity-oriented check.
- The Hubble example referenced `default/diag-pod` after the diagnostic pod had already been deleted in the previous section. Replaced it with a `NAMESPACE/POD_NAME` placeholder.
- The BPF map fullness guidance used the old `cilium bpf ct list global` form and named Helm values generically. Updated it to `cilium-dbg bpf ct list` and the documented `bpf-ct-global-any-max` and `bpf-ct-global-tcp-max` values.
- The performance troubleshooting command referenced `cilium bpf prog list`, which is not part of the current Cilium command reference. Updated it to use Cilium BPF datapath metrics and `bpftool prog show` for loaded kernel programs.

## Review Notes
The post is technically relevant and accurate after the command corrections. Some examples still depend on cluster-specific labels, enabled Hubble components, and RBAC permissions, which is expected for a troubleshooting guide.
