# Validation Summary: How to Handle Edge Cluster Failures and Recovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (container orchestration)
- Edge computing deployment patterns

## Sources Consulted
- [Adding/Removing OSDs -- Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- [Adding/Removing Monitors -- Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/)
- [ceph-mon man page -- Ceph Documentation](https://docs.ceph.com/en/latest/man/8/ceph-mon/)
- [Troubleshooting Monitors -- Ceph Documentation](https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/)
- [Rook Ceph Disaster Recovery](https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/)
- [ceph osd CLI reference -- Ceph Documentation](https://docs.ceph.com/en/reef/man/8/ceph/)
- [Rook GitHub Discussion #12405](https://github.com/rook/rook/discussions/12405)

## Issues Found

### 1. Redundant commands after `ceph osd purge` (lines 39-44)
**What was wrong:** After `ceph osd purge 0 --yes-i-really-mean-it`, the post included `ceph auth del osd.0` and `ceph osd crush remove osd.0`. The `ceph osd purge` command already removes the OSD from the CRUSH map, deletes the auth key, and removes it from the OSD map. The two extra commands are redundant and would produce errors since the entities no longer exist after purge.
**What was changed:** Removed the redundant `ceph auth del osd.0` and `ceph osd crush remove osd.0` lines.

### 2. Incorrect monmap recovery command (line 64)
**What was wrong:** The command `ceph-mon --inject-monmap /var/lib/ceph/monmap --id a` had two issues: (a) `/var/lib/ceph/monmap` is not a valid monmap file path -- the monmap must first be extracted to a temporary file, and (b) the canonical flag for monitor ID is `-i`, not `--id`.
**What was changed:** Replaced with the correct two-step workflow: `ceph-mon -i a --extract-monmap /tmp/monmap` followed by `ceph-mon -i a --inject-monmap /tmp/monmap`, per official Ceph documentation.

### 3. Recovery script missing `--no-headers` flag (line 133)
**What was wrong:** The `kubectl get pods` command in the recovery script did not include `--no-headers`, which means the header line (NAME, READY, STATUS...) would be caught by `grep -v Running` and passed to `xargs`, causing an attempt to delete a non-existent pod named "NAME".
**What was changed:** Added `--no-headers` flag to the `kubectl get pods` command.

## Review Notes
- The "Remote Recovery via SSH" section uses `systemctl restart ceph.target`, which applies to non-containerized Ceph deployments. In a Rook-managed cluster, Ceph daemons run as Kubernetes pods, not systemd services. This section is still valid for mixed or bare-metal edge deployments, but readers should be aware it does not apply to pure Rook-managed setups.
- The `kubectl uncordon` suggestion for NotReady nodes only reverses a previous cordon (makes the node schedulable again). It does not fix the underlying cause of a NotReady state (e.g., kubelet failure, network issues). The text's "If the node is recoverable" qualifier is acceptable but could be clearer.
- The `osd_recovery_max_active` setting was split into `osd_recovery_max_active_hdd` and `osd_recovery_max_active_ssd` in newer Ceph releases (Pacific+). The generic setting still works as a fallback, but readers using recent Ceph versions may want to use the type-specific settings.
