# Validation Summary: How to Replace Disks Using SMART Data Predictions in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (devicehealth manager module, OSD management, SMART monitoring)
- Rook (Rook-Ceph operator on Kubernetes)
- Kubernetes (kubectl commands, deployments, jobs)
- Prometheus (alerting rules for device health)
- SMART (Self-Monitoring, Analysis, and Reporting Technology)

## Sources Consulted
- Ceph official documentation on the devicehealth module: https://docs.ceph.com/en/latest/mgr/devicehealth/
- Ceph official documentation on device management CLI: https://docs.ceph.com/en/latest/man/8/ceph-device/
- Ceph official documentation on OSD management: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Rook-Ceph documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/
- Cross-referenced with other validated Rook-Ceph blog posts in this repository (rook-configure-device-health-monitoring-ceph, rook-monitor-ceph-device-health-predictions, rook-check-safe-to-destroy-osds, rook-fix-device-health-in-use-health-check-in-ceph)

## Issues Found

1. **Incorrect config option scope and names for devicehealth module** (CRITICAL): The post used `ceph config set global device_health_scrape_frequency 86400` and `ceph config set global device_health_minimum_life_expectancy 14`. The correct scope is `mgr` (not `global`) and the correct option paths are `mgr/devicehealth/scrape_frequency` and `mgr/devicehealth/warn_threshold`. The option `device_health_minimum_life_expectancy` does not exist. Fixed to `ceph config set mgr mgr/devicehealth/scrape_frequency 86400` and `ceph config set mgr mgr/devicehealth/warn_threshold 14`.

2. **`ceph device info` used instead of `ceph device get-health-metrics`** (MEDIUM): The post used `ceph device info <device-id>` to view SMART data. While `ceph device info` exists, the correct command for retrieving SMART health metrics is `ceph device get-health-metrics <device-id>`. Fixed accordingly.

3. **Non-existent command `ceph device ls-lights`** (CRITICAL): This command does not exist in Ceph. Replaced the entire section with `ceph device ls`, which lists all devices along with their life expectancy and daemon associations.

4. **Non-existent command `ceph device get-daemon-types`** (CRITICAL): This command does not exist in Ceph. Replaced with `ceph device info <device-id>`, which shows device details including associated daemons.

5. **Incorrect OSD CRUSH removal command** (MEDIUM): The post used `ceph osd crush rm osd.<id>` but the correct command is `ceph osd crush remove osd.<id>`. Fixed accordingly.

## Review Notes
- The OSD removal procedure uses the traditional multi-step approach (`osd out`, `osd down`, `osd rm`, `auth del`, `crush remove`). Modern Ceph versions also support the streamlined `ceph osd destroy osd.<id> --yes-i-really-mean-it` command combined with `ceph osd safe-to-destroy osd.<id>` for safety checking. The traditional approach is still valid but operators may prefer the modern method.
- The Prometheus alert rule using `ceph_health_detail{name="DEVICE_HEALTH_TOOMANY"}` is correct. Operators may also want to alert on `DEVICE_HEALTH` and `DEVICE_HEALTH_IN_USE` health checks for more granular monitoring.
- The Rook reprovisioning step (deleting the OSD deployment) is a valid approach. In some Rook versions, restarting the Rook operator may be needed to trigger disk detection for the replacement disk.
