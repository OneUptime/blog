# How to Configure Multi-Backend Cinder with Ceph Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Cinder, Multi-Backend, Block Storage, Performance

Description: Set up multiple Cinder backends backed by different Ceph pools to offer tiered storage classes with different performance and replication profiles.

---

OpenStack Cinder supports multiple backends simultaneously, allowing you to offer different storage tiers - such as high-performance SSD-backed pools and cost-efficient HDD pools - all from a single Ceph cluster. Users select their tier via Cinder volume types.

## Use Case

A single Ceph cluster might have:

- `ssd-volumes` pool: stored on NVMe OSDs, replicated 2x, for databases
- `hdd-volumes` pool: stored on HDD OSDs, replicated 3x, for general workloads
- `ec-volumes` pool: erasure coded for large file storage at lower cost

## Step 1: Create the Pools

```bash
# High-performance SSD pool
ceph osd pool create ssd-volumes 64
rbd pool init ssd-volumes
ceph osd pool set ssd-volumes size 2

# Standard HDD pool
ceph osd pool create hdd-volumes 128
rbd pool init hdd-volumes
ceph osd pool set hdd-volumes size 3

# Apply CRUSH rule to force SSD OSDs for ssd-volumes
ceph osd crush rule create-replicated ssd-rule default host ssd
ceph osd pool set ssd-volumes crush_rule ssd-rule
```

## Step 2: Create Ceph Users per Pool

```bash
# SSD pool user
ceph auth get-or-create client.cinder-ssd \
  mon 'profile rbd' \
  osd 'profile rbd pool=ssd-volumes' \
  -o /etc/ceph/ceph.client.cinder-ssd.keyring

# HDD pool user
ceph auth get-or-create client.cinder-hdd \
  mon 'profile rbd' \
  osd 'profile rbd pool=hdd-volumes' \
  -o /etc/ceph/ceph.client.cinder-hdd.keyring
```

## Step 3: Configure Multi-Backend in cinder.conf

```ini
[DEFAULT]
enabled_backends = ceph-ssd, ceph-hdd
default_volume_type = standard-hdd

[ceph-ssd]
volume_driver = cinder.volume.drivers.rbd.RBDDriver
volume_backend_name = ceph-ssd
rbd_pool = ssd-volumes
rbd_ceph_conf = /etc/ceph/ceph.conf
rbd_user = cinder-ssd
rbd_secret_uuid = <ssd-libvirt-secret-uuid>

[ceph-hdd]
volume_driver = cinder.volume.drivers.rbd.RBDDriver
volume_backend_name = ceph-hdd
rbd_pool = hdd-volumes
rbd_ceph_conf = /etc/ceph/ceph.conf
rbd_user = cinder-hdd
rbd_secret_uuid = <hdd-libvirt-secret-uuid>
```

## Step 4: Create Volume Types in OpenStack

```bash
# Restart Cinder to pick up new backends
systemctl restart openstack-cinder-volume

# Create volume types tied to each backend
openstack volume type create --property volume_backend_name=ceph-ssd premium-ssd
openstack volume type create --property volume_backend_name=ceph-hdd standard-hdd
```

## Step 5: Create and Test Tiered Volumes

```bash
# Create a premium SSD volume
openstack volume create \
  --type premium-ssd \
  --size 50 \
  my-db-volume

# Create a standard HDD volume
openstack volume create \
  --type standard-hdd \
  --size 500 \
  my-archive-volume

# Verify placement
openstack volume show my-db-volume -c volume_type -c host
rbd -p ssd-volumes ls | grep $(openstack volume show my-db-volume -f value -c id)
```

## Summary

Cinder's multi-backend feature combined with Ceph's pool flexibility lets you deliver tiered storage from a single cluster. By creating separate Ceph pools with different CRUSH rules and replication settings, then mapping each pool to a distinct Cinder backend and volume type, users can select the appropriate performance and cost tier when creating volumes. CRUSH rules ensure data lands on the correct OSD device class automatically.
