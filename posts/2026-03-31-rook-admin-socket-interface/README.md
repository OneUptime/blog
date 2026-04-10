# How to Use the Admin Socket Interface for Ceph Daemon Querying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Diagnostic, Daemon

Description: Use the Ceph admin socket interface to query live daemon state, list available commands, and retrieve runtime metrics directly from OSD, MON, and MDS processes.

---

Each Ceph daemon exposes a Unix socket for direct runtime queries. The admin socket allows you to retrieve performance counters, check configuration, list in-flight operations, and run diagnostic commands without going through the monitor.

## Locate the Admin Socket

In a Rook environment, admin sockets are created inside the daemon containers. For an OSD:

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ls /var/run/ceph/
```

Typical socket names:
- OSD: `ceph-osd.0.asok`
- MON: `ceph-mon.a.asok`
- MDS: `ceph-mds.myfs-a.asok`
- MGR: `ceph-mgr.a.asok`

## List Available Admin Socket Commands

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph --admin-daemon /var/run/ceph/ceph-osd.0.asok help
```

Or use the `ceph daemon` shorthand from within the daemon pod:

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph daemon osd.0 help
```

Sample commands available:

```text
config show        - Show current configuration
config get <key>   - Get a specific config key
dump_ops_in_flight - List in-progress operations
dump_blocked_ops   - List blocked operations
perf dump          - Performance counters
perf reset         - Reset performance counters
status             - Daemon status summary
flush_journal      - Flush the journal
```

## Query OSD Configuration

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph daemon osd.0 config show | python3 -m json.tool | head -30
```

Get a specific config key:

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph daemon osd.0 config get osd_max_write_size
```

## Dump In-Flight OSD Operations

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph daemon osd.0 dump_ops_in_flight
```

This lists all active RADOS operations being processed by the OSD, useful for finding slow or stuck I/O.

## Query Monitor Admin Socket

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-mon,ceph_daemon_id=a -o name) \
  -c mon -- ceph daemon mon.a status
```

## Query MDS Admin Socket

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-mds -o name | head -1) \
  -c mds -- ceph daemon mds.myfs-a status

# Check MDS cache utilization
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-mds -o name | head -1) \
  -c mds -- ceph daemon mds.myfs-a cache status
```

## Retrieve Performance Counters

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph daemon osd.0 perf dump | python3 -m json.tool | grep -A3 '"op"'
```

Reset counters after capturing a baseline:

```bash
kubectl exec -n rook-ceph \
  $(kubectl get pod -n rook-ceph -l app=rook-ceph-osd,ceph_daemon_id=0 -o name) \
  -c osd -- ceph daemon osd.0 perf reset all
```

## Summary

The Ceph admin socket interface provides direct access to live daemon state through Unix socket files in `/var/run/ceph/`. In Rook environments, exec into the specific daemon pod and use `ceph daemon <daemon-name> <command>` to list in-flight operations, query runtime configuration, and retrieve performance counters without affecting cluster operations. Admin socket queries are invaluable for diagnosing slow I/O and configuration drift.
