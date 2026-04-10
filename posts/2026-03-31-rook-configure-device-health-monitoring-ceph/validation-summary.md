# Validation Summary: How to Configure Device Health Monitoring in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (device health monitoring, devicehealth manager module)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl commands, CephCluster CRD)
- S.M.A.R.T. (disk health telemetry)

## Sources Consulted
- Ceph Device Management documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph Device Management documentation (latest): https://docs.ceph.com/en/latest/rados/operations/devices/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph devicehealth module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Ceph blog - New in Nautilus: Device Management and Failure Prediction: https://ceph.io/en/news/blog/2019/new-in-nautilus-device-management-and-failure-prediction/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/

## Issues Found

### 1. Wrong config option names and scope throughout
**What was wrong:** All configuration commands used fabricated option names with the pattern `device_health_*` and `global` scope (e.g., `ceph config set global device_health_scrape_frequency`). Ceph devicehealth module options use the format `mgr/devicehealth/<option>` and must be set at the `mgr` scope (e.g., `ceph config set mgr mgr/devicehealth/scrape_frequency`).
**What was changed:** Corrected all config option names and scope to match the official Ceph documentation.

### 2. `device_health_metrics_max_age` does not exist
**What was wrong:** The post used `device_health_metrics_max_age` as the config option for metrics retention. This option does not exist.
**What was changed:** Replaced with the correct option name `mgr/devicehealth/retention_period`.

### 3. Misleading retention period comment
**What was wrong:** The comment said "Retain health metrics history for 86400 seconds per sample" but the value was `8640000` (approximately 100 days).
**What was changed:** Updated comment to "Retain health metrics history for 8640000 seconds (~100 days)".

### 4. Wrong prediction mode option name
**What was wrong:** The post used `device_health_prediction_mode`. The correct global config option is `device_failure_prediction_mode`.
**What was changed:** Fixed to `ceph config set global device_failure_prediction_mode local`. Also updated comment from "linear regression model" to "local prediction model" for accuracy, and corrected the available values to include `cloud` (none, local, cloud).

### 5. Non-existent `device_health_target_daemon` option
**What was wrong:** The post included `ceph config set global device_health_target_daemon osd`. This config option does not exist in Ceph — the devicehealth module inherently targets OSDs.
**What was changed:** Removed the non-existent command entirely.

### 6. `mark_out_threshold` value in wrong unit
**What was wrong:** The post set `device_health_mark_out_threshold` to `14`, implying 14 days. However, this option takes a value in seconds, not days. A value of `14` would mean 14 seconds.
**What was changed:** Changed to `1209600` (14 days * 86400 seconds/day) with a clarifying comment.

### 7. Misleading Rook CephCluster YAML section
**What was wrong:** The post presented the `spec.healthCheck.daemonHealth` YAML as configuring device health monitoring. This section actually controls Rook's daemon-level health checks (mon quorum verification, OSD process liveness, cluster status polling) — not SMART-based device health prediction.
**What was changed:** Updated the description to clarify the distinction. Added the correct `spec.mgr.modules` stanza for enabling the devicehealth module declaratively through the CephCluster CRD.

## Review Notes
- The `devicehealth` module is an "always-on" module in modern Ceph releases (Nautilus+), meaning it is enabled by default. The `ceph mgr module enable devicehealth` command may be unnecessary in practice, though it does no harm to run.
- The `cloud` prediction mode (ProphetStor CloudPrediction service) is deprecated and should not be used for new deployments.
- The `ceph device` CLI commands (ls, get-health-metrics, scrape-health-metrics, predict-life-expectancy) are all correct and verified against official documentation.
- The `DEVICE_HEALTH` warning code and example message are accurate. Related warning codes include `DEVICE_HEALTH_IN_USE` and `DEVICE_HEALTH_TOOMANY`.
