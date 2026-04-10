# Validation Summary: How to Check Ceph Cluster Health in Rook

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI, CephCluster CRD, pod management)
- Ceph CLI tools (ceph status, ceph mon stat, ceph osd stat, ceph pg stat, ceph df, ceph health detail)

## Sources Consulted
- Ceph Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph PG States Documentation: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph Health Checks Documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Troubleshooting OSDs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Rook Ceph Toolbox Documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes field-selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
1. **Incorrect nearfull threshold default**: The post stated the OSD nearfull threshold is "75% by default". The actual Ceph default for `mon_osd_nearfull_ratio` is 0.85 (85%). Fixed "75%" to "85%".

2. **Incorrect "undersized" PG state description**: The post described the "undersized" PG state as "Fewer replicas than `min_size`". The correct definition is fewer replicas than the pool's `size` (replication factor). `min_size` is a separate parameter that defines the minimum copies needed to continue serving I/O. Fixed to "Fewer replicas than pool `size` (replication factor)".

## Review Notes
- The summary paragraph references "four layers" while the body describes seven numbered layers (1-7). The summary groups them conceptually into four categories (Kubernetes resources, overall cluster health, component-level health, capacity), which is reasonable but could be confusing given the numbered layers in the body.
- The command `ceph osd tree | grep -E "down|out"` could produce false positives since "out" may appear in other contexts in the output. A more precise approach would be to use `ceph osd tree` and visually inspect the STATUS column, or use `ceph osd dump | grep "out"` for finding OSDs marked out. This is a usability note, not a correctness error.
- All kubectl commands, Ceph CLI commands, and the quick health check script are correct and functional.
- The CephCluster CR status structure shown is accurate for current Rook versions.
- The `ceph pg dump_stuck` subcommands (inactive, unclean, stale) are all valid.
