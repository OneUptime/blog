# Validation Summary: How to Fix DEVICE_HEALTH Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- SMART (Self-Monitoring, Analysis and Reporting Technology)
- Ceph Manager `devicehealth` module
- Kubernetes (kubectl)

## Sources Consulted
- Ceph Device Management documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph devicehealth module source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Rook Ceph OSD management documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/

## Issues Found
- **Wrong argument for `ceph device get-health-metrics`**: The post used `ceph device get-health-metrics osd.5`, but this command expects a device ID (in `vendor_model_serial` format, e.g. `SEAGATE_ST8000NM0055_ZA11PC3S`), not an OSD name. Fixed by replacing with a two-step process: first `ceph device ls-by-daemon osd.5` to get the device ID, then `ceph device get-health-metrics <device-id>` to query health metrics.

## Review Notes
- The OSD removal sequence uses the manual four-command approach (`osd down`, `osd rm`, `osd crush remove`, `auth del`). Modern Ceph (Luminous+) offers `ceph osd purge osd.5 --yes-i-really-mean-it` as a single-command alternative. Both approaches are valid.
- The `ceph osd down osd.5` command only marks the OSD as down in the cluster map; it does not stop the OSD daemon process. In a Rook/Kubernetes environment, stopping the OSD pod would typically be handled by the operator during the removal workflow.
- The Rook OSD removal ConfigMap approach shown may vary by Rook version. Newer Rook versions may use a different mechanism (e.g., CephCluster CR updates or purge jobs).
- The `mgr/devicehealth/scrape_frequency`, `mark_out_threshold`, and `warn_threshold` config options were verified as correct, including the time period string format (`6w`, `2w`).
