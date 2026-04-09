# Validation Summary: How to Upgrade from Ceph Quincy to Reef

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (Quincy v17, Reef v18)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl)
- Helm
- Rook CSI (RBD plugin)
- RADOS (object storage testing)

## Sources Consulted
- Rook v1.12 release notes confirming Ceph Reef support: https://github.com/rook/rook/releases/tag/v1.12.0
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest-release/CRDs/specification/
- Rook Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Ceph Reef v18.2.0 release announcement: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Ceph Quincy v17.2.7 release announcement: https://ceph.io/en/news/blog/2023/v17-2-7-quincy-released/
- Rook CSI troubleshooting docs (pod labels): https://rook.io/docs/rook/v1.14/Troubleshooting/ceph-csi-common-issues/
- Ceph CLI documentation for `ceph versions` command

## Issues Found
- **`-it` flags in script/piped contexts**: The monitoring script and rollback section used `kubectl exec -it` in contexts where output is captured in variables or piped to `python3`. The `-t` flag allocates a pseudo-TTY that injects `\r` (carriage return) characters into the output, which breaks JSON parsing and variable capture. Removed `-it` from all `kubectl exec` calls inside the monitoring script (3 occurrences) and the rollback section (1 occurrence). Interactive commands in the pre-upgrade checklist and post-upgrade validation were left with `-it` since those are intended to be run manually by an operator.

## Review Notes
- All version numbers, image tags, API versions, Helm chart references, and Ceph CLI commands verified as correct.
- The Quincy-to-Reef upgrade path, Rook v1.12+ requirement, and rollback safety warnings are all accurate per official documentation.
- The `rados -p .mgr` test in the post-upgrade section uses the internal `.mgr` pool. While functional, a dedicated test pool would be more appropriate in production environments. This is not incorrect, just a minor best-practice consideration.
- The post correctly emphasizes upgrading Rook before Ceph, which is the documented order of operations.
