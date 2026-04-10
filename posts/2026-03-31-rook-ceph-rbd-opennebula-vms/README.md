# How to Set Up Ceph RBD for OpenNebula VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, OpenNebula, VM, Storage, Virtualization

Description: Configure a Rook-Ceph cluster as the storage backend for OpenNebula virtual machine images using the RBD datastore driver for shared, scalable VM storage.

---

## Overview

OpenNebula supports Ceph RBD as a datastore backend, enabling centralized VM disk storage with instant cloning, live migration, and snapshots. The RBD datastore driver allows OpenNebula to manage VM images directly as Ceph RBD images.

## Prerequisites

- Rook-Ceph cluster accessible from OpenNebula frontend and compute nodes
- OpenNebula 6.x with KVM hypervisor
- `ceph-common` and `qemu-kvm` on compute nodes

## Step 1 - Create Ceph Pool and Credentials

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Create pool for OpenNebula images
ceph osd pool create one 128 128
rbd pool init one

# Create user for OpenNebula
ceph auth get-or-create client.oneadmin \
  mon 'profile rbd' \
  osd 'profile rbd pool=one' > /etc/ceph/ceph.client.oneadmin.keyring

chmod 640 /etc/ceph/ceph.client.oneadmin.keyring
ceph auth export client.oneadmin
```

## Step 2 - Configure Ceph on OpenNebula Hosts

On the OpenNebula frontend and all compute hosts:

```bash
apt-get install -y ceph-common

# Copy ceph.conf from Rook cluster
kubectl -n rook-ceph get configmap rook-ceph-config \
  -o jsonpath='{.data.ceph\.conf}' > /etc/ceph/ceph.conf

# Copy keyring
scp ceph.client.oneadmin.keyring each-host:/etc/ceph/

# Verify
rbd ls one --id oneadmin
```

## Step 3 - Create the OpenNebula Ceph Datastore

In the OpenNebula Sunstone UI or via CLI:

```bash
cat > ceph-ds.conf << 'EOF'
NAME   = "CephDS"
TYPE   = "IMAGE_DS"
DS_MAD = "ceph"
TM_MAD = "ceph"
DISK_TYPE = "RBD"
POOL_NAME = "one"
CEPH_HOST = "mon-a:6789 mon-b:6789 mon-c:6789"
CEPH_USER = "oneadmin"
CEPH_SECRET = "<libvirt-secret-uuid>"
RESTRICTED_DIRS = "/"
SAFE_DIRS       = "/tmp"
BRIDGE_LIST = "compute-node-1 compute-node-2"
EOF

onedatastore create ceph-ds.conf
```

## Step 4 - Upload a VM Image to the Ceph Datastore

```bash
# Upload base image
oneimage create \
  --name "ubuntu-22.04-base" \
  --path /path/to/ubuntu-22.04-cloud.img \
  --datastore CephDS \
  --type OS

# Check status
oneimage show ubuntu-22.04-base
```

## Step 5 - Create a VM Template Using Ceph Storage

```bash
cat > vm-template.conf << 'EOF'
NAME   = "ubuntu-vm"
MEMORY = 4096
CPU    = 2
VCPU   = 2
DISK   = [IMAGE = "ubuntu-22.04-base", DATASTORE = "CephDS"]
NIC    = [NETWORK = "default"]
GRAPHICS = [TYPE = "vnc", LISTEN = "0.0.0.0"]
EOF

onetemplate create vm-template.conf
onetemplate instantiate ubuntu-vm
```

## Step 6 - Enable Live Migration

With Ceph as shared storage, live migration uses the `ceph` TM_MAD which does not copy data:

```bash
onevm migrate --live 5 compute-node-2
```

## Step 7 - Snapshot and Disk Management

```bash
# Create disk snapshot
onevm disk-snapshot-create 5 0 "before-update"

# List snapshots (shown under each disk's snapshot section)
onevm show 5

# Revert to snapshot
onevm disk-snapshot-revert 5 0 0
```

## Summary

OpenNebula's RBD datastore driver leverages Ceph's native capabilities for VM storage, providing instant image cloning from templates, live migration without data movement, and persistent disk snapshots. Configuring the `ceph` transfer manager ensures that disk operations stay efficient and cluster-wide resources are managed through a familiar OpenNebula workflow.
