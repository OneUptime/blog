# Validation Summary: How to Handle Node Maintenance in Rook-Ceph (Cordon, Drain)

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI: cordon, drain, uncordon)
- Ceph CLI (osd set/unset noout, osd out, osd purge, ceph status)

## Sources Consulted
- Rook official documentation on node maintenance: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/node-fencing/
- Ceph official documentation on OSD flags: https://docs.ceph.com/en/latest/rados/operations/control/#osd-subsystem
- Kubernetes official documentation on drain: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes kubectl reference for cordon/drain/uncordon: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Ceph documentation on OSD purge: https://docs.ceph.com/en/latest/man/8/ceph/#osd

## Issues Found
No technical issues found.

## Review Notes
- The expected output for `ceph osd dump | grep flags` is simplified. In practice, the output will include additional default flags (e.g., `sortbitwise`, `recovery_deletes`, `purged_snapdirs`, `pglog_hardlimit`) alongside `noout`. This is acceptable for a tutorial since it shows the relevant flag to look for.
- The post correctly uses `--delete-emptydir-data` which is the current flag name, replacing the deprecated `--delete-local-data`.
- `kubectl drain` implicitly cordons the node, so Step 2 (explicit cordon) is technically redundant. However, separating cordon and drain into distinct steps is common best practice for clarity and is not an error.
- When using `watch` with `kubectl exec -it`, the `-t` (TTY) flag may produce warnings or garbled output in some environments. Dropping `-t` (using just `-i` or no interactive flags) would be more robust with `watch`, but this is a minor practical consideration rather than a technical error.
