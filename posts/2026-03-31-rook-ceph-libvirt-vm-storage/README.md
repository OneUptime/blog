# How to Configure Ceph with libvirt for Virtual Machine Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Libvirt, VM, Storage, RBD, Virtualization

Description: Configure libvirt's storage pool to use Ceph RBD, enabling GUI-based and API-driven VM management tools like virt-manager to provision and manage Ceph-backed disks.

---

## Overview

libvirt's storage pool abstraction allows it to manage Ceph RBD images as VM disks through a standardized API. This lets tools like virt-manager, oVirt, and OpenNebula interact with Ceph storage without requiring direct RBD knowledge.

## Prerequisites

- Rook-Ceph cluster with an RBD pool
- libvirt and ceph-common installed on hypervisor
- Ceph keyring accessible on the hypervisor host

## Step 1 - Prepare Ceph Authentication

Create a dedicated user for libvirt:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.libvirt-pool \
  mon 'profile rbd' \
  osd 'profile rbd pool=vms' > /etc/ceph/ceph.client.libvirt-pool.keyring

chmod 640 /etc/ceph/ceph.client.libvirt-pool.keyring
```

Register the secret in libvirt:

```bash
cat > /tmp/ceph-secret.xml << 'EOF'
<secret ephemeral='no' private='no'>
  <uuid>a5d0dd94-57c4-4fa5-ab77-369f4234c41b</uuid>
  <usage type='ceph'>
    <name>client.libvirt-pool secret</name>
  </usage>
</secret>
EOF

virsh secret-define /tmp/ceph-secret.xml
KEYVAL=$(ceph auth get-key client.libvirt-pool)
virsh secret-set-value a5d0dd94-57c4-4fa5-ab77-369f4234c41b $KEYVAL
```

## Step 2 - Define a libvirt RBD Storage Pool

```xml
<pool type='rbd'>
  <name>ceph-vms</name>
  <source>
    <host name='rook-ceph-mon-a.rook-ceph.svc' port='6789'/>
    <host name='rook-ceph-mon-b.rook-ceph.svc' port='6789'/>
    <host name='rook-ceph-mon-c.rook-ceph.svc' port='6789'/>
    <name>vms</name>
    <auth type='ceph' username='libvirt-pool'>
      <secret uuid='a5d0dd94-57c4-4fa5-ab77-369f4234c41b'/>
    </auth>
  </source>
</pool>
```

```bash
virsh pool-define ceph-pool.xml
virsh pool-start ceph-vms
virsh pool-autostart ceph-vms
virsh pool-info ceph-vms
```

## Step 3 - Create Volumes via libvirt

```bash
virsh vol-create-as ceph-vms myvm-disk 50G
virsh vol-list ceph-vms
```

## Step 4 - Attach to a Virtual Machine

```bash
cat > /tmp/rbd-disk.xml << 'EOF'
<disk type='network' device='disk'>
  <driver name='qemu' type='raw'/>
  <auth username='libvirt-pool'>
    <secret type='ceph' uuid='a5d0dd94-57c4-4fa5-ab77-369f4234c41b'/>
  </auth>
  <source protocol='rbd' name='vms/myvm-disk'>
    <host name='rook-ceph-mon-a.rook-ceph.svc' port='6789'/>
    <host name='rook-ceph-mon-b.rook-ceph.svc' port='6789'/>
    <host name='rook-ceph-mon-c.rook-ceph.svc' port='6789'/>
  </source>
  <target dev='vdb' bus='virtio'/>
</disk>
EOF

virsh attach-device myvm /tmp/rbd-disk.xml --persistent
```

## Step 5 - Use virt-manager with Ceph Pool

In virt-manager:
1. Edit -> Connection Details -> Storage
2. Click the "+" button to add a new pool
3. Select type "RADOS Block Device/Ceph" (rbd)
4. Enter the pool name and monitor addresses
5. Set authentication to the secret UUID

Now you can create VMs in virt-manager using Ceph storage.

## Step 6 - Create VM Snapshots via libvirt

For raw RBD disks, use Ceph's native RBD snapshot commands rather than libvirt's snapshot mechanism, which has limited support for network-backed disks:

```bash
# Create an RBD snapshot (pause or fsfreeze the VM first for consistency)
rbd snap create vms/myvm-disk@snap1

# List snapshots
rbd snap ls vms/myvm-disk

# Rollback to snapshot (VM must be stopped first)
virsh shutdown myvm
rbd snap rollback vms/myvm-disk@snap1
virsh start myvm
```

## Step 7 - Monitor Pool Status

```bash
virsh pool-info ceph-vms
virsh vol-list ceph-vms --details
```

## Summary

Configuring a libvirt RBD storage pool creates a bridge between VM management tools and Ceph storage. This approach works transparently with all libvirt-compatible management interfaces, from command-line virsh to GUI tools like virt-manager. The pool handles authentication and connection management, hiding Ceph's complexity while exposing its features like instant snapshots and thin provisioning.
