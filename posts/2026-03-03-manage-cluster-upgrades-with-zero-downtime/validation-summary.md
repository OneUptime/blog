# Validation Summary: How to Manage Cluster Upgrades with Zero Downtime

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Talos Linux (v1.9.x installer image referenced)
- Kubernetes (1.31 -> 1.32 upgrade path)
- kubectl (drain, wait, get, uncordon, version)
- talosctl (upgrade, upgrade-k8s, etcd snapshot/members/status, health, rollback, dmesg, version)
- Kubernetes Deployment API (apps/v1)
- PodDisruptionBudget API (policy/v1)
- topologySpreadConstraints
- Bash scripting

## Sources Consulted
- Talos v1.9 CLI reference: https://www.talos.dev/v1.9/reference/cli/
- Upgrading Talos Linux: https://www.talos.dev/v1.9/talos-guides/upgrading-talos/
- Upgrading Kubernetes (talosctl upgrade-k8s): https://www.talos.dev/v1.9/kubernetes-guides/upgrading-kubernetes/
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- kubectl `--short` deprecation/removal: https://github.com/kubernetes/kubectl/issues/1216 (removed in v1.28)
- Kubernetes topologySpreadConstraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Sidero Labs installer image registry: https://github.com/siderolabs/talos/pkgs/container/installer

## Issues Found
1. **`kubectl version --short` is removed in kubectl v1.28.** The post discusses upgrading to Kubernetes 1.32, where the `--short` flag would cause the command to fail. Replaced `kubectl version --short 2>/dev/null` with `kubectl version 2>/dev/null` in the `post-upgrade-verify.sh` script. The modern default output is already in short form, preserving the intent.

## Review Notes
- `talosctl version --short` remains a valid flag but Sidero docs note it will become the default in the future; the post's usage still works on current Talos releases.
- The Deployment example uses `replicas: 3` together with `topologySpreadConstraints` (`maxSkew: 1`, `whenUnsatisfiable: DoNotSchedule`). On a 3-worker cluster this can prevent rescheduling during a drain because the remaining nodes already each host one pod and adding a second would exceed maxSkew. This is a design trade-off rather than a technical error; readers running small clusters may want `whenUnsatisfiable: ScheduleAnyway` or more nodes.
- The PDB with `minAvailable: 2` combined with 3 replicas allows only one disruption at a time, which matches the prose; this is correct.
- The Talos installer image `ghcr.io/siderolabs/installer:v1.9.1` is valid; v1.9.x is the current Talos 1.9 line on ghcr.io.
- `talosctl health -n <ip>` checks overall cluster health from that endpoint rather than per-node liveness, which is appropriate for the post-upgrade verification step shown.
- The `talosctl upgrade-k8s --from --to` flags are valid; `--from` is technically optional (auto-detected) but specifying it is harmless and matches the documented usage.
- All YAML manifests (Deployment, PodDisruptionBudget, lifecycle/preStop) are syntactically valid and use current API versions.
