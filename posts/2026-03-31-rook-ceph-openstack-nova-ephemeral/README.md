# How to Set Up Ceph as OpenStack Nova Ephemeral Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Nova, Ephemeral Storage, RBD, Compute

Description: Configure Ceph RBD as Nova's ephemeral disk backend so instance root disks are stored in Ceph, enabling live migration and fast COW boot from Glance images.

---

By default, Nova stores ephemeral instance disks on the local compute node filesystem. Storing them in Ceph RBD instead enables live migration without shared storage, instance evacuation, and copy-on-write boots from Glance images. This guide walks through the Nova-Ceph ephemeral configuration.

## Why Ceph for Nova Ephemeral

- Live migration works without shared NFS or SAN
- Instances can be evacuated to other compute nodes automatically
- When Glance images are also in Ceph, boot is a fast COW clone
- Instance disks benefit from Ceph replication and data protection

## Step 1: Create the Nova Instances Pool

```bash
# Create the pool for Nova instance disks
ceph osd pool create vms 128
rbd pool init vms

ceph osd pool set vms size 3
ceph osd pool set vms min_size 2
```

## Step 2: Create the Nova Ceph User

```bash
ceph auth get-or-create client.nova \
  mon 'profile rbd' \
  osd 'profile rbd pool=vms, profile rbd pool=images, profile rbd pool=volumes' \
  mgr 'profile rbd pool=vms' \
  -o /etc/ceph/ceph.client.nova.keyring
```

## Step 3: Distribute Credentials to Compute Nodes

```bash
# Run on each compute node
for node in compute1 compute2 compute3; do
  scp /etc/ceph/ceph.conf ${node}:/etc/ceph/
  scp /etc/ceph/ceph.client.nova.keyring ${node}:/etc/ceph/
  ssh ${node} "chown nova:nova /etc/ceph/ceph.client.nova.keyring && chmod 640 /etc/ceph/ceph.client.nova.keyring"
done
```

## Step 4: Configure Nova for Ceph

Edit `/etc/nova/nova.conf` on each compute node:

```ini
[libvirt]
images_type = rbd
images_rbd_pool = vms
images_rbd_ceph_conf = /etc/ceph/ceph.conf
rbd_user = nova
rbd_secret_uuid = <libvirt-secret-uuid>
disk_cachemodes = network=writeback
inject_password = false
inject_key = false
inject_partition = -1
live_migration_tunnelled = true
hw_disk_discard = unmap
```

## Step 5: Set Up libvirt Secret on Each Compute Node

```bash
SECRET_UUID="<same-uuid-used-for-cinder>"

cat > /tmp/nova-secret.xml <<EOF
<secret ephemeral='no' private='no'>
  <uuid>${SECRET_UUID}</uuid>
  <usage type='ceph'>
    <name>client.nova secret</name>
  </usage>
</secret>
EOF

virsh secret-define --file /tmp/nova-secret.xml
NOVA_KEY=$(ceph auth get-key client.nova)
virsh secret-set-value --secret ${SECRET_UUID} --base64 ${NOVA_KEY}
```

## Step 6: Restart Nova and Test

```bash
# Restart nova-compute on each node
systemctl restart openstack-nova-compute

# Launch an instance
openstack server create \
  --flavor m1.medium \
  --image "Ubuntu 22.04" \
  --network internal \
  ceph-test-vm

# Verify disk is in Ceph
INSTANCE_ID=$(openstack server show ceph-test-vm -f value -c id)
rbd -p vms ls | grep ${INSTANCE_ID}
rbd info vms/${INSTANCE_ID}_disk
```

## Verifying Live Migration

```bash
# Trigger live migration to another compute node
openstack server migrate --live-migration \
  --host compute2 ceph-test-vm

# Watch migration progress
openstack server show ceph-test-vm -c status -c OS-EXT-SRV-ATTR:host
```

## Summary

Using Ceph RBD for Nova ephemeral storage converts instance disks from local files to distributed RBD images. This enables live migration across any compute node in the cluster without shared file systems, and when combined with Ceph-backed Glance, new instances boot as fast copy-on-write clones. The configuration requires a dedicated pool, a Nova Ceph user, libvirt secrets on each compute node, and updates to nova.conf.
