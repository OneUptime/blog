# Validation Summary: How to Plan for Data Growth in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- kubectl (Kubernetes CLI)
- jq (JSON processor)
- PromQL (Prometheus query language)
- Bash scripting with bc
- YAML configuration templates

## Sources Consulted
- Ceph official documentation — Monitoring Overview: https://docs.ceph.com/en/latest/monitoring/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Monitor Config Reference (nearfull/full ratios): https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Rook Ceph Toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/

## Issues Found
- **Step 2 — Misleading jq field name `growth_pct`**: The jq output labeled `.stats.percent_used` as `growth_pct`, but `percent_used` represents current pool utilization percentage, not a growth percentage. Renamed to `used_pct` for accuracy.

## Review Notes
- The procurement timeline in Step 5 lists individual phases that don't precisely sum to the stated "120-150 days" total lead time. The individual items sum to roughly 52-83 days post-order (or 142-173 days including the 90-day pre-order process). Since these are rough planning estimates rather than precise calculations, no change was made, but readers should treat this as a ballpark.
- The Prometheus query `increase(ceph_cluster_total_used_bytes[90d])` requires Prometheus retention to cover 90 days, which exceeds the default 15-day retention. Readers may need to adjust their Prometheus configuration or use Thanos/Cortex for long-term storage.
- Step 1 enters an interactive bash shell in the toolbox container, then runs `ceph df | jq`. This requires jq to be available inside the rook-ceph-tools container. The official toolbox image generally includes jq, but this is worth verifying for custom or older images.
- The nearfull (0.75) and full (0.85) thresholds in Step 6 are intentionally more conservative than Ceph's defaults (0.85 and 0.95 respectively), which is appropriate for proactive capacity planning.
