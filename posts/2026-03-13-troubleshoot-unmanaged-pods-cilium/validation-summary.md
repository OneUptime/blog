# Validation Summary: Troubleshooting Unmanaged Pods After Cilium Installation

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- Cilium CLI
- kubectl
- jq
- eBPF networking

## Sources Consulted
- Cilium troubleshooting guide, "Ensure pod is managed by Cilium": https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium considerations on node pool taints and unmanaged pods: https://docs.cilium.io/en/stable/installation/taints.html
- Cilium Azure CNI chaining unmanaged pod restart guidance: https://docs.cilium.io/en/stable/installation/cni-chaining-azure-cni.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command cheatsheet for `cilium-dbg monitor --type drop`: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Kubernetes kubectl rollout reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post used `cilium endpoint list` and `cilium monitor` inside Cilium agent pods. Current Cilium documentation uses `cilium-dbg` for local agent debugging commands, so endpoint and monitor examples were updated to `cilium-dbg`.
- The endpoint JSON parsing used `.[].networking.addressing[].ipv4`, but Cilium endpoint JSON exposes addresses under `status.networking.addressing`. Updated the `jq` expression and added null-safe handling.
- The pod IP comparison included host-network pods, which Cilium documents as unmanaged by default. Updated the comparison and kube-system check to exclude host-network pods.
- The examples depended on `jq` but did not list it as a prerequisite. Added `jq` to prerequisites.
- The introduction cited Cilium upgrades and pod CIDR mismatch as causes of unmanaged pods. Updated it to match Cilium's documented causes: pods created before Cilium, host-network pods, and pods starting before the Cilium agent is ready.
- The policy enforcement explanation said all traffic to and from unmanaged pods bypasses all `CiliumNetworkPolicy` enforcement. Tightened this to the documented behavior that ingress and egress rules selecting unmanaged pods are not applied.
- The prevention guidance referred to node labels controlling Cilium management. Updated it to reference the documented `node.cilium.io/agent-not-ready` taint used to prevent pods from starting before Cilium is ready.
- The connectivity test used a specific `--test pod-to-pod` selector that was not necessary for the documented verification flow. Changed it to `cilium connectivity test`, which is the documented cluster connectivity validation command.

## Review Notes
Some commands assume the default `kube-system` namespace and `cilium` DaemonSet name. Those defaults match common Cilium installations, but customized installations may need namespace or DaemonSet name adjustments.
