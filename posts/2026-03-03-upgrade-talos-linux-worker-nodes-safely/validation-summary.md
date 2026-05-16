# Validation Summary: How to Upgrade Talos Linux Worker Nodes Safely

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Talos Linux
- Kubernetes worker nodes
- kubectl cordon, drain, and uncordon
- PodDisruptionBudget
- PersistentVolumes and local persistent volumes
- talosctl node upgrades and health checks

## Sources Consulted
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes kubectl cordon reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes node status reference: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes PodDisruptionBudget task documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Volumes documentation for local volumes: https://kubernetes.io/docs/concepts/storage/volumes/
- Talos Linux upgrade documentation: https://docs.siderolabs.com/talos/latest/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos releases: https://github.com/siderolabs/talos/releases

## Issues Found
- The Talos upgrade examples used the fixed installer image `ghcr.io/siderolabs/installer:v1.7.0`, which is outdated for a reusable 2026 guide. Replaced it with `ghcr.io/siderolabs/installer:<target-talos-version>` and added Talos' recommendation to upgrade through adjacent minor versions using the latest patch release for each intermediate minor version.
- The post said Kubernetes would gradually balance workloads back onto an uncordoned node. Kubernetes can schedule new or restarted pods there, but it does not automatically move already-running pods just to rebalance. Updated the wording.
- The drain watch command comment said it watched pods being evicted and rescheduled while filtering by the original node name. That filter only shows pods on that node. Updated the comment to say it watches pods being evicted from the node.
- The command intended to list pods with PVCs piped full `kubectl get pods` table rows into `kubectl get pvc -n`, which would not correctly map pods to namespaces or claims. Replaced it with a `custom-columns` command that lists namespace, pod name, and referenced PVC names for pods on the node.
- The post-upgrade verification examples used `grep -v` filters that still printed headers and could produce misleading results. Replaced them with `awk` filters that preserve the header and show only non-running/non-completed pods or non-bound PVs.

## Review Notes
- The core operational flow is correct: cordon, drain with `--ignore-daemonsets`, upgrade with `talosctl upgrade`, verify health, and uncordon. Kubernetes drain respects PodDisruptionBudgets when it uses the eviction API.
- The `--delete-emptydir-data` drain flag is current; older references may mention the deprecated alias `--delete-local-data`, but the post uses the current flag.
- The 25% parallel-upgrade recommendation is a reasonable operational rule of thumb, not a Kubernetes or Talos guarantee. Actual parallelism should be based on workload redundancy, PodDisruptionBudgets, and remaining cluster capacity.
