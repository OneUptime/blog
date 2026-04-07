# How to Troubleshoot Ceph-Proxmox Integration Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, Troubleshooting, Debugging, RBD, Storage

Description: Diagnose and fix common Ceph-Proxmox integration problems including storage connection failures, VM disk errors, migration issues, and authentication problems.

---

Proxmox-Ceph integration issues typically fall into a few categories: network connectivity, authentication failures, pool misconfiguration, and OSD health problems affecting VMs. This guide provides a systematic troubleshooting approach for each category.

## Step 1: Check Ceph Cluster Health First

Before investigating Proxmox-specific issues, verify the Ceph cluster itself is healthy:

```bash
# Check cluster health from any Proxmox node
ceph health detail

# Check OSD status
ceph osd stat
ceph osd tree | grep -E "down|out"

# Check PG status
ceph pg stat | grep -v "active+clean" | head -5
```

If the cluster is not healthy, resolve Ceph issues before troubleshooting Proxmox connectivity.

## Diagnosing Storage Not Available in Proxmox

```bash
# Check storage status
pvesm status

# If storage shows "unavailable", check:
# 1. Can the node reach Ceph monitors?
for mon in mon1 mon2 mon3; do
  nc -zv ${mon} 6789 && echo "${mon}: reachable" || echo "${mon}: UNREACHABLE"
done

# 2. Is the keyring present and readable?
ls -la /etc/ceph/ceph.client.proxmox.keyring

# 3. Can the Proxmox user authenticate to Ceph?
rbd --id proxmox -p proxmox-vms ls

# 4. Is the pool accessible?
rados --id proxmox -p proxmox-vms ls | head -5
```

## Diagnosing VM Disk I/O Errors

When a running VM reports disk errors:

```bash
# Check OSD health - hung OSDs cause I/O errors
ceph osd stat
ceph health detail | grep -i osd

# Check for slow OSD requests
ceph tell 'osd.*' dump_ops_in_flight 2>/dev/null | grep -A3 "slow"

# Check the specific RBD image for the VM
VMID=100
IMAGE="vm-${VMID}-disk-0"
rbd info proxmox-vms/${IMAGE}
rbd status proxmox-vms/${IMAGE}

# Look for watchers (attached clients)
rbd status proxmox-vms/${IMAGE}
```

## Diagnosing VM That Won't Start

```bash
VMID=100

# Check the Proxmox task log
pvesh get /nodes/$(hostname)/tasks --output-format json 2>/dev/null | \
  python3 -c "
import sys, json
for t in json.load(sys.stdin)[:5]:
    if str(t.get('id','')).startswith('${VMID}'):
        print(t.get('upid'), '->', t.get('status'))
"

# Check QEMU log
cat /var/log/pve/qemu-server/${VMID}.log | tail -30

# Try to map the RBD image manually
rbd map proxmox-vms/vm-${VMID}-disk-0 --id proxmox
ls /dev/rbd/proxmox-vms/

# If map fails, check image state
rbd info proxmox-vms/vm-${VMID}-disk-0
rbd lock list proxmox-vms/vm-${VMID}-disk-0
```

## Clearing Stale RBD Locks

If a VM crashed and left an RBD lock, new starts fail:

```bash
# List locks on the image
rbd lock list proxmox-vms/vm-100-disk-0

# Output example:
# There are 1 exclusive locks on this image.
# Locker        ID       Address
# client.12345  auto    10.0.0.1:0/123456

# Remove the stale lock
rbd lock remove proxmox-vms/vm-100-disk-0 "auto" "client.12345"
```

## Diagnosing Migration Failures

```bash
# Check migration task log
journalctl -u pvedaemon | grep -i "migrat\|100" | tail -20

# Common causes:
# - Local ISO attached: check VM config
qm config 100 | grep ide

# - Target node can't reach Ceph
ssh pve2 "rbd --id proxmox -p proxmox-vms ls"

# - Insufficient RAM on target
ssh pve2 "free -h"
qm config 100 | grep memory
```

## Useful Diagnostic Commands

```bash
# Full RBD image info
rbd info proxmox-vms/vm-100-disk-0

# Pool health
ceph osd pool stats proxmox-vms

# Proxmox storage config
cat /etc/pve/storage.cfg | grep -A10 "rbd:"

# Check Ceph version on all nodes
for node in pve1 pve2 pve3; do
  echo -n "${node}: "
  ssh ${node} "ceph --version"
done
```

## Summary

Troubleshooting Ceph-Proxmox integration follows a top-down approach: verify Ceph cluster health first, then check connectivity and authentication from the affected Proxmox node, then investigate the specific VM or storage operation that failed. Stale RBD locks from crashed VMs are a common cause of "VM won't start" issues and are easily resolved with `rbd lock remove`. Always check both `ceph health detail` and the Proxmox task/QEMU logs together to correlate storage events with VM-level symptoms.
