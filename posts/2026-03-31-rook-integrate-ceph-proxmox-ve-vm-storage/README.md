# How to Integrate Ceph with Proxmox VE for VM Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Proxmox, VM Storage, RBD, Virtualization, High Availability

Description: Integrate an external Ceph cluster with Proxmox VE to store VM disks in Ceph RBD, enabling live migration, HA failover, and centralized storage management.

---

Proxmox VE has built-in Ceph support, allowing you to use either a Proxmox-managed Ceph cluster or an external Ceph cluster for VM disk storage. This guide covers integrating an external Ceph cluster with Proxmox VE for storing VM disks and container volumes.

## Architecture

Proxmox nodes connect to Ceph as RBD clients. VM disks are stored as RBD images in a Ceph pool, enabling:
- Live migration without shared storage (disk stays in Ceph)
- HA failover (any Proxmox node can start the VM)
- Snapshots and linked clones for rapid VM provisioning

## Step 1: Install Ceph Client on Proxmox Nodes

```bash
# On each Proxmox node
apt update
apt install -y ceph-common

# Verify
rbd --version
```

## Step 2: Create the VM Disk Pool in Ceph

On the Ceph admin node:

```bash
# Create pool for Proxmox VM disks
ceph osd pool create proxmox-vms 128
rbd pool init proxmox-vms

ceph osd pool set proxmox-vms size 3
ceph osd pool set proxmox-vms min_size 2

# Create a pool for container storage
ceph osd pool create proxmox-ct 64
rbd pool init proxmox-ct
```

## Step 3: Create a Ceph User for Proxmox

```bash
ceph auth get-or-create client.proxmox \
  mon 'profile rbd' \
  osd 'profile rbd pool=proxmox-vms, profile rbd pool=proxmox-ct' \
  mgr 'profile rbd pool=proxmox-vms, profile rbd pool=proxmox-ct' \
  -o /etc/ceph/ceph.client.proxmox.keyring

# Copy to all Proxmox nodes
for pve_node in pve1 pve2 pve3; do
  scp /etc/ceph/ceph.conf root@${pve_node}:/etc/ceph/
  scp /etc/ceph/ceph.client.proxmox.keyring root@${pve_node}:/etc/ceph/
done
```

## Step 4: Add Ceph Storage to Proxmox via GUI

In the Proxmox web UI:
1. Go to Datacenter -> Storage -> Add -> RBD
2. Fill in the details:
   - ID: `ceph-vms`
   - Monitor(s): `mon1:6789,mon2:6789,mon3:6789`
   - Pool: `proxmox-vms`
   - Username: `proxmox`
   - Keyring Path: `/etc/ceph/ceph.client.proxmox.keyring`
   - Content: Disk image, Container

## Step 5: Add via CLI (Datacenter Config)

```bash
# On any Proxmox node, add the storage via pvesm
pvesm add rbd ceph-vms \
  --monhost "mon1:6789,mon2:6789,mon3:6789" \
  --pool proxmox-vms \
  --username proxmox \
  --keyring /etc/ceph/ceph.client.proxmox.keyring \
  --content images,rootdir

# Verify storage is online
pvesm status
```

## Step 6: Create a VM Using Ceph Storage

```bash
# Create a new VM with disk in Ceph
qm create 100 \
  --name test-vm \
  --memory 2048 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 ceph-vms:20  # 20 GB disk in ceph-vms storage

# Verify the RBD image was created
rbd -p proxmox-vms ls
# Output: vm-100-disk-0
```

## Step 7: Verify Live Migration Works

```bash
# Migrate VM to another Proxmox node
qm migrate 100 pve2 --online

# VM should move without downtime
qm status 100  # Should show running on pve2
```

## Summary

Integrating Proxmox VE with an external Ceph cluster requires installing `ceph-common` on Proxmox nodes, creating a dedicated Ceph auth user, and adding the RBD pool as a Proxmox storage definition. Once configured, VM disks are stored in Ceph RBD images that persist independently of any Proxmox node, enabling seamless live migration and HA failover. All Proxmox nodes share access to the same pool, so any node can start any VM at any time.
