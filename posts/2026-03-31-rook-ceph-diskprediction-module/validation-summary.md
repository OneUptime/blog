# Validation Summary: How to Use the DiskPrediction Module in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage cluster)
- Rook (Kubernetes operator for Ceph)
- Ceph Manager DiskPrediction module (diskprediction_local)
- SMART disk health monitoring
- Prometheus alerting (PrometheusRule CRD)
- kubectl

## Sources Consulted
- Ceph diskprediction module documentation: https://github.com/ceph/ceph/blob/main/doc/mgr/diskprediction.rst
- Ceph diskprediction_local source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/diskprediction_local/module.py
- Ceph device management documentation: https://github.com/ceph/ceph/blob/main/doc/rados/operations/devices.rst
- Ceph devicehealth module source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Ceph Prometheus module source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Octopus release notes (diskprediction_cloud removal)

## Issues Found

1. **`diskprediction_cloud` presented as currently available**: The post listed both `diskprediction_local` and `diskprediction_cloud` as current modules. `diskprediction_cloud` was removed in Ceph Octopus (v15, 2020) because the ProphetStor service became inaccessible. Fixed by noting it is historical/removed.

2. **Missing `device_failure_prediction_mode` configuration step**: The post omitted the required step `ceph config set global device_failure_prediction_mode local` after enabling the module. Added this command to the enabling section.

3. **Wrong default for `predict_interval`**: The post stated the default was 600 seconds. The actual default is 86400 seconds (1 day). Fixed the default value and example.

4. **Non-existent `predict_base_dir` config option**: The post referenced `mgr/diskprediction_local/predict_base_dir` which does not exist. The actual module options are `predict_interval`, `sleep_interval`, and `predictor_model`. Replaced with the real `sleep_interval` option.

5. **Wrong command `ceph device get-predicted-life-expectancy`**: This command does not exist. The correct command is `ceph device predict-life-expectancy`. Fixed in both the code block and the summary.

6. **Fabricated JSON output format**: The sample output showed a JSON object with `device_id`, `near_death`, `life_expectancy_min`, and `life_expectancy_max` fields, which does not match actual output. The module classifies devices into time-range categories (`>6w`, `>=2w and <=6w`, `<2w`). Replaced the fabricated output with an accurate description of the prediction categories.

7. **Wrong command for SMART data**: `ceph device info` shows device location/daemon information, not SMART metrics. The correct command for SMART data is `ceph device get-health-metrics`. Fixed the command.

8. **Non-existent Prometheus metric `ceph_device_health_score`**: This metric does not exist in the Ceph Prometheus exporter. Device failure predictions surface through health checks (`DEVICE_HEALTH`) which appear in the `ceph_health_detail` metric. Fixed the PrometheusRule to alert on `ceph_health_detail{name="DEVICE_HEALTH"}`.

## Review Notes
- The `diskprediction_local` module depends on `scipy` and `sklearn`, which may not be available in all container-based Ceph deployments (e.g., Rook). Users may need to ensure these Python packages are installed in the Ceph manager container for the module to function.
- The module's prediction accuracy is reported to be around 70%, which users should be aware of when relying on its predictions for operational decisions.
- The module is still present in Ceph through Tentacle (v20), but its long-term maintenance status is uncertain given its dependencies and modest accuracy.
