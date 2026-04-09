# How to Migrate from OpenStack Cinder LVM to Ceph RBD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, OpenStack, Cinder, Migration, Block Storage

Description: A guide for migrating block storage volumes from OpenStack Cinder with LVM backend to Ceph RBD managed by Rook, covering volume export and re-import procedures.

---

## Overview

OpenStack Cinder with an LVM backend stores volumes as logical volumes on local storage, which lacks replication and live migration capabilities. Migrating to Ceph RBD provides replicated, distributed block storage that supports live migration, snapshots, and Kubernetes integration through Rook. This guide covers the volume export/import process between LVM and RBD.

## Understanding the Migration Challenge

Cinder LVM stores volumes as LVM logical volumes (LVs) on compute nodes. To migrate to Ceph RBD:

1. Export the LV to a raw image file
2. Import the raw image into Ceph RBD
3. Update the Cinder backend configuration to use Ceph
4. Remap existing volumes to their new RBD locations

## Step 1: Identify Cinder LVM Volumes

On the Cinder/Nova host:

```bash
# List all LVM volumes
lvs /dev/cinder-volumes

# Get volume UUID to LV mapping
openstack volume list --all-projects --format json | \
  python3 -c "
import sys, json
vols = json.load(sys.stdin)
for v in vols:
  print(v['ID'], v['Name'], v['Size'])
"
```

## Step 2: Snapshot and Export LVM Volume

```bash
# Detach the volume from the instance first
openstack server remove volume <instance-id> <volume-id>

# Create an LVM snapshot
lvcreate -l 100%ORIGIN -s -n snap_<volume-uuid> /dev/cinder-volumes/volume-<volume-uuid>

# Export to raw image
dd if=/dev/cinder-volumes/snap_<volume-uuid> \
   of=/tmp/volume-<volume-uuid>.raw \
   bs=64M status=progress
```

## Step 3: Import Raw Image into Ceph RBD

```bash
# Copy the raw image from the host into the Rook toolbox pod
TOOLBOX_POD=$(kubectl -n rook-ceph get pod -l app=rook-ceph-tools -o jsonpath='{.items[0].metadata.name}')
kubectl cp /tmp/volume-<volume-uuid>.raw rook-ceph/$TOOLBOX_POD:/tmp/volume-<volume-uuid>.raw

# Open a shell in the Rook toolbox
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- bash

# Import the raw image as an RBD volume
rbd import /tmp/volume-<volume-uuid>.raw \
  replicapool/volume-<volume-uuid> \
  --export-format=1 \
  --image-format=2

# Verify the import
rbd info replicapool/volume-<volume-uuid>
```

## Step 4: Reconfigure Cinder to Use Ceph

Update `/etc/cinder/cinder.conf` on the Cinder node:

```ini
[DEFAULT]
enabled_backends = ceph

[ceph]
volume_driver = cinder.volume.drivers.rbd.RBDDriver
volume_backend_name = ceph
rbd_pool = replicapool
rbd_ceph_conf = /etc/ceph/ceph.conf
rbd_flatten_volume_from_snapshot = false
rbd_max_clone_depth = 5
rbd_store_chunk_size = 4
rados_connect_timeout = -1
rbd_user = cinder
rbd_secret_uuid = <libvirt-secret-uuid>
```

## Step 5: Re-register Volumes in Cinder Database

For existing volumes, update the Cinder database to reflect the new RBD location:

```bash
# Update the host field for volumes to point to the Ceph backend
cinder-manage volume update_host \
  --currenthost <old-host>@lvm#LVM \
  --newhost <cinder-host>@ceph#ceph
```

## Step 6: Verify and Reattach Volumes

```bash
# Verify the volume is accessible via Ceph
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  rbd ls replicapool | grep <volume-uuid>

# Reattach to the instance
openstack server add volume <instance-id> <volume-id>

# Verify from within the instance
ssh <instance-ip>
lsblk
```

## Handling Ceph Credentials for Cinder

```bash
# Create a Ceph user for Cinder
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.cinder \
    mon 'profile rbd' \
    osd 'profile rbd pool=replicapool' \
    mgr 'profile rbd pool=replicapool'

# Get the key for cinder.conf
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph auth get-key client.cinder
```

## Summary

Migrating from OpenStack Cinder LVM to Ceph RBD involves exporting LVM volumes as raw images using `dd`, importing them into Ceph with `rbd import`, and reconfiguring Cinder to use the RBD driver. Once Cinder is pointing at Ceph, all future volume operations (create, snapshot, clone) go directly to RBD. This migration eliminates LVM as a single-node dependency and unlocks live migration of instances between compute nodes.
