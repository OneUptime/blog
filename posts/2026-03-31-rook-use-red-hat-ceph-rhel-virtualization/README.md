# How to Use Red Hat Ceph with RHEL Virtualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Red Hat, Virtualization, KVM, Storage

Description: Configure Red Hat Ceph Storage as a backend for RHEL virtualization using libvirt and QEMU, providing shared block and object storage for VMs.

---

Red Hat Ceph Storage integrates with RHEL virtualization (KVM/libvirt) through the QEMU RBD driver. This lets you store VM disk images directly in Ceph RBD, enabling live migration, high availability, and centralized storage management.

## Prerequisites

- RHCS cluster with an RBD pool
- RHEL KVM hypervisor nodes with `qemu-kvm` and `libvirt` installed
- Ceph client packages on hypervisor nodes

## Step 1 - Install Ceph Client on Hypervisor

```bash
dnf install -y ceph-common
```

Copy the cluster config and keyring from the Ceph admin node:

```bash
scp ceph-admin:/etc/ceph/ceph.conf /etc/ceph/ceph.conf
scp ceph-admin:/etc/ceph/ceph.client.admin.keyring /etc/ceph/
```

## Step 2 - Create a Dedicated Pool and User

On the Ceph cluster:

```bash
ceph osd pool create vms 128
rbd pool init vms

ceph auth get-or-create client.libvirt \
  mon 'profile rbd' \
  osd 'profile rbd pool=vms' \
  -o /etc/ceph/ceph.client.libvirt.keyring
```

## Step 3 - Configure libvirt with the Ceph Secret

Create an XML secret for libvirt:

```xml
<secret ephemeral='no' private='no'>
  <usage type='ceph'>
    <name>client.libvirt secret</name>
  </usage>
</secret>
```

```bash
SECRET_UUID=$(virsh secret-define --file ceph-secret.xml | awk '{print $2}')
CEPH_KEY=$(ceph auth get-key client.libvirt)
virsh secret-set-value --secret "$SECRET_UUID" --base64 "$CEPH_KEY"
```

## Step 4 - Create a VM Disk in Ceph

```bash
rbd create vms/vm1-disk --size 20G
rbd info vms/vm1-disk
```

## Step 5 - Define a VM Using the RBD Disk

In the VM XML definition, replace the disk section:

```xml
<disk type='network' device='disk'>
  <driver name='qemu' type='raw'/>
  <auth username='libvirt'>
    <secret type='ceph' uuid='YOUR_SECRET_UUID'/>
  </auth>
  <source protocol='rbd' name='vms/vm1-disk'>
    <host name='192.168.1.10' port='6789'/>
    <host name='192.168.1.11' port='6789'/>
    <host name='192.168.1.12' port='6789'/>
  </source>
  <target dev='vda' bus='virtio'/>
</disk>
```

```bash
virsh define vm1.xml
virsh start vm1
```

## Step 6 - Live Migrate the VM

Because the disk is in Ceph, live migration requires no disk copy:

```bash
virsh migrate --live vm1 qemu+ssh://hypervisor2/system
```

## Summary

Integrating RHCS with RHEL virtualization enables centralized VM disk storage in Ceph RBD pools. The QEMU RBD driver accesses disks directly over the Ceph network, allowing live migration and removing dependency on local storage. The key setup steps are installing the ceph-common packages on hypervisors and configuring a libvirt secret for authentication.
