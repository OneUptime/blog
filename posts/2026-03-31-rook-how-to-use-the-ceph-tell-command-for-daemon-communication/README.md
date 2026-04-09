# How to Use the ceph tell Command for Daemon Communication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Administration, CLI, Storage

Description: Use the ceph tell command to send runtime configuration changes and queries directly to specific Ceph daemons without restarting them.

---

## What is the ceph tell Command

The `ceph tell` command allows administrators to send commands directly to specific Ceph daemons - bypassing the usual cluster-wide commands. This is especially useful when you need to interact with a particular OSD, monitor, or MDS daemon for debugging, configuration changes, or operational tasks.

The basic syntax is:

```bash
ceph tell <type>.<id> <command> [args...]
```

Where `<type>` is the daemon type (`osd`, `mon`, `mds`, `mgr`) and `<id>` is the daemon's numeric or named identifier.

## Sending Commands to Specific OSDs

### Checking OSD Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.0 config get osd_max_backfills
```

```text
{
    "osd_max_backfills": "1"
}
```

### Setting OSD Configuration at Runtime

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.0 config set osd_max_backfills 2
```

### Getting OSD Performance Stats

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.0 perf dump
```

This returns detailed performance counters for that specific OSD.

### Flushing OSD Journals (FileStore Only)

Note: The `flush_journal` command only applies to OSDs using FileStore. Rook and modern Ceph deployments use BlueStore by default, which does not have a traditional journal.

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.0 flush_journal
```

### Triggering a Scrub on a Specific OSD

Scrub operations are not `ceph tell` subcommands. Use `ceph osd scrub` or `ceph pg scrub` instead:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd scrub 0
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd deep-scrub 0
```

### Wildcard - Send to All OSDs

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* config set osd_recovery_max_active 2
```

## Sending Commands to Monitors

### Getting Monitor Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mon.a config get mon_osd_down_out_interval
```

```text
{
    "mon_osd_down_out_interval": "600"
}
```

### Checking Monitor Stats

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mon.a mon_status
```

```text
{
    "name": "a",
    "rank": 0,
    "state": "leader",
    "election_epoch": 10,
    "quorum": [0, 1, 2],
    "outside_quorum": [],
    "extra_probe_peers": []
}
```

### Listing All Monitors

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mon.* version
```

## Sending Commands to MDS Daemons

### Listing MDS Client Sessions

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.0 client ls
```

### Getting MDS Cache Stats

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.0 cache status
```

```text
{
    "pool_miss": 0,
    "pool_hit": 12345,
    "dn_cache": {
        "size": 1024,
        "capacity": 16384
    }
}
```

### Setting MDS Cache Size at Runtime

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mds.0 config set mds_cache_memory_limit 4294967296
```

## Sending Commands to the Manager

### Listing Active Modules

Module listing is a monitor command, not an admin socket command. Use `ceph mgr module ls` instead of `ceph tell`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mgr module ls
```

### Getting Manager Stats

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell mgr.a perf dump
```

## Using ceph tell for Debugging

Get detailed logs or dump state for diagnosis:

```bash
# Dump OSD state for debugging
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.2 dump_historic_ops

# Check OSD slow request queue
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.2 dump_ops_in_flight
```

```text
{
    "num_ops": 2,
    "ops": [
        {
            "description": "osd_op(client.12345 pg 2.3 [write 0~4096] snapc 1=[] ondisk+write e100)",
            "initiated_at": "2026-03-31T10:00:00.000000+0000",
            "age": 12.345,
            "duration": 12.345,
            "type_data": {}
        }
    ]
}
```

## Summary

The `ceph tell` command is a powerful tool for targeting specific Ceph daemons with configuration changes, queries, and operational commands. It supports wildcard patterns (`osd.*`) for broadcasting to all daemons of a type, making it useful for both targeted debugging and cluster-wide configuration adjustments at runtime without requiring daemon restarts.
