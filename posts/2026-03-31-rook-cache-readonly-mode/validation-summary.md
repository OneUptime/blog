# Validation Summary: How to Set Up Readonly Cache Mode in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (cache tiering, OSD pools, hit sets)
- Ceph CLI (`ceph osd tier`, `ceph osd pool`)
- CRUSH rules (HDD/SSD device class separation)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph osd tier` and `ceph osd pool set` commands

## Issues Found
No technical issues found.

All commands use correct syntax and argument ordering. The `ceph osd tier add`, `ceph osd tier cache-mode`, and `ceph osd tier set-overlay` commands are properly structured. Pool creation with explicit pg_num, pgp_num, and pool type is valid. Hit set parameters (`hit_set_type bloom`, `hit_set_count`, `hit_set_period`, `min_read_recency_for_promote`) are all real Ceph pool parameters with reasonable values. The `target_max_bytes` value of 53687091200 correctly equals 50 GiB. The tier removal sequence (remove-overlay, remove tier, delete pool) is in the correct order, and the `--yes-i-really-really-mean-it` flag is accurately specified.

## Review Notes
- Ceph cache tiering has been deprecated/discouraged since the Luminous release. The official Ceph documentation recommends against using cache tiering for most workloads due to complexity and known edge cases. The commands in this post are technically correct but users should be aware that cache tiering is not actively recommended by the Ceph community for new deployments.
- The post tags include "Rook" and "Kubernetes" but the content covers only direct Ceph CLI commands with no Rook CRD or Kubernetes-specific configuration. This is an editorial concern rather than a technical error.
