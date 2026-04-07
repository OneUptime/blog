# Validation Summary: How to Recover from Accidental OSD Data Corruption

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (OSD, placement groups, scrubbing, deep scrub)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl)
- SMART disk health monitoring (smartctl)

## Sources Consulted
- Ceph official documentation on placement group repair: https://docs.ceph.com/en/latest/rados/operations/pg-repair/
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph official documentation on configuration: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation on device health: https://docs.ceph.com/en/latest/mgr/devicehealth/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Incorrect `deep_scrub_interval` command**: The post used `ceph osd pool set <pool-name> deep_scrub_interval 604800`, which is invalid because `deep_scrub_interval` is not a pool-level property. It is a global/OSD-level configuration option. Changed to `ceph config set global osd_deep_scrub_interval 604800`.

## Review Notes
- The `mark_unfound_lost` command in the "When Repair Fails" section is correctly used as a last resort for unfound objects, though readers should note the distinction between "inconsistent" PGs (scrub mismatch) and "unfound" objects (no copy locatable). The scenario described (all replicas corrupt or unavailable) can indeed lead to unfound objects, making this advice appropriate.
- All other commands (`ceph health detail`, `ceph pg repair`, `ceph pg map`, `ceph pg query`, `ceph pg deep-scrub`, `ceph mgr module enable devicehealth`) are correct and current.
- The Rook-specific workflow using the toolbox deployment is accurate.
