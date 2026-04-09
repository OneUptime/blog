# How to Migrate Proxmox VMs Between Ceph-Backed Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, Live Migration, VM, RBD, Maintenance

Description: Migrate running and stopped Proxmox VMs between nodes using Ceph RBD storage for fast live migration and node maintenance workflows.

---

When Proxmox VMs use Ceph RBD storage, migration between nodes is fast and efficient. For live migration, only RAM state transfers over the network since disk data stays in Ceph. This guide covers live migration, offline migration, and bulk migration for node maintenance.

## Types of Migration

**Live migration** - VM stays running during migration. Only RAM is transferred. Requires Ceph-backed storage. Minimal downtime (milliseconds for a brief RAM sync freeze).

**Offline migration** - VM is stopped, moved, then restarted. Can work with local storage (slower). Used when live migration is not possible.

## Performing a Live Migration

```bash
# Check available nodes
pvecm nodes

# Live migrate VM 100 to pve2
qm migrate 100 pve2 --online

# Migrate with bandwidth limit (in KiB/s)
qm migrate 100 pve2 --online --bwlimit 512000

# Watch migration progress
watch -n 1 "qm status 100"
# Status: running -> running (migration in progress) -> running (on new node)
```

Via GUI: Select VM -> More -> Migrate -> check "Online migration" -> Migrate

## Checking Migration Eligibility

```bash
# Verify the VM uses only shared storage before migrating
qm config 100 | grep -E "scsi|virtio|ide|sata"
# All disks should reference Ceph storage (e.g., ceph-vms:vm-100-disk-0)

# Check for local resources that block live migration
qm config 100 | grep -E "local|usb|cdrom"
# Local ISOs, USB passthrough prevent live migration
```

## Offline Migration

For VMs with local storage or when live migration is not appropriate:

```bash
# Stop the VM first
qm stop 100

# Migrate (offline)
qm migrate 100 pve2

# Start on the new node
qm start 100
```

## Bulk Migration for Node Maintenance

When taking a node offline for maintenance, migrate all its VMs:

```bash
#!/bin/bash
# migrate-all-vms.sh - Migrate all VMs from SOURCE to TARGET node

SOURCE="pve1"
TARGET="pve2"

# Get all VMs on the source node
VMS=$(pvesh get /nodes/${SOURCE}/qemu --output-format json | \
  python3 -c "import sys,json; [print(v['vmid']) for v in json.load(sys.stdin)]")

for VMID in ${VMS}; do
  echo "Migrating VM ${VMID} from ${SOURCE} to ${TARGET}..."

  # Try live migration first
  if qm status ${VMID} | grep -q "status: running"; then
    qm migrate ${VMID} ${TARGET} --online
  else
    qm migrate ${VMID} ${TARGET}
  fi

  echo "VM ${VMID} migration complete."
  sleep 2  # Brief pause between migrations
done

echo "All VMs migrated from ${SOURCE} to ${TARGET}."
```

## Migrating LXC Containers

```bash
# Migrate a running container (stops, migrates, restarts on target)
pct migrate 200 pve2 --restart

# Offline migrate a container
pct stop 200
pct migrate 200 pve2
pct start 200
```

## Monitoring Migration Performance

```bash
# Check network utilization during migration
iftop -i eth0 -n

# Monitor Ceph cluster I/O during migration
ceph iostat -p 2

# Check migration bandwidth in Proxmox task log
journalctl -u pvedaemon | grep -i "migrat" | tail -20
```

## Troubleshooting Migration Failures

```bash
# Check Proxmox task log for migration errors
pvesh get /nodes/pve1/tasks --output-format json | \
  python3 -c "
import sys, json
tasks = json.load(sys.stdin)
for t in tasks[:10]:
    if 'migrat' in t.get('type','').lower():
        print(f\"{t['upid']}: {t.get('status','unknown')}\")
"

# Common causes of live migration failure:
# - VM has local disk or CD-ROM ISO mounted from local storage
# - Target node cannot reach Ceph monitors
# - Insufficient RAM on target node
# - Network connectivity issue between nodes on migration network
```

## Summary

Proxmox VM migration with Ceph storage is fast and non-disruptive for live migrations because only RAM state (not disk data) transfers over the network. Live migration takes seconds for small VMs and a few minutes for large memory VMs. For node maintenance, script bulk migrations using `qm migrate --online` to evacuate a node before applying updates or hardware changes. Always verify VMs use only shared Ceph storage before attempting live migration - local storage or USB passthrough will require offline migration instead.
