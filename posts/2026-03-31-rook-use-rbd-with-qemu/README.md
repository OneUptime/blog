# How to Use RBD with QEMU

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, QEMU, Virtualization

Description: Learn how to configure QEMU virtual machines to use Ceph RBD images as block devices via the librbd driver in Rook-Ceph environments.

---

## Why Use RBD with QEMU

Using RBD as the backing store for QEMU virtual machines provides several advantages over local disk or NFS-based storage:

- Live migration of VMs without shared storage setup
- Copy-on-write snapshots for fast VM cloning
- Thin provisioning of VM disk images
- High availability through Ceph's replication

QEMU has built-in support for RBD via `librbd`, meaning no kernel module is required on the hypervisor.

## Step 1 - Extract Ceph Credentials

Get the Ceph monitor addresses and client key from Rook:

```bash
kubectl get configmap rook-ceph-mon-endpoints -n rook-ceph -o yaml

kubectl get secret rook-ceph-admin-keyring -n rook-ceph \
  -o jsonpath='{.data.keyring}' | base64 -d
```

Store the keyring at `/etc/ceph/ceph.client.admin.keyring` on the hypervisor node.

## Step 2 - Create an RBD Image for the VM

Create a VM disk image in the RBD pool:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd create replicapool/vm-disk-01 --size 20G
```

## Step 3 - Launch QEMU with RBD Disk

Run a VM using the RBD image as its primary disk:

```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 2048 \
  -drive format=raw,file=rbd:replicapool/vm-disk-01:conf=/etc/ceph/ceph.conf:id=admin:keyring=/etc/ceph/ceph.client.admin.keyring \
  -net nic \
  -net user
```

## Step 4 - Use QEMU Block Driver with Cache Mode

Configure write-back caching for better VM write performance:

```bash
qemu-system-x86_64 \
  -enable-kvm \
  -m 4096 \
  -drive if=virtio,format=raw,cache=writeback,\
file=rbd:replicapool/vm-disk-01:conf=/etc/ceph/ceph.conf:id=admin:keyring=/etc/ceph/ceph.client.admin.keyring \
  -smp 4
```

For latency-sensitive VMs, use `cache=none` with the virtio-blk driver:

```bash
-drive if=virtio,format=raw,cache=none,aio=native,...
```

## Step 5 - Snapshot a Running VM's Disk

Freeze the filesystem inside the VM, then take a snapshot:

```bash
# Inside the VM - freeze the filesystem to ensure consistency
sync
fsfreeze --freeze /

# On the hypervisor host - take the snapshot
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd snap create replicapool/vm-disk-01@snapshot-pre-upgrade

# Inside the VM - unfreeze the filesystem after the snapshot
fsfreeze --unfreeze /
```

## Step 6 - Clone a VM Disk for Fast Provisioning

Create a clone from a base image snapshot:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd snap protect replicapool/base-image@golden

kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  rbd clone replicapool/base-image@golden replicapool/new-vm-disk
```

The clone uses COW, so it only stores differences from the parent.

## Step 7 - Verify QEMU RBD Connection

Check that QEMU can connect to Ceph by inspecting the VM's block device:

```bash
qemu-img info rbd:replicapool/vm-disk-01
```

```text
image: rbd:replicapool/vm-disk-01
file format: raw
virtual size: 20 GiB (21474836480 bytes)
disk size: 2.1 GiB
```

## Summary

Using RBD with QEMU in Rook-Ceph environments enables VM disk storage to be backed by a distributed, replicated Ceph cluster. Pass credentials via `conf=` and `keyring=` in the RBD driver string, choose an appropriate cache mode for your workload, and use `rbd clone` for fast VM provisioning from golden images. This setup enables live migration and cluster-wide VM disk availability.
