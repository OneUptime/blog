# Validation Summary: How to Handle Backfill Stuck at backfillfull Threshold in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph OSD management and PG states
- Ceph configuration and monitoring
- Prometheus (for capacity monitoring)

## Sources Consulted
- Ceph Monitor Config Reference — https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph Health Checks documentation — https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Control Commands — https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph source code (MonCommands.h, options definitions) — https://github.com/ceph/ceph
- Red Hat Ceph Storage 4 Administration Guide — https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/administration_guide/
- Ceph man page (ceph CLI) — https://www.mankier.com/8/ceph

## Issues Found

1. **Incorrect description of backfillfull default (line 12)**: The post stated that `backfillfull` ratio "defaults to 90% of `full_ratio`". This is incorrect — `backfillfull_ratio` is an independent setting that defaults to 0.90 (90% of OSD capacity), not a derived value from `full_ratio`. If it were 90% of `full_ratio` (0.95), it would be 0.855, not 0.90. Fixed to clearly state it defaults to 0.90 (90% of OSD capacity) and that `full_ratio` is a separate setting.

2. **Contradictory section heading (line 47)**: The heading read "Temporarily Lower backfillfull Ratio" but the code and explanation raise the ratio from 0.90 to 0.92 to give backfill more headroom. Lowering the ratio would make the problem worse. Fixed heading to "Temporarily Raise backfillfull Ratio".

3. **Invalid `reweight-by-utilization` threshold (line 87)**: The command `ceph osd reweight-by-utilization 95` uses an invalid threshold. The `ceph osd reweight-by-utilization` command requires a threshold >= 100, representing a percentage of average utilization. The default is 120 (meaning OSDs above 120% of average are reweighted). A value of 95 would be rejected by Ceph. Changed to 110 with updated comment.

## Review Notes
- The column numbers used in `ceph osd df` piped commands (`sort -k7`, `awk '$8 > 90'`) are version-dependent. Older Ceph versions had fewer columns (no CLASS, OMAP, META), so column 7 may have been correct historically. In modern Ceph (Reef/Squid), `%USE` is around column 11. Readers should verify column positions for their version.
- The post uses `ceph config set/get` to manage fill ratios. While this works via the centralized config database, the more direct approach for a running cluster is `ceph osd set-backfillfull-ratio <float>`, `ceph osd set-full-ratio <float>`, and `ceph osd set-nearfull-ratio <float>`. These commands modify the OSD map directly and take effect immediately.
- The prevention section uses `mon_osd_nearfull_ratio` as the config key (with `mon_` prefix) while the diagnostic section uses `osd_backfillfull_ratio` (without prefix). Both forms may work depending on the Ceph version, but consistency and using the `ceph osd set-nearfull-ratio` command would be clearer.
- The Rook CephCluster YAML for adding storage is correct for the Rook v1 API.
