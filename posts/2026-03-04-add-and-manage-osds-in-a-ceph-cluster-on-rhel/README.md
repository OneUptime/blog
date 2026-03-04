# How to Add and Manage OSDs in a Ceph Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, OSDs, Storage, Cluster Management

Description: Add, remove, and manage Object Storage Daemons (OSDs) in a Ceph cluster on RHEL to expand or maintain your distributed storage capacity.

---

OSDs (Object Storage Daemons) are the workhorses of a Ceph cluster. Each OSD manages a physical disk and handles data replication, recovery, and rebalancing. Here is how to manage them on RHEL.

## List Available Disks

Before adding OSDs, check which disks are available:

```bash
# List all devices and their availability for Ceph
sudo ceph orch device ls

# Show devices on a specific host
sudo ceph orch device ls node2
```

A device must be unused (no partitions, no filesystem, no LVM) to be eligible.

## Add OSDs

```bash
# Add all available devices across the cluster automatically
sudo ceph orch apply osd --all-available-devices

# Add a specific device on a specific host
sudo ceph orch daemon add osd node2:/dev/sdb

# Add multiple devices on one host
sudo ceph orch daemon add osd node2:/dev/sdc
sudo ceph orch daemon add osd node2:/dev/sdd
```

## Verify OSD Status

```bash
# Show the OSD tree with status
sudo ceph osd tree

# List all OSDs and their status
sudo ceph osd status

# Get detailed info about a specific OSD
sudo ceph osd find 3

# Check OSD disk usage
sudo ceph osd df
```

## Remove an OSD

Removing an OSD requires draining it first so data migrates to other OSDs:

```bash
# Mark the OSD as out (triggers rebalancing)
sudo ceph osd out osd.5

# Wait for data migration to complete
sudo ceph -w
# Watch for "active+clean" on all PGs

# Stop the OSD daemon
sudo ceph orch daemon rm osd.5

# Remove it from the CRUSH map and auth
sudo ceph osd purge osd.5 --yes-i-really-mean-it
```

## Replace a Failed Disk

When a disk fails, the OSD goes down automatically:

```bash
# Check for down OSDs
sudo ceph osd tree | grep down

# Destroy the failed OSD (preserves the ID for reuse)
sudo ceph osd destroy osd.5 --yes-i-really-mean-it

# After replacing the physical disk, recreate the OSD
sudo ceph orch daemon add osd node2:/dev/sdb
```

## Set OSD Class and CRUSH Rules

Ceph auto-detects device classes (hdd, ssd, nvme):

```bash
# View device classes
sudo ceph osd crush class ls

# View OSDs by class
sudo ceph osd crush class ls-osd ssd

# Create a CRUSH rule for SSD-only placement
sudo ceph osd crush rule create-replicated ssd-rule default host ssd
```

## Reweight an OSD

If an OSD is significantly more or less full than others:

```bash
# Manually set weight for an OSD
sudo ceph osd crush reweight osd.3 0.8

# Or use the automatic reweight command
sudo ceph osd reweight-by-utilization
```

Proper OSD management keeps your Ceph cluster healthy and balanced as storage demands change.
