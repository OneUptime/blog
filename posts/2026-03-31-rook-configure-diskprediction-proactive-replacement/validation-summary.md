# Validation Summary: How to Configure DiskPrediction for Proactive Disk Replacement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (devicehealth manager module)
- Ceph DiskPrediction (local and cloud prediction)
- Rook (Kubernetes Ceph operator)
- SMART disk monitoring
- Prometheus monitoring

## Sources Consulted
- Ceph devicehealth module source code (main branch): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Ceph Device Management documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph Health Checks documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph diskprediction documentation: https://github.com/ceph/ceph/blob/main/doc/mgr/diskprediction.rst
- Ceph Prometheus module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py

## Issues Found

1. **Invalid `prediction_mode` config option (line 33)**: The post used `ceph config set mgr mgr/devicehealth/prediction_mode local`, but `prediction_mode` is not a devicehealth module option. The correct global option is `device_failure_prediction_mode`, set via `ceph config set global device_failure_prediction_mode local`. Fixed the command and updated the comment.

2. **Threshold values in wrong units (lines 59-63)**: `warn_threshold` and `mark_out_threshold` accept values in **seconds**, not days. The original post set values of `14` and `7`, which would mean 14 and 7 seconds respectively. Fixed to `1209600` (14 days in seconds) and `604800` (7 days in seconds).

3. **Fabricated Prometheus metric (line 107)**: `ceph_device_health_forecast_score` is not a real Ceph Prometheus metric. The Ceph Prometheus module does not export device health prediction metrics. Replaced with the actual Ceph health check names (`DEVICE_HEALTH`, `DEVICE_HEALTH_TOOMANY`, `DEVICE_HEALTH_IN_USE`) which are the standard way device health predictions surface in monitoring.

4. **Outdated `diskprediction_cloud` module (lines 46-52)**: The `diskprediction_cloud` module was removed after Ceph Octopus (v15) and is not available in Pacific (v16) or later releases. Added a note clarifying this deprecation so readers on modern Ceph versions are not misled.

## Review Notes
- The `self_heal` option defaults to `True` in current Ceph versions (verified in source). The post implies it needs to be explicitly enabled, which is slightly misleading but not incorrect since explicitly setting it is harmless and documents the intent.
- The `warn_threshold` default is 7257600 seconds (84 days) and `mark_out_threshold` default is 2419200 seconds (28 days). The post's chosen values of 14 days and 7 days are more aggressive than defaults, which is a valid operational choice.
- The `diskprediction_local` module still exists in current Ceph releases but the local prediction functionality is also integrated into the `devicehealth` module when `device_failure_prediction_mode` is set to `local`.
- The Rook-specific kubectl commands and workflow are correct for standard Rook-Ceph deployments.
