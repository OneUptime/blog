# Validation Summary: How to Remove Nodes from a Rook-Ceph Cluster

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CRUSH map (Ceph's data placement algorithm)
- OSD (Object Storage Daemon) management

## Sources Consulted
- Ceph official documentation on OSD removal: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Rook documentation on node management: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Kubernetes documentation on node drain: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Ceph CRUSH map documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found
- **`watch` with `-it` flag**: Line 34 used `watch kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status`. The `watch` command runs kubectl non-interactively in a loop, so the `-it` flags (interactive mode + TTY allocation) are inappropriate and would produce "the input device is not a TTY" warnings. Removed `-it` to use `kubectl exec` without interactive/TTY flags, which is correct for non-interactive repeated execution.

## Review Notes
- The post uses separate `ceph osd crush remove`, `ceph auth del`, and `ceph osd rm` commands. The combined `ceph osd purge osd.X --yes-i-really-mean-it` command (available since Ceph Luminous) could replace all three, but the individual commands shown are correct and arguably more educational.
- Rook also provides a dedicated `rook-ceph-purge-osd` job for OSD removal that handles some of these steps automatically. The manual approach in this post is valid and gives operators more control.
- The post correctly emphasizes waiting for full data rebalancing before proceeding with OSD removal, which is the most critical step in the process.
