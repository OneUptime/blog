# How to Manage Ceph from Proxmox Web Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, Web Interface, Dashboard, Management, GUI

Description: Use the Proxmox VE web interface to manage an integrated Ceph cluster, including pool creation, OSD management, and health monitoring from the browser.

---

When Ceph is deployed as part of Proxmox VE (using the built-in Ceph integration), the Proxmox web UI provides a rich management interface for common Ceph operations. This guide covers the key management tasks accessible from the Proxmox GUI.

## Accessing the Ceph Management UI

The Ceph section in Proxmox is visible at the node level:

- **Node -> Ceph** - OSD management, pool configuration, monitor status, and cluster health

Navigate to `https://proxmox-node:8006` and log in as `root`.

## Checking Cluster Health

In the Proxmox GUI:
1. Click on a **Node** in the left panel
2. Click **Ceph** -> **Status**
3. The status page shows:
   - Overall health (HEALTH_OK / HEALTH_WARN / HEALTH_ERR)
   - Total/used/available storage
   - Number of OSDs (in/up/out)
   - Active monitors and MDS

From the CLI equivalent:

```bash
# Equivalent CLI commands
ceph status
ceph health detail
ceph osd stat
```

## Managing Pools via GUI

Navigate to **Node -> Ceph -> Pools**:

- **Create a pool**: Click "Create", enter name, size (replication), PG count
- **Edit pool**: Select a pool and modify parameters
- **Destroy pool**: Select pool, click "Destroy" (requires confirmation)

From CLI:

```bash
# Create a pool via CLI (equivalent to GUI action)
ceph osd pool create mypool 32
rbd pool init mypool

# Set replication
ceph osd pool set mypool size 3
```

## Managing OSDs

Navigate to **Node -> Ceph -> OSD**:

- Lists all OSDs on the current node with status (in/out, up/down)
- **Create OSD**: Click "Create OSD", select a disk, configure WAL/DB devices
- **Destroy OSD**: Mark out, wait for rebalancing, then destroy
- **Mark Out/In**: Temporarily remove an OSD from the cluster

From CLI:

```bash
# List OSDs on a node
ceph osd tree | grep $(hostname)

# Mark an OSD out for maintenance
ceph osd out osd.5

# Check rebalancing progress
ceph -w | grep rebalance
```

## Viewing Monitor Status

Navigate to **Node -> Ceph -> Monitor**:

- Shows monitor status and quorum membership
- Start/stop/destroy monitor services via GUI buttons

```bash
# CLI equivalent
ceph mon stat
ceph quorum_status --format json-pretty
```

## Managing the Ceph Dashboard from Proxmox

If you need deeper Ceph management, link to the Ceph Dashboard:

```bash
# Get the Ceph Dashboard URL from CLI
ceph mgr services | grep dashboard

# Enable if not already running
ceph mgr module enable dashboard
ceph dashboard create-self-signed-cert
echo -n "admin123" | ceph dashboard ac-user-create admin -i - administrator
```

Then access `https://ceph-mgr-host:8443/` for advanced management like RGW config, MDS management, and detailed performance metrics.

## Creating VMs with GUI Storage Selection

When creating a VM in Proxmox and Ceph storage is configured:
1. Go to **Node -> Create VM**
2. In the **Disks** tab, select `Storage: ceph-vms` from the dropdown
3. Set disk size, bus type (VirtIO SCSI recommended), and cache mode
4. Click **Create**

The disk will be created as an RBD image in the configured Ceph pool.

## Summary

The Proxmox web interface provides a convenient entry point for common Ceph management tasks including health monitoring, pool creation, OSD management, and storage configuration. For day-to-day operations in a Proxmox-managed Ceph environment, the GUI handles the most frequent tasks without requiring CLI access. More advanced Ceph operations are available through the Ceph Dashboard (accessible separately) or the standard `ceph` CLI tools installed on Proxmox nodes.
