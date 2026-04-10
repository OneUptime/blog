# How to Analyze Crash Reports in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Crash Report, Debugging, Storage

Description: Learn how to find, inspect, and analyze Ceph crash reports to diagnose daemon failures and understand the root cause of OSD, MON, and MGR crashes.

---

## What Are Ceph Crash Reports?

When a Ceph daemon crashes (OSD, MON, MGR, MDS, or RGW), it writes a crash report to the crash directory and optionally sends it to the crash module. These reports contain stack traces, version information, and contextual data to help diagnose the failure.

## Listing Crash Reports

List all recorded crashes:

```bash
ceph crash ls
```

Example output:

```text
2026-03-10_14:23:01.123456Z_osd.5
2026-03-09_08:11:44.654321Z_mgr.a
```

List unacknowledged crashes:

```bash
ceph crash ls-new
```

This shows crashes that have not yet been acknowledged.

## Viewing Crash Details

Inspect a specific crash report:

```bash
ceph crash info <crash-id>
```

Example output includes:

```json
{
  "crash_id": "2026-03-10_14:23:01.123456Z_osd.5",
  "timestamp": "2026-03-10T14:23:01.123456Z",
  "process_name": "ceph-osd",
  "entity_name": "osd.5",
  "ceph_version": "17.2.7",
  "backtrace": [
    "ceph-osd(+0x1234ab) [0x55abc1234ab]",
    "...stack frames..."
  ]
}
```

## Extracting Key Information from Crashes

Parse crash details for the most important fields:

```bash
ceph crash info <crash-id> | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('Process:', d.get('process_name'))
print('Entity:', d.get('entity_name'))
print('Version:', d.get('ceph_version'))
print('OS:', d.get('os_name'), d.get('os_version'))
print('Backtrace:')
for frame in d.get('backtrace', [])[:5]:
    print(' ', frame)
"
```

## Identifying Crash Patterns

Check if the same daemon is crashing repeatedly:

```bash
ceph crash ls | grep osd.5
```

Check for crashes within a time window:

```bash
ceph crash stat
```

Output shows crash counts by daemon type:

```text
2 crashes recorded
   1 osd
   1 mgr
```

## Acknowledging Crashes

After investigating, mark crashes as acknowledged to prevent health warnings:

```bash
ceph crash archive <crash-id>
ceph crash archive-all
```

Verify health warning is cleared:

```bash
ceph health
```

## Analyzing OSD Crash Logs in Rook

OSD crash logs are also available in the pod logs in Rook:

```bash
kubectl -n rook-ceph logs rook-ceph-osd-5-<pod-id> --previous
```

Get crash directory contents from the OSD pod:

```bash
kubectl -n rook-ceph exec -it rook-ceph-osd-5-<pod-id> -- \
  ls /var/lib/ceph/crash/posted/
```

Access all crash data via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph crash ls
```

## Summary

Ceph crash reports provide stack traces and contextual data for diagnosing daemon failures. The `ceph crash ls`, `ceph crash info`, and `ceph crash stat` commands give operators visibility into crash frequency and patterns. Archiving crashes after investigation clears health warnings. In Rook environments, both the toolbox pod and Kubernetes pod logs provide access to crash information.
