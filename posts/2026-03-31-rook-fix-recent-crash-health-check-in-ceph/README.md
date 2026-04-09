# How to Fix RECENT_CRASH Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Crash, Health Check, Daemon

Description: Learn how to resolve RECENT_CRASH in Ceph, a warning that one or more Ceph daemons have crashed recently and the crashes have not been acknowledged.

---

## What Is RECENT_CRASH?

`RECENT_CRASH` is a Ceph health warning that fires when one or more Ceph daemons (OSD, MON, MDS, MGR, or RGW) have crashed within the past `mgr/crash/warn_recent_interval` period (default: 2 weeks) and the crash reports have not been acknowledged. Ceph collects crash reports from all daemons and stores them in the crash module.

The warning persists until each crash is acknowledged, even if the daemon has already recovered. This ensures operators are aware of all recent crashes and their causes.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] RECENT_CRASH: 2 daemons have recently crashed
    osd.3 crashed on host ceph-node-2 at 2026-03-28T14:30:00Z
    mgr.ceph-node-1 crashed on host ceph-node-1 at 2026-03-27T09:15:00Z
```

List all crash reports:

```bash
ceph crash ls
```

## Investigating Crash Reports

Get details of a specific crash:

```bash
ceph crash info <crash-id>
```

Get the full backtrace:

```bash
ceph crash info <crash-id> | python3 -m json.tool | grep -A 20 "backtrace"
```

Check crash logs on the Rook pod that crashed:

```bash
kubectl -n rook-ceph logs rook-ceph-osd-3-<hash> --previous
```

List unarchived (pending) crashes:

```bash
ceph crash ls-new
```

## Common Crash Causes

### OSD Crashes

- Out of memory (OOM)
- Disk I/O errors
- Corrupted BlueStore metadata
- Software bugs

Check OSD memory:

```bash
kubectl -n rook-ceph top pods -l app=rook-ceph-osd
```

### MGR Crashes

- Python module exceptions
- Memory pressure
- Module plugin errors

```bash
ceph mgr module ls
kubectl -n rook-ceph logs -l app=rook-ceph-mgr
```

## Acknowledging Crash Reports

After investigating, acknowledge individual crashes:

```bash
ceph crash archive <crash-id>
```

Acknowledge all pending crashes at once:

```bash
ceph crash archive-all
```

Verify the warning clears:

```bash
ceph health
```

## Preventing Recurring Crashes

After identifying the crash cause, take corrective action:

```bash
ceph config set osd osd_memory_target 8589934592
```

For OSD crashes due to resource limits in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  resources:
    osd:
      requests:
        cpu: "1"
        memory: "4Gi"
      limits:
        cpu: "2"
        memory: "8Gi"
```

## Adjusting Crash Warning Interval

Change the window for which crashes trigger a warning:

```bash
ceph config set mgr mgr/crash/warn_recent_interval 604800
```

## Summary

`RECENT_CRASH` warns that Ceph daemons have crashed recently and crashes have not been reviewed. First investigate each crash report using `ceph crash info`, check daemon logs for the root cause, then archive the crashes with `ceph crash archive-all` to clear the warning. Address underlying causes such as memory limits, disk errors, or software bugs to prevent recurrence.
