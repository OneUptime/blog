# Validation Summary: How to Identify Hot Spots in Ceph Data Distribution

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (OSD management, CRUSH maps, PG distribution)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring queries for Ceph metrics)
- kubectl (Kubernetes CLI)
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation: OSD management commands (`ceph osd df`, `ceph osd tree`, `ceph osd reweight`) — https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph official documentation: Placement Groups — https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation: CRUSH map management — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph MGR Prometheus module metric names — https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph official documentation: `reweight-by-utilization` and `test-reweight-by-utilization` — https://docs.ceph.com/en/latest/rados/operations/control/#reweight-by-utilization

## Issues Found

1. **Incorrect PG-per-OSD counting command**: The `ceph pg dump | awk '/^[0-9]/{print $NF}'` command extracts the acting set as a whole (e.g., `[0,1,2]`), so `uniq -c` counts unique acting set combinations rather than PGs per individual OSD. Removed this unreliable command and promoted the `ceph osd df --format json` approach as the primary method, which directly provides per-OSD PG counts.

2. **Non-existent Prometheus metric**: `ceph_osd_utilization` is not a standard metric exported by the Ceph MGR Prometheus module. Replaced with `ceph_osd_stat_bytes_used / ceph_osd_stat_bytes` which correctly computes OSD utilization from the standard exported metrics.

3. **Wrong command for comparing weight and reweight**: The post used `ceph osd crush tree --show-shadow` and claimed it shows both `weight` and `reweight` columns. This command shows the CRUSH hierarchy with CRUSH weights but does not display the OSD `reweight` value. Changed to `ceph osd tree` which displays both `WEIGHT` (CRUSH weight) and `REWEIGHT` columns side by side.

4. **Incorrect dry-run command**: `ceph osd reweight-by-utilization 120 0 0 --no-increasing` was labeled as a dry run, but this command actually applies changes (it just prevents increasing weights of underutilized OSDs). The correct dry-run command is `ceph osd test-reweight-by-utilization 120`. Fixed to use the proper dry-run command.

## Review Notes
- The `ceph osd reweight` command (used in the "Reweight a specific OSD" example) sets the OSD reweight value which is distinct from the CRUSH weight set by `ceph osd crush reweight`. The post correctly uses `ceph osd reweight` for runtime PG distribution adjustment. This distinction could be made more explicit in a future revision.
- The Prometheus queries use `rate(...[1h])` which is valid but may need adjustment depending on the scrape interval configuration. This is correct as written.
- The PG autoscaler section is accurate for Ceph Nautilus (14.x) and later versions.
