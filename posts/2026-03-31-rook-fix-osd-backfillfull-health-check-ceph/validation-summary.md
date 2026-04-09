# Validation Summary: How to Fix OSD_BACKFILLFULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- OSD (Object Storage Daemon) management
- CRUSH weight and reweight mechanisms
- RADOS object storage

## Sources Consulted
- Ceph Monitor Config Reference: https://docs.ceph.com/en/reef/rados/configuration/mon-config-ref/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph.io blog on reweight vs crush reweight: https://ceph.io/en/news/blog/2014/difference-between-ceph-osd-reweight-and-ceph-osd-crush-reweight/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook GitHub PR #14281 (storage ratio fields in CRD)

## Issues Found

1. **Option 2 incorrectly described `ceph osd reweight` as changing the CRUSH weight.** The command `ceph osd reweight` adjusts a temporary override weight (0.0–1.0 scale), not the CRUSH weight. The CRUSH weight is changed by a different command: `ceph osd crush reweight`. Fixed the description to say "reweight value" and added a clarifying note distinguishing the two commands.

2. **`ceph osd df` awk column number was incorrect for modern Ceph.** The original command `awk '$8 > 88'` assumed `%USE` is at field 8, which is only true in older Ceph versions where size values have units attached (e.g., "10240M"). In modern Ceph (Quincy/Reef), size columns use space-separated units (e.g., "894 GiB"), making `%USE` appear at awk field `$17`. Replaced with a JSON/jq approach (`ceph osd df -f json-pretty | jq`) that works reliably across all Ceph versions.

3. **`rados stat` sort column was incorrect.** The original `sort -k4 -rn` did not sort by object size because the size value is not at field 4 in `rados stat` output. The size is the last field on each line. Fixed by prepending the last field with `awk '{print $NF, $0}'` before sorting numerically.

## Review Notes
- The default `backfillfull_ratio` of 0.90 (90%) is correctly stated.
- The Rook CephCluster CRD YAML for `fullRatio`, `backfillFullRatio`, and `nearFullRatio` under `spec.storage` is correct — these fields were added to the Rook CRD in May 2024 (PR #14281).
- The `ceph osd set-backfillfull-ratio` command syntax is correct.
- The `ceph -w | grep "backfill_wait\|backfill_toofull"` command correctly uses BRE alternation with grep.
- The overall troubleshooting flow (diagnose → add capacity/reweight/raise threshold → monitor) is sound and follows Ceph best practices.
