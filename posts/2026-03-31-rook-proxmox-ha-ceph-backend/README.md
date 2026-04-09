# How to Set Up Proxmox HA with Ceph Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, High Availability, Cluster, Failover

Description: Configure Proxmox VE High Availability groups with Ceph RBD storage to enable automatic VM failover when a cluster node fails.

---

Proxmox HA (High Availability) automatically restarts VMs on another node when a node fails. When combined with Ceph RBD storage, VMs can failover in minutes because disk data is accessible from any cluster node - no storage migration required.

## Prerequisites

- Proxmox VE cluster with at least 3 nodes (for quorum)
- Ceph RBD storage configured and accessible from all nodes (see the RBD pools guide)
- VMs using only Ceph-backed disks (local storage prevents HA)

## Step 1: Verify Proxmox Cluster Quorum

```bash
# Check cluster status
pvecm status

# Output should show all nodes online with quorum
# Quorum information:
#   Date: Mon Mar 31 10:00:00 2026
#   Quorum provider: corosync_votequorum
#   Nodes: 3

# Check corosync
systemctl status corosync
```

## Step 2: Create an HA Group

HA groups define which nodes a VM can run on and their priority:

```bash
# Create an HA group for VMs
ha-manager groupadd production \
  --nodes pve1:2,pve2:1,pve3:1 \
  --restricted 0

# List HA groups
ha-manager groupconfig

# Or via GUI: Datacenter -> HA -> Groups -> Add
```

Parameters:
- `nodes` - comma-separated node:priority pairs (higher priority = preferred)
- `restricted` - if 1, VM can only run on listed nodes; if 0, can run on any node as fallback

## Step 3: Add VMs to HA

```bash
# Add a VM to HA management
ha-manager add vm:100 \
  --group production \
  --state started \
  --max_restart 3 \
  --max_relocate 3

# Check HA resource status
ha-manager status

# Or via GUI: Datacenter -> HA -> Resources -> Add
```

## Step 4: Configure HA Watchdog (Fencing)

Fencing ensures a failed node cannot access shared storage while being restarted. Configure the watchdog:

```bash
# Check watchdog status on each node
systemctl status watchdog-mux

# Verify the watchdog module configuration
cat /etc/default/pve-ha-manager

# Check if the watchdog device exists
ls -la /dev/watchdog*
```

## Step 5: Test HA Failover

Test the HA setup by simulating a node failure:

```bash
# Identify which node VM 100 is running on
qm status 100
ha-manager status | grep "vm:100"

# On the node running VM 100, simulate failure
# (in a controlled test environment)
systemctl stop pve-ha-lrm   # Stop the HA LRM (Local Resource Manager)

# On another node, watch for failover
watch -n 2 "ha-manager status | grep 'vm:100'"
# Status should change: started -> recovery -> started (on different node)
```

## Step 6: Monitor HA Events

```bash
# View HA event log
journalctl -u pve-ha-crm -n 50 --no-pager

# Check HA manager CRM log
journalctl -u pve-ha-crm -f

# View Proxmox cluster log
pvecm status
journalctl -u pve-cluster -n 20 --no-pager
```

## HA Best Practices with Ceph

```bash
# Verify all HA VMs use only Ceph storage (no local disks)
for vmid in $(ha-manager status | grep "vm:" | awk -F: '{print $2}' | awk '{print $1}'); do
  echo "VM ${vmid}:"
  qm config ${vmid} | grep -E "scsi|virtio|ide|sata" | grep -v "ceph\|pve-ceph"
done
# Output should be empty - all disks should reference Ceph storage
```

## Summary

Proxmox HA with Ceph backend provides automatic VM failover by combining Proxmox's corosync-based cluster membership with Ceph's node-independent storage access. When a node fails, the HA CRM detects the failure, fences the node, and restarts affected VMs on surviving nodes within minutes. The key requirement is that all HA-enabled VMs use only Ceph-backed storage, as local disk storage would prevent failover. Use HA groups to define preferred nodes and fallback priorities for different workloads.
