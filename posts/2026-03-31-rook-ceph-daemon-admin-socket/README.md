# How to Use the ceph daemon Command for Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Administration, Kubernetes, Storage, Debugging

Description: Learn how to use the ceph daemon command with admin sockets to inspect and control individual Ceph daemons at runtime without restarting them.

---

## Overview

The `ceph daemon` command provides a direct interface to running Ceph daemons through Unix domain sockets called admin sockets. Unlike most Ceph commands that go through the monitor, `ceph daemon` talks directly to a specific daemon process. This is especially useful for live debugging, configuration tuning, and performance profiling without cluster-wide impact.

## Locating Admin Sockets

Each Ceph daemon creates a socket file in `/var/run/ceph/`. When running in Rook on Kubernetes, you access these via `kubectl exec` into the relevant pod.

```bash
# List available admin sockets on an OSD pod
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- ls /var/run/ceph/

# Output example:
# ceph-osd.0.asok
```

## Basic Syntax

```bash
ceph daemon <socket-path-or-daemon-name> <command>
```

You can reference a daemon by its socket path or by its daemon identifier (e.g., `osd.0`).

## Inspecting OSD Configuration at Runtime

```bash
# Get all config values for OSD 0
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 config show

# Get a specific config option
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 config get osd_max_backfills
```

## Modifying Configuration Temporarily

You can apply live config changes without a cluster restart using `config set`:

```bash
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 config set osd_max_backfills 2
```

This change persists only until the daemon restarts. For permanent changes, use a ConfigMap or the `ceph config set` command.

## Dumping OSD Performance Counters

```bash
# View real-time performance stats
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 perf dump

# Reset performance counters
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 perf reset all
```

## Accessing Monitor Admin Socket

```bash
# Find the monitor pod
MON_POD=$(kubectl get pods -n rook-ceph -l app=rook-ceph-mon -o jsonpath='{.items[0].metadata.name}')

# List available monitor commands
kubectl exec -n rook-ceph $MON_POD -- ceph daemon mon.a help

# Get the monitor's status including quorum and monmap information
kubectl exec -n rook-ceph $MON_POD -- ceph daemon mon.a mon_status
```

## Checking MDS State

```bash
MDS_POD=$(kubectl get pods -n rook-ceph -l app=rook-ceph-mds -o jsonpath='{.items[0].metadata.name}')

# Discover the MDS daemon name (Rook names them after the filesystem, e.g., mds.myfs-a)
kubectl exec -n rook-ceph $MDS_POD -- ls /var/run/ceph/

kubectl exec -n rook-ceph $MDS_POD -- ceph daemon mds.myfs-a status
kubectl exec -n rook-ceph $MDS_POD -- ceph daemon mds.myfs-a dump_historic_ops
```

## Practical Use Case: Throttling Recovery

If your cluster is under heavy client load, you can use the daemon command to dial back recovery without a full config change:

```bash
kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 config set osd_recovery_max_active 1

kubectl exec -n rook-ceph rook-ceph-osd-0-7d6f9b8c4d-xxxxx -- \
  ceph daemon osd.0 config set osd_recovery_sleep 0.1
```

This lets you prioritize client I/O during business hours and revert during off-peak windows.

## Summary

The `ceph daemon` command provides direct, socket-level access to individual Ceph daemons for runtime inspection and live configuration. Using it through `kubectl exec` in Rook environments allows targeted debugging without affecting the entire cluster. It is an essential tool for Ceph operators who need granular control during incidents or performance tuning sessions.
