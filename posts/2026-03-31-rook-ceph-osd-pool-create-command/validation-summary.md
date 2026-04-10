# Validation Summary: How to Use the ceph osd pool create Command

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Ceph (OSD pool management, erasure coding, compression, quotas)
- Rook (Kubernetes Ceph operator, rook-ceph-tools deployment)
- kubectl (for accessing the Ceph toolbox pod)

## Sources Consulted
- Ceph official documentation: Pool operations (`ceph osd pool create`, `ceph osd pool set`, `ceph osd pool delete`) — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation: Erasure code profiles — https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph official documentation: Placement Groups — https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Rook documentation: Ceph Toolbox — https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The PG count formula `(OSDs * 100) / replicas` is the traditional rule of thumb. Modern Ceph (Nautilus 14.x+) includes a `pg_autoscaler` module enabled by default that automatically adjusts PG counts. The manual approach shown is still valid and useful for understanding, but readers should be aware that the autoscaler may adjust their values.
- The quota comment says "100GB" for the value 107,374,182,400 bytes, which is technically 100 GiB (binary). This is standard industry shorthand and not an error.
- The `ceph osd lspools` command is a valid alias but is considered legacy; `ceph osd pool ls` is the more modern equivalent. Both work correctly.
