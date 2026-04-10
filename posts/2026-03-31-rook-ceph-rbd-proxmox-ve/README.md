# How to Use Ceph RBD with Proxmox VE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Proxmox, Virtualization, Storage, VM

Description: Integrate an external Rook-Ceph cluster with Proxmox VE as an RBD storage backend for VM and container disk images, enabling live migration and centralized storage.

---

## Overview

Proxmox VE has native Ceph support and can use an external Rook-Ceph cluster as an RBD storage backend. This guide walks through configuring Proxmox to use Ceph for VM disk images and container storage.

## Prerequisites

- Rook-Ceph cluster accessible from Proxmox nodes
- Proxmox VE 7.x or 8.x
- `ceph-common` package on Proxmox hosts

## Step 1 - Create a Pool and User in Ceph

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd pool create proxmox 64 64

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd pool init proxmox

kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.proxmox \
  mon 'profile rbd' \
  osd 'profile rbd pool=proxmox'
```

## Step 2 - Configure Ceph on Proxmox Nodes

Copy the Ceph config and keyring to each Proxmox node:

```bash
# Get ceph.conf from the toolbox
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- cat /etc/ceph/ceph.conf > /etc/ceph/ceph.conf

# Get client keyring
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth export client.proxmox > /etc/ceph/ceph.client.proxmox.keyring

chmod 640 /etc/ceph/ceph.client.proxmox.keyring
```

Verify connectivity:

```bash
rbd ls proxmox --id proxmox
```

## Step 3 - Add Ceph Storage to Proxmox

In Proxmox Web UI:
1. Go to Datacenter -> Storage -> Add -> RBD
2. Fill in:

```yaml
ID: ceph-rook
Monitors: mon-a:6789,mon-b:6789,mon-c:6789
Pool: proxmox
Username: proxmox
Content: Disk image, Container
```

Or via command line on Proxmox:

```bash
pvesm add rbd ceph-rook \
  --monhost "mon-a:6789,mon-b:6789,mon-c:6789" \
  --pool proxmox \
  --username proxmox \
  --keyring /etc/ceph/ceph.client.proxmox.keyring \
  --content images,rootdir
```

## Step 4 - Create a VM Using Ceph Storage

When creating a VM in Proxmox UI, select "ceph-rook" as the storage for the disk. For existing VMs, migrate disk:

```bash
qm move_disk 100 scsi0 ceph-rook
```

## Step 5 - Enable Live Migration

With Ceph as shared storage, live migration requires no disk copy:

```bash
qm migrate 100 pve-node2 --online
```

## Step 6 - Manage Snapshots

```bash
# Create VM snapshot
qm snapshot 100 snap1 --description "Before update"

# List snapshots
qm listsnapshot 100

# Rollback
qm rollback 100 snap1
```

These map directly to RBD snapshots in the Ceph cluster.

## Step 7 - Monitor Storage

```bash
pvesm status
pvesm list ceph-rook

# In Ceph
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df detail | grep proxmox
```

## Summary

Proxmox VE's native RBD support makes integration with an external Rook-Ceph cluster straightforward. Once configured, Proxmox treats Ceph storage like any other storage backend, enabling live migration without data copies, instant snapshots, and thin-provisioned VM disks. The shared storage model also enables high-availability VMs using Proxmox HA.
