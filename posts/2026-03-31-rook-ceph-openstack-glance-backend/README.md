# How to Set Up Ceph as OpenStack Glance Image Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Glance, Image Storage, RBD, Cloud

Description: Configure Ceph RBD as the backend for OpenStack Glance to store VM images efficiently with copy-on-write cloning support for fast instance launches.

---

OpenStack Glance stores VM images and snapshots. Using Ceph RBD as the Glance backend enables copy-on-write cloning, so Nova can launch instances from images in seconds rather than copying gigabytes of data. This guide covers the full setup.

## Why Use Ceph for Glance

When Glance images are stored in Ceph and Nova uses Ceph for ephemeral disks, Nova can boot instances via a lightweight copy-on-write clone of the Glance image. This eliminates the image download step and dramatically reduces boot times.

## Step 1: Create the Images Pool

```bash
# Create a pool for Glance images
ceph osd pool create images 64

# Initialize for RBD
rbd pool init images

# Set replication policy
ceph osd pool set images size 3
ceph osd pool set images min_size 2
```

## Step 2: Create the Glance Ceph User

```bash
ceph auth get-or-create client.glance \
  mon 'profile rbd' \
  osd 'profile rbd pool=images' \
  mgr 'profile rbd pool=images' \
  -o /etc/ceph/ceph.client.glance.keyring
```

## Step 3: Distribute Credentials to Glance Nodes

```bash
# Copy config and keyring to every Glance API node
for node in glance1 glance2; do
  scp /etc/ceph/ceph.conf ${node}:/etc/ceph/
  scp /etc/ceph/ceph.client.glance.keyring ${node}:/etc/ceph/
  ssh ${node} "chown glance:glance /etc/ceph/ceph.client.glance.keyring && chmod 640 /etc/ceph/ceph.client.glance.keyring"
done
```

## Step 4: Configure Glance to Use Ceph

Edit `/etc/glance/glance-api.conf`:

```ini
[glance_store]
stores = rbd
default_store = rbd
rbd_store_pool = images
rbd_store_user = glance
rbd_store_ceph_conf = /etc/ceph/ceph.conf
rbd_store_chunk_size = 8
```

Also ensure the image format is set to raw for best performance with RBD:

```ini
[image_format]
disk_formats = ami,ari,aki,vhd,vmdk,raw,qcow2,vdi,iso
```

## Step 5: Restart Glance and Upload a Test Image

```bash
# Restart the Glance API service
systemctl restart openstack-glance-api

# Download a test image
curl -L https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img \
  -o jammy.img

# Convert to raw format for best RBD performance
qemu-img convert -f qcow2 -O raw jammy.img jammy.raw

# Upload to Glance
openstack image create \
  --file jammy.raw \
  --disk-format raw \
  --container-format bare \
  --public \
  "Ubuntu 22.04"

# Verify it landed in Ceph
IMAGE_ID=$(openstack image show "Ubuntu 22.04" -f value -c id)
rbd -p images ls | grep ${IMAGE_ID}
```

## Step 6: Verify Copy-on-Write Boot with Nova

For COW cloning to work, Nova must also be configured to use the same Ceph cluster. When Nova boots from a Glance image stored in Ceph, it creates a clone:

```bash
# Boot an instance
openstack server create \
  --flavor m1.small \
  --image "Ubuntu 22.04" \
  --network internal \
  test-vm

# Check that Nova created a COW clone in the vms pool
rbd -p vms ls | grep <instance-uuid>
rbd info vms/<instance-uuid>_disk | grep parent
# Should show: parent: images/<image-uuid>@snap
```

## Summary

Configuring Ceph as the OpenStack Glance backend involves creating a dedicated RBD pool, setting up a Glance-specific auth user, distributing credentials, and pointing Glance at the RBD store. When combined with Ceph-backed Nova ephemeral storage, images launch as copy-on-write clones, making instance boot times nearly instantaneous regardless of image size.
