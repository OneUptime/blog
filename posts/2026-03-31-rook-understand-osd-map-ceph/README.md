# How to Understand the OSD Map in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Storage, Cluster, Architecture

Description: Understand what the Ceph OSD map contains, how it is distributed, and how to inspect it to diagnose cluster state and placement group issues.

---

The OSD map is one of the core cluster maps that Ceph monitors maintain and distribute to all cluster daemons and clients. It records the current state of every OSD and drives placement group (PG) calculations.

## What the OSD Map Contains

The OSD map stores:

- The cluster FSID
- The epoch number (incremented on every change)
- All OSD entries with their state (`up`/`down`, `in`/`out`) and weight
- CRUSH device class assignments
- Blocklisted client addresses
- Cluster-wide OSD flags (noout, nobackfill, etc.)

## Viewing the OSD Map

Print a human-readable dump:

```bash
ceph osd dump
```

View only the OSD state tree:

```bash
ceph osd tree
```

Get the current epoch:

```bash
ceph osd dump | grep epoch
```

## Exporting the Binary OSD Map

```bash
ceph osd getmap -o /tmp/osdmap.bin
osdmaptool --print /tmp/osdmap.bin
```

This is useful for offline analysis or when comparing two epochs.

## Comparing Epochs

To understand what changed between epochs:

```bash
ceph osd dump --format json | jq '.epoch'
ceph mon dump | grep -i "epoch"
```

Fetch a specific historical epoch:

```bash
ceph osd getmap <epoch> -o /tmp/osdmap-old.bin
osdmaptool --print /tmp/osdmap-old.bin
```

## OSD Flags in the Map

OSD flags are stored in the map and affect cluster behavior globally:

```bash
ceph osd dump | grep flags
```

Common flags and their effect:

| Flag | Effect |
|------|--------|
| noout | OSDs will not be marked out when they go down |
| nobackfill | Disables backfilling PGs to new OSDs |
| norecover | Stops object recovery |
| pause | Stops all client I/O |

## How Clients Use the OSD Map

When a client wants to write an object, it:

1. Hashes the object name to a PG ID
2. Looks up the OSD map to find which OSDs own that PG
3. Connects directly to those OSDs

This means that every map update (new epoch) propagates to clients and OSDs, and stale maps can cause client I/O errors.

## Checking for Map Propagation Issues

```bash
ceph health detail | grep -i "map"
ceph osd stat
```

If OSDs are behind on map epochs, they log warnings and may refuse operations.

## Summary

The Ceph OSD map is the authoritative record of OSD states and flags that drives placement group location for every I/O operation. Understanding how to read and compare OSD map epochs helps diagnose cluster state changes, flag settings, and client connectivity issues during incidents.
