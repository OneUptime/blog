# How to Monitor OSD Disk Health with smartmontools in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Disk Health, smartmontools

Description: Learn how to use smartmontools to monitor OSD disk health in Ceph clusters and integrate SMART data with Ceph's device health monitoring.

---

## Why Monitor OSD Disk Health

Disk failures are the primary cause of OSD downtime in Ceph clusters. S.M.A.R.T. (Self-Monitoring, Analysis, and Reporting Technology) data from drives provides early warning of impending failures - reallocated sectors, pending sectors, and uncorrectable errors are reliable indicators.

Ceph integrates with smartmontools to collect SMART data and generate alerts before drives fail.

## Enabling Ceph Device Health Monitoring

Ceph's device health module queries SMART data automatically when enabled:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable devicehealth

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device ls
```

This lists all devices Ceph is aware of along with their health status.

## Viewing SMART Data via Ceph

Query SMART data for a specific device:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device get-health-metrics <device-id>
```

Get the device ID from `ceph device ls`. Metrics include temperature, power-on hours, and error counters.

## Using smartctl Directly on OSD Nodes

For direct SMART queries, access the OSD node and run `smartctl`:

```bash
# Check overall health
smartctl -H /dev/sdb

# View detailed SMART attributes
smartctl -A /dev/sdb

# View SMART log
smartctl -l error /dev/sdb
```

Key attributes to monitor:

```text
ID  5  - Reallocated Sector Count (non-zero = concern)
ID 187 - Reported Uncorrectable Errors
ID 188 - Command Timeout Count
ID 197 - Current Pending Sector Count
ID 198 - Offline Uncorrectable Sector Count
```

## Running SMART Tests

Schedule short SMART tests to detect emerging issues:

```bash
# Start a short self-test (2-5 minutes)
smartctl -t short /dev/sdb

# Check test results
smartctl -l selftest /dev/sdb
```

## Automating SMART Monitoring with smartd

Install and configure `smartd` for continuous background monitoring:

```text
# /etc/smartd.conf
/dev/sdb -a -o on -S on -s (S/../.././02|L/../../6/03) \
  -m admin@example.com -M exec /usr/share/smartmontools/smartd-runner
```

`-a` enables all monitoring, `-o on` enables offline testing, `-S on` enables attribute autosave.

## Ceph OSD Predicted Failure Alerts

When the device health module detects a degraded device, it generates a health warning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Example warning:

```text
HEALTH_WARN 1 device(s) expected to fail soon
DEVICE_HEALTH osd.3 expected to fail
```

To force a device health check:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph device scrape-health-metrics
```

## Summary

Monitoring OSD disk health with smartmontools and Ceph's device health module provides early warning of drive failures. Enable the `devicehealth` module in Ceph, use `smartctl -A` for detailed attribute inspection, and configure `smartd` for continuous background monitoring. Investigate any non-zero values for reallocated sectors or pending sector counts immediately to prevent data loss.
