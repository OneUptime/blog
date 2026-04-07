# Validation Summary: How to Handle Network Partitions in Rook Stretch Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- Kubernetes (container orchestration)
- CRUSH (Ceph's placement algorithm)

## Sources Consulted
- Rook official documentation for stretch clusters: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Rook stretch cluster design document: https://github.com/rook/rook/blob/master/design/ceph/ceph-stretch-cluster.md
- Ceph official documentation on stretch mode: https://docs.ceph.com/en/latest/rados/operations/stretch-mode/
- Ceph configuration reference for OSD settings: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph configuration reference for monitor-OSD interaction: https://docs.ceph.com/en/latest/rados/configuration/mon-osd-interaction/

## Issues Found

1. **Incorrect monitor count in text**: The blog stated "With a 3-monitor stretch layout (one per site plus a tiebreaker)" but the YAML correctly showed `mon.count: 5`. Rook requires 5 monitors for stretch clusters (2 per data site + 1 arbiter). Fixed the text to say "5-monitor stretch layout (two per data site plus a tiebreaker)" and clarified the quorum mechanics.

2. **Misleading `osd_heartbeat_grace` description**: The original section titled "Configuring OSD Down-out Interval" presented `osd_heartbeat_grace` with the comment "Set the interval before OSDs are marked out," which is incorrect. `osd_heartbeat_grace` controls when OSDs are marked **down** (not out). The down-to-out transition is controlled by `mon_osd_down_out_interval`. Fixed the section description and comments to accurately distinguish the two settings.

3. **Example values were defaults (no-ops)**: `osd_heartbeat_grace 20` is the default value and `mon_osd_down_out_interval 600` is also the default. Presenting these as tuning examples is misleading since they change nothing. Updated to `osd_heartbeat_grace 30` and `mon_osd_down_out_interval 1800` (30 minutes) to show actual tuning appropriate for stretch clusters with WAN links.

## Review Notes
- The `subFailureDomain: host` field in the CephCluster YAML is valid but not shown in official Rook examples. It is a real CRD field and is technically correct, so it was left as-is.
- The post explicitly sets `arbiter: false` on data zones, while the official examples omit this field for non-arbiter zones. Both approaches work; left as-is since explicit is clearer for a tutorial.
- All Ceph CLI commands in the post are valid and correctly formatted.
- The stretch CRUSH rule explanation is accurate.
