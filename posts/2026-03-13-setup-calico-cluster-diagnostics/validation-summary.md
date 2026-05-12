# Validation Summary: How to Set Up Calico Cluster Diagnostics Step by Step

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Calico (Open Source, operator-installed)
- `calicoctl` v3.x CLI (`cluster diags`, `ipam show`, `ipam check`)
- Kubernetes (`kubectl`, `kubectl run`, `kubectl exec`, `kubectl cp`)
- TigeraStatus custom resource / tigera-operator
- `yq` for YAML filtering
- `nicolaka/netshoot` diagnostic image
- BGP route propagation, IPAM, cross-node pod connectivity

## Sources Consulted
- [calicoctl cluster diags reference](https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/cluster/diags) — confirms output filename `./calico-diagnostics.tar.gz` and that the command runs from any host with kubeconfig access
- [calicoctl cluster command index](https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/) — confirms `cluster diags` subcommand exists
- [calicoctl node diags reference](https://docs.tigera.io/calico/latest/reference/calicoctl/node/diags)
- [Calico troubleshooting commands](https://docs.tigera.io/calico/latest/operations/troubleshoot/commands)
- [kubectl run reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/) — confirms there is no `--node-name` flag; `--overrides` is the supported way to set `nodeName`
- [Assigning Pods to Nodes (Kubernetes docs)](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)

## Issues Found

1. **`calicoctl cluster diags` does not need to run from inside a calico-node pod.**
   - Original text claimed it "Must be run from within a calico-node pod" and showed a `kubectl exec ... calicoctl cluster diags` plus `kubectl cp` pattern.
   - Per the official Tigera docs, the command "can be run from any location that has access to the cluster (e.g. anywhere with kubeconfig)."
   - Changed Step 1 to invoke `calicoctl cluster diags` directly from the workstation.

2. **Wrong output file path for `calicoctl cluster diags`.**
   - Original code copied `/tmp/calico-diags.tar.gz` from the pod, which is not the actual output path.
   - The command writes to `./calico-diagnostics.tar.gz` in the current working directory by default.
   - Updated the snippet to reference the real filename and `mv` it to a dated name.

3. **`kubectl run --node-name=<node-a>` is not a valid flag.**
   - `kubectl run` does not expose a `--node-name` option; the supported way to pin a pod to a specific node from `kubectl run` is `--overrides='{"spec":{"nodeName":"<node-a>"}}'`.
   - Replaced the flag in Step 3 with the `--overrides` form.

## Review Notes
- The `TigeraStatus` resource is provided by the tigera-operator and is present in operator-installed Calico Open Source as well as Calico Enterprise — the post's usage in Step 2 is correct.
- The `calico-system` namespace and `k8s-app=calico-node` / `k8s-app=tigera-operator` labels match the operator-managed install layout (manifest-based installs would differ; the prerequisites already imply operator installs by mentioning `calico-system`).
- Step 3 references `test-pod-on-node-b` without showing how it is created — the snippet assumes the reader has already deployed it. This is a minor pedagogical gap, not a technical error.
- `calicoctl ipam show --show-blocks` and `calicoctl ipam check` are both correct v3.x subcommands.
