# Validation Summary: How to Troubleshoot Monitors Failing to Form Quorum

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (monitor quorum, monmap, clock skew)
- Kubernetes (kubectl, pod debugging, PVCs, services, ConfigMaps)

## Sources Consulted
- Ceph documentation on monitor configuration and `mon_clock_drift_allowed` default (0.05s): https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph documentation on messenger v1 (port 6789) and v2 (port 3300): https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Rook documentation on monitor troubleshooting: https://rook.io/docs/rook/latest/Troubleshooting/ceph-common-issues/#monitors
- Kubernetes documentation on `kubectl debug node`: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found

1. **busybox image does not include chronyc (Step 4)**: The `kubectl debug` command used `--image=busybox` and attempted to run `chronyc tracking`. The busybox image does not contain chronyc. Fixed by changing the command to use `chroot /host timedatectl`, which accesses the host's timedatectl via the debug container's host filesystem mount. Also added the missing `-it` flag required for interactive debug sessions.

2. **Force Rebuild section lacked safety warning**: The section instructing users to delete the `rook-ceph-mon-endpoints` ConfigMap and all monitor deployments is a destructive operation that can lead to data loss if done incorrectly. Added a prominent warning callout advising users to back up cluster state and only use this as a last resort. Also clarified that success depends on the underlying monitor data being intact, rather than the misleading claim that Rook would "rebuild from scratch."

## Review Notes
- The monitor data path shown as `/var/lib/ceph/mon` is correct for containerized Ceph. In Rook-managed clusters, the full path inside the container is typically `/var/lib/ceph/mon/ceph-<id>`, but `df -h /var/lib/ceph/mon` will still show the correct mount point usage.
- The TCP connectivity test in Step 3 uses bash's `/dev/tcp` pseudo-device, which works in bash but not in all shells. Since Ceph container images include bash, this is acceptable.
- The post could benefit from mentioning the `ceph health detail` command as a first diagnostic step, but this is a style suggestion, not a technical error.
