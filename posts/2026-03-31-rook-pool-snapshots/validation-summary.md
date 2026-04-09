# Validation Summary: How to Create and Remove Pool Snapshots in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS pool-level snapshots)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl exec, CronJob)
- RADOS CLI (`rados mksnap`, `lssnap`, `rmsnap`, `get --snap`)

## Sources Consulted
- Official rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph Pools documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph Erasure Code documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Rook toolbox deployment example: https://github.com/rook/rook/blob/master/deploy/examples/toolbox.yaml
- Rook Ceph config design doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-config-updates.md
- Ceph Reef release notes: https://docs.ceph.com/en/latest/releases/reef/
- Ceph test suite (cephtool/test.sh) on GitHub for EC pool snapshot behavior

## Issues Found
1. **CronJob missing Ceph authentication and configuration**: The original CronJob example would fail at runtime because the `rados` CLI requires a `ceph.conf` (to locate monitors) and a keyring (to authenticate). The CronJob had no volume mounts for these. Fixed by adding:
   - Environment variables from `rook-ceph-mon` Secret (`ceph-username` and `ceph-secret` keys) to provide admin credentials.
   - A `mon-endpoint-volume` mount from the `rook-ceph-mon-endpoints` ConfigMap to provide monitor addresses.
   - An `emptyDir` volume at `/etc/ceph` for generated config files.
   - Inline shell commands to generate `ceph.conf` and `keyring` from the mounted Rook resources before running `rados mksnap`.
   This follows the same pattern used by the official Rook toolbox deployment.

## Review Notes
- Pool-level snapshots are not formally deprecated in Ceph Reef (v18) or Squid (v19), but they are strongly discouraged for most production use cases. The community consensus is to use RBD image-level snapshots or CephFS snapshots instead. The blog correctly recommends RBD snapshots for Kubernetes workloads.
- The claim that pool snapshots are "not supported for EC (erasure coded) pools" is likely operationally true but is not definitively documented in the official Ceph docs. The Ceph test suite blocks snapshot creation on EC-backed tier pools.
- The `rook/ceph:v1.13.0` image is technically the Rook operator image, not the Ceph image (`quay.io/ceph/ceph:v18`). However, the operator image is built on top of Ceph and includes the RADOS CLI tools, so it works for this purpose.
- The RBD incompatibility claim is strongly confirmed: Ceph pools operate in either "pool snaps mode" or "self-managed snaps mode" (used by RBD). Creating a pool snapshot on an RBD pool can permanently break RBD snapshot functionality in that pool.
