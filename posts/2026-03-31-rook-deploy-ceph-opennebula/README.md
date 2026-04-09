# How to Deploy Ceph on OpenNebula HCI Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OpenNebula, HCI, Storage, Deployment

Description: Learn how to deploy Ceph storage on OpenNebula HCI clusters, integrating Ceph RBD and CephFS as shared datastores for virtual machines and containers.

---

## OpenNebula and Ceph Integration

OpenNebula is an open-source cloud management platform that supports hyper-converged infrastructure (HCI) deployments. Ceph integrates with OpenNebula as a backend for VM image datastores (using RBD) and as a shared filesystem for container workloads (using CephFS). This combination provides scalable, highly available storage for both VM disks and live migration.

## Architecture Overview

In an OpenNebula HCI cluster with Ceph:
- Each hypervisor node runs Ceph OSD daemons alongside the virtualization stack
- Monitors run on dedicated nodes or co-located with hypervisors (3 or 5 monitors)
- OpenNebula frontend connects to Ceph for datastore operations
- VM disk images are stored as RBD images and attached directly from the hypervisor

## Preparing Ceph for OpenNebula

Deploy Ceph using cephadm (recommended for new deployments):

```bash
sudo cephadm bootstrap --mon-ip 192.168.1.10

# Add hypervisor nodes as OSDs
ceph orch host add node2 192.168.1.11
ceph orch host add node3 192.168.1.12
ceph orch apply osd --all-available-devices
```

Create a dedicated pool for OpenNebula:

```bash
# Create the RBD pool for OpenNebula
ceph osd pool create one 128 128 replicated
ceph osd pool application enable one rbd
rbd pool init one

# Create a user for OpenNebula
ceph auth get-or-create client.opennebula \
  mon 'allow r' \
  osd 'allow class-read object_prefix rbd_children, allow rwx pool=one'
```

## Configuring OpenNebula Ceph Datastore

On the OpenNebula frontend, create a Ceph datastore:

```bash
cat > ceph-datastore.conf << 'EOF'
NAME      = "ceph-datastore"
TYPE      = "IMAGE_DS"
DS_MAD    = "ceph"
TM_MAD    = "ceph"
DISK_TYPE = "RBD"
POOL_NAME = "one"
CEPH_HOST = "192.168.1.10"
CEPH_USER = "opennebula"
CEPH_SECRET = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
CEPH_CONF = "/etc/ceph/ceph.conf"
EOF

onedatastore create ceph-datastore.conf
```

## Creating the System Datastore

The system datastore holds running VM disks:

```bash
cat > ceph-system-ds.conf << 'EOF'
NAME      = "ceph-system"
TYPE      = "SYSTEM_DS"
TM_MAD    = "ceph"
POOL_NAME = "one"
CEPH_HOST = "192.168.1.10"
CEPH_USER = "opennebula"
CEPH_SECRET = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
EOF

onedatastore create ceph-system-ds.conf
```

## Deploying VMs with Ceph Storage

Create a VM template using the Ceph datastore:

```bash
cat > vm-template.conf << 'EOF'
NAME = "ceph-vm"
CPU  = 1
MEMORY = 1024
DISK = [
  IMAGE = "ubuntu-2204",
  IMAGE_UNAME = "oneadmin",
  DATASTORE = "ceph-datastore"
]
NIC = [ NETWORK = "public" ]
EOF

onetemplate create vm-template.conf
onetemplate instantiate ceph-vm
```

## Enabling Live Migration

Ceph RBD enables live migration between hypervisors because VM disk images are stored in the shared Ceph cluster rather than on local host storage:

```bash
# Live migrate a running VM
onevm migrate --live <VM_ID> <HOST_ID>
```

## Monitoring Ceph from OpenNebula

OpenNebula monitors Ceph capacity and reports it to the scheduler:

```bash
# Check datastore capacity
onedatastore show ceph-datastore

# View storage usage
onedatastore list
```

## Summary

OpenNebula and Ceph together deliver a powerful HCI platform for private cloud deployments. Ceph RBD provides the scalable, highly available block storage backend for VM images, while the tight integration with OpenNebula's datastore API enables seamless live migration and centralized capacity management. Deploying Ceph with cephadm and configuring OpenNebula datastores to use it requires only a dedicated RBD pool, a CephX key with appropriate capabilities, and datastore configuration pointing to the Ceph cluster.
