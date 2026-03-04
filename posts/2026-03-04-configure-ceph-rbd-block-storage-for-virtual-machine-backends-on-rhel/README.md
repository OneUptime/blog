# How to Configure Ceph RBD Block Storage for Virtual Machine Backends on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, RBD, Block Storage, Virtualization

Description: Set up Ceph RADOS Block Devices (RBD) on RHEL as storage backends for virtual machines, providing thin-provisioned, snapshot-capable block volumes.

---

Ceph RBD provides block storage that can be used as virtual machine disk backends. RBD images are thin-provisioned, support snapshots, and replicate across the cluster automatically.

## Create an RBD Pool

```bash
# Create a pool for RBD images
sudo ceph osd pool create rbd-pool 128

# Initialize the pool for RBD use
sudo rbd pool init rbd-pool

# Enable the rbd application on the pool
sudo ceph osd pool application enable rbd-pool rbd
```

## Create an RBD Image

```bash
# Create a 50 GB thin-provisioned image
sudo rbd create --size 51200 rbd-pool/vm-disk1

# Verify the image
sudo rbd info rbd-pool/vm-disk1

# List all images in the pool
sudo rbd ls rbd-pool
```

## Map the RBD Image on a RHEL Client

On the client that will use the block device:

```bash
# Install ceph-common
sudo dnf install -y ceph-common

# Copy ceph.conf and admin keyring from the cluster
sudo scp root@node1:/etc/ceph/ceph.conf /etc/ceph/
sudo scp root@node1:/etc/ceph/ceph.client.admin.keyring /etc/ceph/

# Map the RBD image to a local block device
sudo rbd map rbd-pool/vm-disk1

# Check the mapped device
sudo rbd showmapped
# Output shows /dev/rbd0
```

## Format and Mount for Direct Use

```bash
# Create a filesystem
sudo mkfs.xfs /dev/rbd0

# Mount it
sudo mkdir -p /mnt/rbd-disk
sudo mount /dev/rbd0 /mnt/rbd-disk
```

## Use with libvirt/KVM

Create a Ceph secret for libvirt:

```bash
# Get the admin key
CEPH_KEY=$(sudo ceph auth get-key client.admin)

# Define the secret in libvirt
cat > /tmp/secret.xml << 'XMLEOF'
<secret ephemeral='no' private='no'>
  <uuid>a5d0dd94-57c4-11e2-8977-080027164f02</uuid>
  <usage type='ceph'>
    <name>client.admin secret</name>
  </usage>
</secret>
XMLEOF

sudo virsh secret-define /tmp/secret.xml
sudo virsh secret-set-value a5d0dd94-57c4-11e2-8977-080027164f02 "$CEPH_KEY"
```

Add the RBD disk to a VM domain XML:

```xml
<disk type='network' device='disk'>
  <driver name='qemu' type='raw'/>
  <auth username='admin'>
    <secret type='ceph' uuid='a5d0dd94-57c4-11e2-8977-080027164f02'/>
  </auth>
  <source protocol='rbd' name='rbd-pool/vm-disk1'>
    <host name='node1' port='6789'/>
  </source>
  <target dev='vda' bus='virtio'/>
</disk>
```

## Snapshots and Clones

```bash
# Create a snapshot
sudo rbd snap create rbd-pool/vm-disk1@snap1

# List snapshots
sudo rbd snap ls rbd-pool/vm-disk1

# Clone from snapshot (for fast VM provisioning)
sudo rbd snap protect rbd-pool/vm-disk1@snap1
sudo rbd clone rbd-pool/vm-disk1@snap1 rbd-pool/vm-disk2
```

RBD provides flexible, scalable block storage ideal for virtual machine backends on RHEL.
