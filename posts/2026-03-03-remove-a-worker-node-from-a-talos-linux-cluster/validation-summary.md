# Validation Summary: How to Remove a Worker Node from a Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (`talosctl` CLI)
- Kubernetes (`kubectl` CLI)
- Kubernetes node lifecycle (cordon, drain, delete)
- PodDisruptionBudgets (PDBs)
- Persistent Volumes / PVCs
- VolumeSnapshot CRD (`snapshot.storage.k8s.io/v1`)
- Replicated storage solutions (Longhorn, Rook-Ceph, LINSTOR)
- Node leases (`kube-node-lease` namespace)
- Bash scripting

## Sources Consulted
- Talos Linux `talosctl reset` reference: https://www.talos.dev/latest/reference/cli/#talosctl-reset
- Talos Linux `talosctl shutdown` reference: https://www.talos.dev/latest/reference/cli/#talosctl-shutdown
- Talos Linux `talosctl health` reference: https://www.talos.dev/latest/reference/cli/#talosctl-health
- Kubernetes `kubectl drain` documentation: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#drain
- Kubernetes "Safely Drain a Node" task guide: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes VolumeSnapshot API (`snapshot.storage.k8s.io/v1`): https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Node lease documentation (`kube-node-lease` namespace): https://kubernetes.io/docs/concepts/architecture/nodes/#heartbeats

## Issues Found
No technical issues found.

All commands, flags, and API references were verified against current official documentation:
- `kubectl drain` flags (`--ignore-daemonsets`, `--delete-emptydir-data`, `--grace-period`, `--timeout`) are correct.
- `talosctl reset --graceful` and `--system-labels-to-wipe STATE/EPHEMERAL` are valid and accurately described.
- The VolumeSnapshot manifest uses the GA API version (`snapshot.storage.k8s.io/v1`, stable since Kubernetes 1.20).
- The `kubectl patch` JSON merge patch syntax for clearing finalizers is correct.
- The `kube-node-lease` namespace reference for node leases is accurate.
- The PodDisruptionBudget example (minAvailable=2 with 2 replicas blocking drain) is correct.

## Review Notes
- The `--ignore-daemonsets` flag comment ("Don't wait for DaemonSet pods (they'll be cleaned up)") is slightly imprecise — the flag tells `kubectl drain` not to fail because of DaemonSet-managed pods; the pods themselves are not evicted and continue running until the node is deleted. The post's "Common Pitfalls" section #4 actually clarifies this correctly, so the two descriptions are internally consistent enough to be left as-is.
- The `kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default` pattern is widely used and works in practice, though strictly `--rm` requires the pod's restart policy to allow termination. Modern kubectl handles this gracefully for interactive runs, so this is fine.
- Talos `reset` semantics have evolved across versions; the explicit form using `--system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL` shown in the "Full wipe" example is the most portable and version-safe way to express intent.
- The hardcoded `v1.29.0` in the example `kubectl get node` output is just illustrative and not load-bearing.
