# Validation Summary: How to Monitor OSD Disk Health with smartmontools in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (device health module / `devicehealth`)
- Rook (Kubernetes operator for Ceph)
- smartmontools (`smartctl`, `smartd`)
- S.M.A.R.T. disk health monitoring
- Kubernetes (`kubectl`)

## Sources Consulted
- Ceph Device Management Documentation (Reef): https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph Health Checks Documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph devicehealth module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/devicehealth/module.py
- Ceph Blog - New in Nautilus: Device Management and Failure Prediction: https://ceph.io/en/news/blog/2019/new-in-nautilus-device-management-and-failure-prediction/
- smartctl(8) man page: https://linux.die.net/man/8/smartctl
- smartd.conf(5) man page: https://manpages.debian.org/testing/smartmontools/smartd.conf.5.en.html
- Backblaze - What SMART Stats Tell Us About Hard Drives: https://www.backblaze.com/blog/what-smart-stats-indicate-hard-drive-failures/

## Issues Found
1. **Incorrect Ceph DEVICE_HEALTH warning message format**: The example `ceph health detail` output showed `HEALTH_WARN 1 devices have health metrics` with detail `DEVICE_HEALTH osd.3 expected failure within 5 weeks`. The actual Ceph output uses the message `1 device(s) expected to fail soon` and the detail line does not include a relative time phrase like "within 5 weeks". Fixed to `HEALTH_WARN 1 device(s) expected to fail soon` / `DEVICE_HEALTH osd.3 expected to fail`.

## Review Notes
- The `smartd-runner` script referenced in the smartd.conf example (`/usr/share/smartmontools/smartd-runner`) is Debian/Ubuntu-specific. On other distributions the equivalent is `/usr/share/smartmontools/smartd_warning.sh`. This is acceptable for a tutorial but readers on non-Debian systems should be aware.
- The `devicehealth` module is enabled by default in Ceph Nautilus and later. The explicit `ceph mgr module enable devicehealth` command is still valid and harmless if already enabled, so no change needed.
- All `smartctl` flags (`-H`, `-A`, `-l error`, `-t short`, `-l selftest`) are correct per the smartctl(8) man page.
- All SMART attribute IDs (5, 187, 188, 197, 198) and their names are accurate.
- The `smartd.conf` scheduling regex `(S/../.././02|L/../../6/03)` correctly schedules short tests daily at 2 AM and long tests on Saturdays at 3 AM.
- All Ceph CLI commands (`ceph device ls`, `ceph device get-health-metrics`, `ceph device scrape-health-metrics`) are correct.
