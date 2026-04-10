# Validation Summary: How to Use the ceph df Command for Storage Analysis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (storage cluster, `ceph df`, `ceph osd df tree`, pool quotas)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (`kubectl exec` into Rook toolbox)
- Bash scripting (automated capacity alerting)

## Sources Consulted
- Ceph official documentation for `ceph df` command and JSON output schema (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation for pool quotas (`ceph osd pool set-quota`) (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph official documentation for full/nearfull ratios and OSD capacity thresholds (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Rook documentation for toolbox deployment (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

1. **Incorrect JSON field name in alerting script** (line 96): The script referenced `d['stats']['num_bytes_used']` which is not a valid field in the `ceph df --format json` output. The correct field name is `total_used_raw_bytes`. Changed to `d['stats']['total_used_raw_bytes']`.

2. **Inaccurate write-refusal threshold** (line 106): The post claimed "When `%RAW USED` exceeds 85%, Ceph may start refusing writes." This is incorrect. At 85%, Ceph triggers a `nearfull` warning (`HEALTH_WARN`) via the default `mon_osd_nearfull_ratio`. Writes are actually blocked when individual OSDs reach the `full_ratio`, which defaults to 0.95 (95%). Updated the text to accurately describe the nearfull warning and the actual write-blocking threshold.

## Review Notes
- The sample `ceph df` output format is consistent with modern Ceph releases (Nautilus through Reef/Squid).
- The `ceph df detail` additional columns (QUOTA OBJECTS, QUOTA BYTES, DIRTY, USED COMPR, UNDER COMPR) are accurate.
- The pool quota commands (`set-quota`, `get-quota`) use correct syntax.
- The 1099511627776 bytes = 1 TiB calculation is correct (1024^4).
- The 70% planning threshold is a conservative but widely recommended best practice.
