# How to Use ceph-objectstore-tool for OSD Data Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, OSD, ceph-objectstore-tool, Debugging

Description: Use ceph-objectstore-tool to inspect, export, and recover data from damaged or offline Ceph OSDs at the object level without a running cluster.

---

## When to Use ceph-objectstore-tool

`ceph-objectstore-tool` operates directly on OSD data stores offline, making it invaluable when an OSD cannot be started due to corruption, when you need to recover objects from a failed drive, or when debugging object-level data inconsistencies.

## Prerequisites

The OSD must be stopped before using the tool:

```bash
# Stop the OSD in Rook
kubectl -n rook-ceph scale deployment rook-ceph-osd-0 --replicas=0

# Or on a traditional (non-Rook) deployment
ceph osd out osd.0
sudo systemctl stop ceph-osd@0
```

## List Objects in a Damaged OSD

```bash
# Run inside the Rook toolbox or OSD pod with OSD data mounted
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --op list
```

## Export a Specific Object

```bash
# List objects in a specific PG
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --pgid 1.0 \
  --op list

# Export a single object to a file
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --op export \
  --file /tmp/pg-1.0-export.bin \
  --pgid 1.0
```

## Import Objects to a Healthy OSD

```bash
# Import the exported PG to a replacement OSD
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-5 \
  --op import \
  --file /tmp/pg-1.0-export.bin
```

## Repair an Inconsistent Object

```bash
# Check for inconsistent objects
ceph health detail | grep inconsistent

# Scrub a specific PG to identify bad objects
ceph pg deep-scrub 1.0

# Remove a corrupt object (last resort - only if you have another replica)
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --pgid 1.0 \
  '{"oid":"corrupted-object","key":"","snapid":-2,"hash":123456,"max":0,"pool":1,"namespace":""}' \
  remove
```

## Fix a PG Stuck in Unknown State

```bash
# If a PG is stuck in unknown state due to missing info
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --op mark-complete \
  --pgid 1.0
```

## Recover Object Data Without a Running Cluster

```bash
# Get object data directly from the OSD
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --pgid 1.0 \
  '{"oid":"my-object","key":"","snapid":-2,"hash":0,"max":0,"pool":1,"namespace":""}' \
  get-bytes > /tmp/recovered-object.bin
```

## Summary

`ceph-objectstore-tool` provides low-level access to OSD data stores for recovery scenarios that cannot be handled through normal Ceph commands. By exporting PGs from damaged OSDs and importing them to healthy ones, you can recover data even when the cluster cannot start normally. Always stop the OSD before operating on its data path.
