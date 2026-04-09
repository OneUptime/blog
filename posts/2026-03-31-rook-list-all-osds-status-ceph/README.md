# How to List All OSDs and Their Status in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Monitoring, Storage, CLI

Description: Use Ceph CLI commands to list all OSDs, check their up/in status, identify failures, and understand OSD placement across nodes.

---

## OSD Status Explained

Each Ceph OSD daemon has two independent state bits:

- **up** - the OSD process is running and reachable
- **in** - the OSD is participating in data placement (part of the CRUSH map)

An OSD that is `up` but `out` is running but not storing data. An OSD that is `down` but `in` will cause placement groups to become degraded. After a configurable timeout (`mon_osd_down_out_interval`, default 600 seconds), it is automatically marked `out`, which triggers data recovery.

## Listing All OSDs

Get a summary of all OSDs and their current state:

```bash
ceph osd stat
```

Sample output:

```text
24 osds: 24 up (since 3w), 24 in (since 3w); epoch: e2145
```

## Detailed OSD List with Status

```bash
ceph osd dump | grep -E "^osd\."
```

For a formatted table:

```bash
ceph osd tree
```

`osd tree` shows the CRUSH hierarchy (host -> OSD) along with weight, status, and device class.

## Checking Which OSDs Are Down

```bash
ceph osd tree | grep -i "down"
```

Or use the health detail:

```bash
ceph health detail | grep -i "osd"
```

## Per-OSD Performance and Disk Info

Get metadata for a specific OSD:

```bash
ceph osd metadata 0
```

This shows the device path, kernel version, disk model, and OSD-specific config.

## Finding OSDs by Host

```bash
ceph osd find 5
```

Returns the host name and OSD details for OSD.5.

List all OSDs on a specific host:

```bash
ceph osd tree | grep -A 10 "host mynode"
```

## Listing OSDs with Utilization

```bash
ceph osd df tree
```

This combines the CRUSH tree view with utilization percentages, making it easy to spot imbalanced OSDs.

## Checking OSD Versions

When upgrading, verify which OSD version is running:

```bash
ceph versions
```

Or per-daemon:

```bash
ceph tell osd.* version
```

## Marking an OSD Down/Out Manually

For maintenance, you can manually change OSD state:

```bash
# Take OSD out of cluster (stop data placement)
ceph osd out 3

# Mark OSD as down
ceph osd down 3

# Bring OSD back
ceph osd in 3
```

## Summary

Use `ceph osd tree` for a visual hierarchy with status, `ceph osd df` for utilization, and `ceph osd metadata <id>` for hardware details. Monitor for `down` OSDs via `ceph health detail` and use `ceph osd out` for planned maintenance to gracefully remove an OSD from data placement before stopping it.
