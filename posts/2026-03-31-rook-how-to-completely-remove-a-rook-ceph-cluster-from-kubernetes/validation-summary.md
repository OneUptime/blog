# Validation Summary: How to Completely Remove a Rook-Ceph Cluster from Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes storage operator)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI, namespaces, CRDs, DaemonSets, PVCs, StorageClasses)
- Linux disk management tools (sgdisk, dd, blkdiscard, lsblk)

## Sources Consulted
- Rook official documentation — Cleanup Guide: https://rook.io/docs/rook/latest/Getting-Started/ceph-teardown/
- Rook GitHub repository — deploy examples: https://github.com/rook/rook/tree/master/deploy/examples
- Kubernetes documentation — kubectl delete: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#delete
- Kubernetes documentation — Finalizers: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes documentation — Namespace stuck in Terminating: https://kubernetes.io/docs/tasks/administer-cluster/namespaces-walkthrough/

## Issues Found

### 1. Incorrect section title in Step 2 — "Delete Rook CRDs"
- **What was wrong:** The heading said "Delete Rook CRDs" but the commands delete Custom Resource instances (CRs like CephBlockPool, CephFilesystem, etc.), not Custom Resource Definitions (CRDs). The actual CRDs are deleted later in Step 4 via `crds.yaml`.
- **What was changed:** Renamed the section to "Delete Ceph Custom Resources" to use correct Kubernetes terminology.

### 2. Broken objectbucketclaim delete command in Step 2
- **What was wrong:** `kubectl -n rook-ceph delete objectbucketclaim --all-namespaces` has two problems: (a) `-n rook-ceph` conflicts with `--all-namespaces` — the latter overrides the former, (b) the `--all` flag is missing, so kubectl has no resource names to delete and would return an error. ObjectBucketClaims can exist in any namespace, so the intent is clearly to delete them cluster-wide.
- **What was changed:** Fixed to `kubectl delete objectbucketclaim --all --all-namespaces`.

### 3. Stuck namespace section in Step 4 only listed resources, did not remove finalizers
- **What was wrong:** The text said "remove the finalizers from all remaining resources" but the command (`kubectl api-resources ... | xargs ... kubectl get`) only lists remaining resources — it does not remove any finalizers. A user following these instructions would not unblock the stuck namespace.
- **What was changed:** Changed the description to say "first identify remaining resources" for the listing command, then added the standard namespace finalizer removal command using `kubectl replace --raw "/api/v1/namespaces/rook-ceph/finalize"` with `jq`.

### 4. Invalid kubectl exec example in Step 6
- **What was wrong:** The command `kubectl -n rook-ceph exec -it <node-pod> -- sgdisk --zap-all $DISK` references the `rook-ceph` namespace, which was already deleted in Step 4. The description also said "Using a Rook cleanup DaemonSet" but the command was a `kubectl exec`, not a DaemonSet. Additionally, `sgdisk` is not available in minimal container images like busybox.
- **What was changed:** Replaced with a `kubectl run` approach that creates a privileged pod on a specific node using an ubuntu image with gdisk installed, which correctly avoids referencing the deleted namespace.

## Review Notes
- The DaemonSet in Step 5 uses `hostPID: true`, which is not necessary for the file cleanup task — only the host volume mount is needed. This is not harmful but could be removed for a tighter security posture.
- The post references `master` branch URLs for Rook GitHub raw content. This works currently but pinning to a specific release branch (e.g., `release-1.14`) would be more stable for readers following along with a specific Rook version.
- The overall order of operations (PVCs first, then CRs, then CephCluster, then operator, then host cleanup, then disk wipe) is correct and matches the official Rook teardown documentation.
- The cleanup policy confirmation value `yes-really-destroy-data` is correct per Rook documentation.
