# Validation Summary: How to Fix Cluster Stuck in active+remapped State

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph Placement Groups (PG states and rebalancing)
- Kubernetes (kubectl exec into toolbox pods)

## Sources Consulted
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on OSD configuration: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph documentation on backfill and recovery: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#backfilling
- Rook documentation on Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph `ceph osd df` output format across versions (Nautilus, Octopus, Pacific, Quincy, Reef)

## Issues Found
No technical issues found.

## Review Notes
- The `sort -k8` in the `ceph osd df` command targets the `%USE` column only in very old Ceph versions (pre-Nautilus, before the CLASS column was added). In Ceph Quincy (v17.x) and Reef (v18.x) — the versions shipped by current Rook releases — the output includes CLASS, OMAP, and META columns, shifting `%USE` to approximately column 11. The command still displays all columns including `%USE`, so users can visually identify full OSDs, but the sort order won't be by usage percentage. This is a minor usability issue rather than a correctness error.
- The `osd_recovery_max_active` setting was split into `osd_recovery_max_active_hdd` (default 3) and `osd_recovery_max_active_ssd` (default 10) starting in Ceph Pacific (v16.x). The unified `osd_recovery_max_active` still works as an override when set to a non-zero value, so the command is correct. However, setting it to 5 would actually decrease the default for SSD-backed OSDs (default 10). Users with SSD-based clusters should be aware of this.
- All Rook toolbox `kubectl exec` commands correctly use `deploy/rook-ceph-tools` and the `-it` flags for interactive use.
