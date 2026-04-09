# How to Replace a Failed OSD in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Disk Failure, Storage Recovery

Description: Replace a physically failed OSD disk in Ceph by removing the failed OSD, replacing the hardware, and provisioning a new OSD on the replacement drive.

---

## When an OSD Fails

When an OSD fails due to a disk error or hardware failure, Ceph marks it as `down` and eventually `out` (after the `mon_osd_down_out_interval` timeout, typically 600 seconds). During this time, the cluster enters a degraded state and begins recovering lost replicas to other OSDs.

```bash
# Check which OSDs are down
ceph osd stat
ceph osd tree | grep down
```

## Step 1 - Identify the Failed OSD

```bash
ceph health detail
# Shows something like:
# OSD_DOWN 1 osds down
# osd.3 (root=default, host=node2) is down

# Check OSD status details
ceph osd info osd.3
```

On the host, check for disk errors:

```bash
dmesg | grep -i error | tail -20
journalctl -u ceph-osd@3 --since "1 hour ago"
```

## Step 2 - Mark the OSD Out and Down

If Ceph has not already done so:

```bash
ceph osd out osd.3
ceph osd down osd.3
```

## Step 3 - Stop the OSD Process

On the failing host, stop the OSD:

```bash
sudo systemctl stop ceph-osd@3
sudo systemctl disable ceph-osd@3
```

## Step 4 - Remove the Failed OSD from the Cluster

```bash
# Remove from CRUSH map
ceph osd crush remove osd.3

# Remove authentication keys
ceph auth del osd.3

# Remove OSD from cluster
ceph osd rm osd.3

# Or use purge (combined)
ceph osd purge osd.3 --yes-i-really-mean-it
```

## Step 5 - Replace the Physical Disk

Power down the server (or use hot-swap if your hardware supports it) and physically replace the failed disk with a new one.

After replacement, verify the new disk is detected:

```bash
lsblk
fdisk -l /dev/sdd  # or whichever device is new
```

Clean any residual data on the new disk:

```bash
wipefs -a /dev/sdd
sgdisk --zap-all /dev/sdd
```

## Step 6 - Provision the New OSD

Using cephadm:

```bash
# Add new OSD on the replacement device
ceph orch daemon add osd node2:/dev/sdd
```

Using Rook - the new drive will be picked up automatically if `useAllDevices: true`, or you can update the CephCluster spec and apply it.

After provisioning:

```bash
# The new OSD gets a new ID (e.g., osd.7)
ceph osd tree
ceph osd stat
```

## Step 7 - Monitor Recovery

The cluster will automatically begin recovering data to the new OSD:

```bash
# Watch recovery progress
watch -n 5 ceph -s

# Check PG recovery
ceph pg stat

# View recovery throughput
ceph osd perf
```

## Using cephadm Replace Workflow

cephadm provides a streamlined replace workflow that handles OSD removal automatically:

```bash
# Mark for replacement (preserves OSD ID if possible)
ceph orch osd rm 3 --replace

# Monitor replacement queue
ceph orch osd rm status

# After new disk is inserted, add the OSD
ceph orch daemon add osd node2:/dev/sdd
```

## Adjusting Recovery Priority

If recovery is impacting production I/O:

```bash
# Reduce recovery priority
ceph config set osd osd_recovery_op_priority 1
ceph config set osd osd_recovery_max_active 1

# Restore defaults once recovery is done
ceph config set osd osd_recovery_op_priority 3
ceph config set osd osd_recovery_max_active 3
```

## Verifying Full Recovery

```bash
# Check that all PGs are active+clean
ceph pg stat | grep active+clean

# Verify cluster is healthy
ceph -s
# Should show HEALTH_OK and no degraded PGs
```

## Summary

Replacing a failed OSD in Ceph involves removing the failed OSD from the cluster using `ceph osd purge`, physically replacing the disk, and provisioning a new OSD on the replacement drive using cephadm or Rook. The cluster automatically recovers data to the new OSD. Monitor recovery progress with `ceph -s` and adjust recovery throttle settings to balance recovery speed against production workload impact.
