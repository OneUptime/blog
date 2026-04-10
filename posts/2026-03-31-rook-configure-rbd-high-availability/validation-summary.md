# Validation Summary: How to Configure RBD for High-Availability Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- CephBlockPool CRD (`ceph.rook.io/v1`)
- CephRBDMirror CRD (`ceph.rook.io/v1`)
- Ceph CRUSH rules
- RBD mirroring (snapshot-based)
- Kubernetes PodDisruptionBudget (`policy/v1`)
- Kubernetes topology spread constraints

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephRBDMirror CRD documentation: https://rook.io/docs/rook/v1.14/CRDs/Block-Storage/ceph-rbd-mirror-crd/
- Ceph RBD Mirroring documentation: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Rook RBD Mirroring guide: https://rook.io/docs/rook/v1.17/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Ceph CRUSH rule documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Kubernetes PodDisruptionBudget API: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Topology Spread Constraints: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/

## Issues Found

### 1. Peer bootstrap import command references inaccessible file path
**What was wrong:** The `rbd mirror pool peer bootstrap import` command referenced `/tmp/bootstrap-token` as a file path argument. Since this command runs inside a container via `kubectl exec`, it looks for the file inside the container. However, the preceding `create` command used shell redirection (`>`) to save the token to `/tmp/bootstrap-token` on the *local machine*, not inside the container. The import command would fail with a file-not-found error.

**What was changed:** Changed the import command to read the token from stdin using `- < /tmp/bootstrap-token`, which pipes the local file's contents into the container via stdin. Also changed `-it` to `-i` since a TTY is not needed (and would interfere with stdin piping).

### 2. TTY flag used with output redirection on create command
**What was wrong:** The bootstrap create command used `-it` flags with `kubectl exec` while redirecting stdout to a file. The `-t` flag allocates a pseudo-TTY, which can inject carriage return characters (`\r`) into the output, potentially corrupting the bootstrap token.

**What was changed:** Removed `-it` flags from the create command since no interactive session is needed when capturing output to a file.

## Review Notes
- The `spec.parameters.min_size: "2"` in the CephBlockPool YAML is technically redundant when `requireSafeReplicaSize: true` is set with `size: 3` (Rook automatically enforces `min_size >= floor(size/2) + 1 = 2`), but being explicit is not wrong and can aid readability.
- The post creates CRUSH rules via CLI commands rather than using the CephBlockPool CRD's `spec.replicated.failureDomain` field, which is the Rook-native approach. The CLI approach works but bypasses Rook's reconciliation loop. A future update could mention the CRD-native alternative.
- The `--direction` flag (e.g., `--direction rx-only` or `--direction rx-tx`) is commonly included in `rbd mirror pool peer bootstrap import` for clarity, though it defaults to `rx-tx` if omitted.
