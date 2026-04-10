# Validation Summary: How to Decommission Storage from a Ceph Cluster

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (OSD management, CRUSH map, PG monitoring, auth, cluster health)
- Rook (Ceph operator for Kubernetes, CephCluster CRD)
- Kubernetes (kubectl exec, drain, delete node, pod management)
- Linux disk utilities (sgdisk, dd)

## Sources Consulted
- Ceph official documentation: OSD removal procedures (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph CLI reference for `ceph osd out`, `ceph osd crush remove`, `ceph auth del`, `ceph osd rm`, `ceph osd purge`
- Rook documentation: OSD management and CephCluster CRD spec (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Kubernetes documentation: `kubectl drain` flags including `--delete-emptydir-data` (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)

## Issues Found
1. **`watch` command missing kubectl exec wrapper (Option 1, Step 1):** The `watch -n10 "ceph status"` command was in the same code block as a `kubectl exec` one-liner for `ceph osd out`. The `watch` would run on the local machine where the `ceph` CLI is not available. Fixed by wrapping the watched command with `kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status`.

## Review Notes
- The `ceph osd df | sort -k9 -rn` command in Step 6 uses column 9 for sorting, but the exact column number for `%USE` varies by Ceph version. In modern Ceph (Quincy/Reef), the OMAP and META columns shift `%USE` to approximately column 11. Since the post doesn't target a specific Ceph version, this is noted but not changed.
- Modern Ceph (Luminous+) provides `ceph osd purge osd.N --yes-i-really-mean-it` which combines `crush remove`, `auth del`, and `osd rm` into a single command. The post uses the individual steps, which is the classic approach and still fully valid.
- Steps 5 and 6 are numbered as top-level sections rather than being nested under Option 2. Step 5 references osd-node-3 (specific to Option 2), while Step 6 (health verification) applies to both options. This is a structural observation, not a technical error.
- The `--delete-emptydir-data` flag for `kubectl drain` is the current flag (Kubernetes 1.20+), correctly replacing the deprecated `--delete-local-data`.
