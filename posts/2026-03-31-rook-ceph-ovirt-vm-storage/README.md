# How to Use Ceph with oVirt for VM Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, oVirt, VM, Storage, RBD, Virtualization

Description: Connect an external Rook-Ceph cluster to oVirt as an RBD storage domain, enabling centralized VM disk management with live migration and snapshot support.

---

## Overview

oVirt (the upstream project for Red Hat Virtualization) supports Ceph as an external storage domain. By connecting oVirt to a Rook-Ceph cluster, you gain shared storage for VM live migration, high availability, and efficient disk operations.

## Prerequisites

- Rook-Ceph cluster with RBD pool created
- oVirt 4.4+ installation
- Network connectivity between oVirt hosts and Ceph monitors

## Step 1 - Create Ceph Pool and User for oVirt

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

ceph osd pool create ovirt 64 64
rbd pool init ovirt

ceph auth get-or-create client.ovirt \
  mon 'profile rbd' \
  osd 'profile rbd pool=ovirt' \
  mgr 'profile rbd pool=ovirt'

ceph auth export client.ovirt
```

Note the key value for later use.

## Step 2 - Install Ceph Client on oVirt Hosts

On each oVirt compute host:

```bash
dnf install -y ceph-common

mkdir -p /etc/ceph

cat > /etc/ceph/ceph.conf << 'EOF'
[global]
fsid = YOUR-CLUSTER-FSID
mon_host = 10.0.0.10:6789,10.0.0.11:6789,10.0.0.12:6789
auth_cluster_required = cephx
auth_service_required = cephx
auth_client_required = cephx
EOF

cat > /etc/ceph/ceph.client.ovirt.keyring << 'EOF'
[client.ovirt]
    key = YOUR_KEY_FROM_STEP_1
EOF

chmod 640 /etc/ceph/ceph.client.ovirt.keyring
```

Verify:

```bash
rbd ls ovirt --id ovirt
```

## Step 3 - Add Ceph Storage Domain in oVirt

In the oVirt Administration Portal:

1. Go to Storage -> Domains -> New Domain
2. Set:

```yaml
Name: ceph-storage
Data Center: Default
Domain Function: Data
Storage Type: Managed Block Storage
```

Provide the cinderlib driver parameters for Ceph RBD:

```yaml
volume_driver: cinder.volume.drivers.rbd.RBDDriver
rbd_pool: ovirt
rbd_ceph_conf: /etc/ceph/ceph.conf
rbd_user: ovirt
rbd_keyring_conf: /etc/ceph/ceph.client.ovirt.keyring
```

## Step 4 - Migrate VMs to Ceph Storage

In oVirt UI, select a VM and choose "Move" to migrate its disk to the Ceph storage domain:

```text
Storage Domain: ceph-storage
Disk Format: RAW (recommended for Ceph)
```

## Step 5 - Configure Live Migration

With shared Ceph storage, live migration is enabled automatically. In oVirt UI:

Right-click VM -> Migrate -> select target host

Or via oVirt REST API:

```bash
curl -X POST \
  -H "Content-Type: application/xml" \
  -H "Accept: application/xml" \
  --user admin@internal:password \
  "https://ovirt-engine/ovirt-engine/api/vms/VM-ID/migrate" \
  -d '<action><host id="HOST-ID"/></action>'
```

## Step 6 - Snapshot Management

In oVirt UI, create snapshots from the Snapshots tab on any VM. Snapshots on Ceph-backed VMs use RBD's copy-on-write for instant creation.

## Step 7 - Monitor Ceph Storage Domain

In oVirt, navigate to Storage -> Domains -> ceph-storage to see usage. Also monitor from Ceph side:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df detail | grep ovirt
```

## Summary

oVirt integrates with external Ceph storage through standard RBD protocols, giving VM workloads access to Ceph's scalability and reliability. The setup enables live migration between oVirt hosts without copying disk data, instant VM snapshots, and centralized capacity management through both oVirt and Ceph management interfaces.
