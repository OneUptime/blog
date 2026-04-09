# Validation Summary: How to Manage Pools from the Ceph Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph Dashboard (web-based management UI)
- Ceph OSD pools (replicated and erasure-coded)
- PG Autoscaling
- Ceph compression (BlueStore)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation: Pool operations (`ceph osd pool create`, `ceph osd pool set`, `ceph osd pool delete`) — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation: Erasure code profiles — https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph official documentation: BlueStore compression — https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph official documentation: PG Autoscaler — https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Rook official documentation: Ceph Dashboard — https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/

## Issues Found
No technical issues found.

## Review Notes
- The post uses `32 32` for initial PG num/PGP num in pool creation commands alongside `--autoscale-mode on`. While not incorrect, when autoscaling is enabled the autoscaler will adjust PG counts automatically, so specifying initial values is optional in modern Ceph. This is a stylistic choice rather than an error.
- The quota comment says "1TB" while the byte value (1099511627776) is technically 1 TiB (tebibyte). This is a very common colloquial usage in storage contexts and not a meaningful error.
- The `--autoscale-mode` flag on `ceph osd pool create` is available in Ceph Pacific (16.x) and later. The post does not specify a Ceph version, but this is consistent with current Rook deployments which ship modern Ceph versions.
- All CLI commands correctly use `kubectl -n rook-ceph exec deploy/rook-ceph-tools --` as the execution context, which is the standard Rook toolbox pattern.
