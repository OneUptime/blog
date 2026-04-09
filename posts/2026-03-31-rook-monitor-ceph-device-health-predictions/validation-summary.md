# Validation Summary: How to Monitor Ceph Device Health Predictions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (device health module / devicehealth manager module)
- SMART (Self-Monitoring, Analysis and Reporting Technology)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph Device Management documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph Health Checks reference (Reef): https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph devicehealth module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py

## Issues Found
- **Threshold config values were in the wrong unit.** The `mgr/devicehealth/warn_threshold` and `mgr/devicehealth/mark_out_threshold` config options expect values in **seconds**, not days. The post originally used `14` and `7` (implying days), which would actually set the thresholds to 14 seconds and 7 seconds respectively. Fixed to `1209600` (14 days in seconds) and `604800` (7 days in seconds), and updated the comments to clarify the unit.

## Review Notes
- `ceph device check-health` is a valid command that re-evaluates stored life expectancy data and generates health alerts. It does not scrape new SMART metrics from devices — that is done by `ceph device scrape-health-metrics`. The blog's usage context ("manually trigger a device health check") is acceptable since it accurately describes what the command does.
- The `self_heal` option defaults to `True` in recent Ceph versions (Reef). The blog's instruction to enable it is still useful for environments where it may have been disabled or for older Ceph releases where the default was `False`.
- All other commands (`ceph device ls`, `ceph device info`, `ceph device get-health-metrics`, `ceph device scrape-health-metrics`, `ceph osd out/safe-to-destroy/destroy`) are correct.
- Health check codes `DEVICE_HEALTH` and `DEVICE_HEALTH_TOOMANY` are valid Ceph health check identifiers.
- The Rook toolbox access pattern via `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools` is correct.
