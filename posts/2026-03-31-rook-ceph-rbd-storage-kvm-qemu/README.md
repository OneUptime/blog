# How to Set Up Ceph RBD as Storage Backend for KVM/QEMU

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, KVM, QEMU, Virtualization, Storage

Description: Configure Ceph RBD as the storage backend for KVM/QEMU virtual machines, enabling shared storage for live migration, snapshots, and centralized VM disk management.

---

## Overview

Using Ceph RBD as the storage backend for KVM/QEMU virtual machines provides centralized, highly-available disk storage with native snapshot and cloning support. This eliminates the need for local storage on each hypervisor and enables live VM migration.

## Prerequisites

- Running Rook-Ceph cluster
- KVM/QEMU hypervisor nodes with `qemu-kvm` and `ceph-common` installed
- Network connectivity between hypervisors and Ceph monitors

## Step 1 - Install Ceph Client on Hypervisor Nodes

```bash
apt-get install -y ceph-common libvirt-daemon-system
```

## Step 2 - Create a Dedicated Ceph Pool for VMs

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: vms
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    compression_mode: "none"
```

```bash
kubectl apply -f vm-pool.yaml
```

## Step 3 - Create a Ceph User for QEMU/libvirt

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph auth get-or-create client.libvirt \
  mon 'profile rbd' \
  osd 'profile rbd pool=vms'
```

Export the keyring:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph auth export client.libvirt > /etc/ceph/ceph.client.libvirt.keyring
chmod 640 /etc/ceph/ceph.client.libvirt.keyring
```

## Step 4 - Copy Ceph Config to Hypervisors

Copy the ceph.conf and keyring to each hypervisor node:

```bash
scp /etc/ceph/ceph.conf hypervisor1:/etc/ceph/
scp /etc/ceph/ceph.client.libvirt.keyring hypervisor1:/etc/ceph/
```

On the hypervisor, verify connectivity:

```bash
rbd ls vms --id libvirt
```

## Step 5 - Create an RBD Image for a VM Disk

```bash
# On hypervisor
rbd create vms/myvm-disk --size 50G --image-feature layering
rbd info vms/myvm-disk
```

## Step 6 - Register the Ceph Secret in libvirt

The libvirt secret must be created before defining a VM that references it:

```bash
KEYRING=$(ceph auth get-key client.libvirt)

virsh secret-define --file <(cat <<EOF
<secret ephemeral='no' private='no'>
  <usage type='ceph'>
    <name>client.libvirt secret</name>
  </usage>
</secret>
EOF
)

SECRET_UUID=$(virsh secret-list | grep ceph | awk '{print $1}')
virsh secret-set-value $SECRET_UUID $KEYRING
```

## Step 7 - Define a VM Using the RBD Disk

Create the VM XML with RBD disk, replacing `YOUR-SECRET-UUID` with the `$SECRET_UUID` from the previous step:

```xml
<domain type='kvm'>
  <name>myvm</name>
  <memory unit='GiB'>4</memory>
  <vcpu>2</vcpu>
  <os>
    <type arch='x86_64'>hvm</type>
  </os>
  <devices>
    <disk type='network' device='disk'>
      <driver name='qemu' type='raw' cache='writeback'/>
      <source protocol='rbd' name='vms/myvm-disk'>
        <host name='rook-ceph-mon-a.rook-ceph.svc' port='6789'/>
        <host name='rook-ceph-mon-b.rook-ceph.svc' port='6789'/>
        <host name='rook-ceph-mon-c.rook-ceph.svc' port='6789'/>
      </source>
      <auth username='libvirt'>
        <secret type='ceph' uuid='YOUR-SECRET-UUID'/>
      </auth>
      <target dev='vda' bus='virtio'/>
    </disk>
  </devices>
</domain>
```

```bash
virsh define myvm.xml
virsh start myvm
```

## Summary

Ceph RBD as KVM/QEMU storage provides a centralized, fault-tolerant VM disk layer that decouples virtual machine disks from individual hypervisor hardware. With shared RBD storage, VM live migration works without any data copying, snapshots are near-instantaneous, and disk provisioning is flexible through RBD's thin-provisioning support.
