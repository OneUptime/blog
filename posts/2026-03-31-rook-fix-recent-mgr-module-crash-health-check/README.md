# How to Fix RECENT_MGR_MODULE_CRASH Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Manager, Health Check, Module

Description: Learn how to resolve RECENT_MGR_MODULE_CRASH in Ceph, a warning that a Ceph Manager module has crashed recently due to a Python exception or module error.

---

## What Is RECENT_MGR_MODULE_CRASH?

`RECENT_MGR_MODULE_CRASH` is a Ceph health warning that fires when a Ceph Manager (MGR) Python module has raised an unhandled exception or crashed within the recent warning interval. The Ceph Manager runs multiple Python modules that provide features like the PG autoscaler, dashboard, Prometheus exporter, device health monitoring, and more. When a module crashes, its functionality is lost until it is restarted or the MGR fails over.

This is distinct from `RECENT_CRASH` (which covers all daemon crashes) - `RECENT_MGR_MODULE_CRASH` specifically targets Python module exceptions within the MGR daemon.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] RECENT_MGR_MODULE_CRASH: 1 mgr modules have recently crashed
    mgr module 'devicehealth' crashed on 2026-03-28T10:00:00Z
```

Get crash details:

```bash
ceph crash ls
ceph crash info <crash-id>
```

Check the MGR logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-mgr | grep -i "crash\|error\|exception\|traceback"
```

## Identifying the Affected Module

The crash report will identify which module crashed:

```bash
ceph crash info <crash-id> | python3 -m json.tool | grep -E "module|exception|traceback"
```

Check active module status:

```bash
ceph mgr module ls
```

## Fix Steps

### Step 1 - Acknowledge the Crash

Clear the warning by archiving the crash:

```bash
ceph crash archive <crash-id>
```

Or archive all crashes:

```bash
ceph crash archive-all
```

### Step 2 - Disable and Re-enable the Crashing Module

If a specific module keeps crashing, restart it by disabling and re-enabling:

```bash
ceph mgr module disable devicehealth
ceph mgr module enable devicehealth
```

### Step 3 - Restart the MGR Daemon

If the module crash corrupted the MGR state:

```bash
kubectl -n rook-ceph rollout restart deploy/rook-ceph-mgr-a
```

### Step 4 - Fail Over to Standby MGR

Ceph typically has a standby MGR. Force a failover:

```bash
ceph mgr fail
```

The standby MGR becomes active with fresh module state.

### Step 5 - Investigate the Root Cause

Check what triggered the Python exception:

```bash
ceph crash info <crash-id> | python3 -m json.tool | grep -A 30 "backtrace"
```

Common causes:
- Network timeouts during module operations
- Mon store or RADOS access errors
- Invalid pool or OSD state during module iteration
- Memory pressure causing Python GC issues

### Step 6 - Update Ceph Version

Module crashes are often fixed in newer Ceph patches:

```bash
ceph version
```

Update the Ceph version in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.4
```

## Monitoring Module Health

```bash
ceph mgr module ls
watch "ceph mgr module ls | grep -E 'enabled|error'"
```

## Summary

`RECENT_MGR_MODULE_CRASH` warns that a Ceph Manager Python module has crashed. Archive the crash to clear the warning, then disable and re-enable the affected module or restart the MGR daemon. Investigate the crash backtrace to identify if it is a code bug (worth reporting upstream), a configuration issue, or a transient error. Keeping Ceph updated to the latest patch release prevents many known module crash bugs.
