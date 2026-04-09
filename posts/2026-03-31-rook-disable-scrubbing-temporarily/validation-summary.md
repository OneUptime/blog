# Validation Summary: How to Disable Scrubbing Temporarily in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (OSD flags, scrubbing, pool configuration)
- Rook (Ceph operator for Kubernetes, toolbox deployment)
- Kubernetes (kubectl exec, Jobs, ConfigMaps, Secrets)

## Sources Consulted
- Ceph official documentation on OSD flags: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#scrubbing
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes Job API reference: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found

1. **Kubernetes Job missing Ceph config and keyring volume mounts**: The auto-expiry Job example was missing volume mounts for the Ceph cluster configuration (`rook-ceph-config` ConfigMap) and admin keyring (`rook-ceph-admin-keyring` Secret). Without these, the container cannot connect to or authenticate with the Ceph cluster, and all `ceph` commands would fail. Added `volumeMounts` and `volumes` sections to mount `/etc/ceph/ceph.conf` and `/etc/ceph/keyring`.

2. **Pool-level re-enable was incomplete**: The "Disabling Scrubbing on Specific Pools" section set both `noscrub` and `nodeep-scrub` flags on the pool, but the re-enable example only showed unsetting `noscrub`. Added the missing `ceph osd pool set my-pool nodeep-scrub 0` command to match.

## Review Notes
- All `ceph osd set/unset noscrub` and `nodeep-scrub` commands are correct and current across Ceph Nautilus through Reef.
- The `ceph osd pool set <pool> noscrub 1/0` syntax for pool-level flags is correct.
- The `HEALTH_WARN` behavior when noscrub/nodeep-scrub flags are set is accurately described.
- The `ceph pg dump | grep "scrubbing"` verification method is correct for checking active scrubs.
- The `rook/ceph:latest` image tag in the Job works but users should pin to a specific Rook version matching their deployment for production use.
