# How to Configure Crash Report Retention in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Crash Report, Storage, Configuration

Description: Learn how to configure Ceph crash report retention settings to control how long crash data is stored, when health warnings expire, and how to clean up old reports.

---

## Crash Report Retention Overview

Ceph stores crash reports in the crash module's internal database and optionally in the crash directory on each host. By default, crash reports generate a health warning if they are newer than a configurable retention window.

Key configuration parameters:
- `mgr/crash/warn_recent_interval` - how long to warn about recent crashes
- `mgr/crash/retain_interval` - how long to keep crash reports

## Checking Current Retention Settings

```bash
ceph config get mgr mgr/crash/warn_recent_interval
ceph config get mgr mgr/crash/retain_interval
```

Default values:
- `warn_recent_interval`: 1209600 seconds (14 days)
- `retain_interval`: 31536000 seconds (365 days)

## Configuring Warning Interval

Set how long a crash report keeps generating a health warning:

```bash
# Warn about crashes for 7 days instead of 14
ceph config set mgr mgr/crash/warn_recent_interval 604800
```

Disable warnings entirely (not recommended for production):

```bash
ceph config set mgr mgr/crash/warn_recent_interval 0
```

## Configuring Retention Period

Set how long crash reports are retained in the database:

```bash
# Keep crash reports for 90 days
ceph config set mgr mgr/crash/retain_interval 7776000
```

Keep crash reports indefinitely:

```bash
ceph config set mgr mgr/crash/retain_interval 0
```

## Manually Archiving Crash Reports

Archive a specific crash to suppress its health warning:

```bash
ceph crash archive <crash-id>
```

Archive all crash reports:

```bash
ceph crash archive-all
```

## Pruning Old Crash Reports

Remove crash reports older than the retention period:

```bash
ceph crash prune <keep-days>
```

Example: remove all crashes older than 30 days:

```bash
ceph crash prune 30
```

List remaining crashes:

```bash
ceph crash ls
```

## Crash File Retention on OSD Hosts

Crash files are also stored locally on each Ceph host. In Rook, these are inside the OSD pod's filesystem or on the host via `hostPath`. Clean up old crash files:

```bash
find /var/lib/ceph/crash -mindepth 1 -maxdepth 1 -type d -not -name "posted" -mtime +30 -exec rm -rf {} +
```

For Rook OSD pods, this path is typically inside the container:

```bash
kubectl -n rook-ceph exec -it rook-ceph-osd-0-<pod-id> -- \
  ls /var/lib/ceph/crash/
```

## Automating Crash Cleanup

Create a CronJob to prune old crashes weekly:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-crash-prune
  namespace: rook-ceph
spec:
  schedule: "0 2 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: tools
            image: rook/ceph:latest
            command:
            - ceph
            - crash
            - prune
            - "30"
          restartPolicy: OnFailure
```

## Summary

Ceph crash report retention is controlled by `warn_recent_interval` and `retain_interval` configuration parameters. Archiving crashes suppresses health warnings while keeping the data for later analysis. Regular pruning via `ceph crash prune` or automated CronJobs prevents the crash database from growing unbounded in long-running clusters.
