# Validation Summary: How to Recover a Failed Rook-Ceph Monitor (MON)

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph MON (Monitor daemon)
- Kubernetes (kubectl, Deployments, ConfigMaps, PVCs)
- monmaptool (Ceph monmap manipulation utility)
- ceph-mon (Ceph Monitor daemon CLI)

## Sources Consulted
- Rook Disaster Recovery documentation: https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
- Ceph documentation - Adding/Removing Monitors: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/
- Ceph monmaptool man page: https://docs.ceph.com/en/latest/man/8/monmaptool/
- Ceph ceph-mon man page: https://docs.ceph.com/en/latest/man/8/ceph-mon/

## Issues Found
- **Procedural ordering in Step 4 (Quorum Loss Recovery):** The original post had the steps to scale down failed MON deployments (MON-b, MON-c) and update the `rook-ceph-mon-endpoints` ConfigMap placed *after* restarting the surviving MON-a (`rollout undo`). Per the official Rook disaster recovery documentation, the correct order is: (1) scale down failed MONs, (2) modify the monmap, (3) update the ConfigMap, and then (4) restart the surviving MON. This ensures that when MON-a starts, the cluster configuration already reflects the single-MON topology, preventing other daemons from attempting connections to non-existent MONs. Fixed by reordering these steps.

## Review Notes
- The `ceph-mon --extract-monmap` and `--inject-monmap` commands use the `--mon-data` flag rather than the canonical `-i {mon-id}` form from upstream Ceph docs. Both are valid; `--mon-data` is arguably clearer in the Rook context where the data directory path is explicit, and the Rook disaster recovery docs themselves use `--mon-data`.
- The post does not mention updating the `rook-ceph-config` ConfigMap, which may also contain MON endpoint references depending on Rook version. In practice, the Rook operator reconciles this when it is scaled back up, so this omission is not a problem.
- The hostPath data directory `/var/lib/rook/mon-a/data/` is specific to hostPath-based MON storage. For PVC-based MON storage (the default in newer Rook versions), this path would differ. The post could note this distinction but it is not incorrect as-is.
- All kubectl commands, Ceph CLI commands, and monmaptool commands use correct syntax and flags.
- The quorum math (3 MONs tolerate 1 failure, 5 tolerate 2) is correct.
- `ceph quorum_status` does output JSON; piping to `python3 -m json.tool` is valid.
