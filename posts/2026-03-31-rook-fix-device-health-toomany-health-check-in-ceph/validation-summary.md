# Validation Summary: How to Fix DEVICE_HEALTH_TOOMANY Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Ceph devicehealth manager module
- Ceph OSD management
- Ceph SMART device monitoring
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph devicehealth module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Ceph health checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph device management documentation: https://docs.ceph.com/en/latest/rados/operations/devices/
- Ceph OSD removal documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph dashboard module documentation: https://docs.ceph.com/en/latest/mgr/dashboard/

## Issues Found

1. **Wrong severity level in health output**: The post used `[ERR]` but `DEVICE_HEALTH_TOOMANY` is a warning (`[WRN]`), not an error. Fixed to `[WRN]`.

2. **Fabricated health detail message**: The summary message was written as "Too many unhealthy devices - automatic removal paused" but the actual Ceph source code uses "Too many daemons are expected to fail soon". The detail line was also incorrect. Fixed both to match the actual Ceph output format.

3. **Incorrect explanation of the "too many" logic**: The post claimed the threshold is based on "replication factor or erasure coding configuration" and `min_size`. In reality, the devicehealth module uses `mon_osd_min_in_ratio` (the minimum ratio of "in" OSDs to total OSDs) to decide when to stop marking OSDs out. Fixed the explanation throughout.

4. **Non-existent config option `mgr/devicehealth/max_devices_failed_per_pool`**: This config option does not exist in Ceph. The actual devicehealth module options are: `enable_monitoring`, `scrape_frequency`, `pool_name`, `retention_period`, `mark_out_threshold`, `warn_threshold`, `self_heal`, and `sleep_interval`. The "too many" threshold is controlled by `mon_osd_min_in_ratio`. Fixed to use the correct config key.

5. **Non-existent command `ceph dashboard check-health`**: This command does not exist. The correct command for checking device health is `ceph device check-health`. Fixed.

6. **Incorrect OSD removal procedure**: Multiple issues:
   - `ceph osd down` is not part of the standard removal procedure (the daemon being stopped automatically marks it down).
   - The OSD daemon stop step (`systemctl stop ceph-osd@ID`) was missing entirely.
   - The order of `osd rm` before `crush remove` was wrong (legacy order is: crush remove, auth del, then osd rm).
   - The modern `ceph osd purge` command (available since Luminous, 2017) was not mentioned. Fixed to use `ceph osd purge` and added the daemon stop step.

## Review Notes
- The `ceph device ls` and `ceph device get-health-metrics` commands are correct.
- The `mgr/devicehealth/self_heal` config option and its usage are correct.
- The overall strategy of removing OSDs one at a time and waiting for rebalance is sound advice.
- The post could benefit from mentioning `mark_out_threshold` and `warn_threshold` devicehealth config options for completeness, but this is not a correctness issue.
