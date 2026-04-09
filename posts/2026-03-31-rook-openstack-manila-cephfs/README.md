# How to Set Up OpenStack Manila with CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OpenStack, Manila, CephFS, Shared Filesystem, NFS

Description: Configure OpenStack Manila to use CephFS as the shared filesystem backend, providing multi-attach NFS shares to OpenStack tenants.

---

OpenStack Manila provides shared file system services (NFS, CIFS) to OpenStack tenants. Using CephFS as the Manila backend gives you scalable, distributed shared storage with quota enforcement and snapshot support. This guide covers the native CephFS driver setup.

## Architecture

Manila uses the CephFS Native driver to create CephFS subvolumes for each share. Clients can mount shares either via the Ceph kernel client or FUSE. Alternatively, the NFS-Ganesha driver exports CephFS shares over NFS for non-Ceph-aware clients.

## Step 1: Enable CephFS on the Cluster

```bash
# Deploy the MDS (Metadata Server)
ceph fs volume create cephfs

# Verify MDS is active
ceph fs status cephfs
ceph mds stat
```

## Step 2: Create Manila Ceph User

```bash
ceph auth get-or-create client.manila \
  mon 'allow r, allow command "auth get-or-create", allow command "auth delete", allow command "auth caps"' \
  mds 'allow *' \
  osd 'allow rw tag cephfs metadata=cephfs, allow rw tag cephfs data=cephfs' \
  -o /etc/ceph/ceph.client.manila.keyring
```

## Step 3: Distribute Credentials to Manila Nodes

```bash
for node in manila1 manila2; do
  scp /etc/ceph/ceph.conf ${node}:/etc/ceph/
  scp /etc/ceph/ceph.client.manila.keyring ${node}:/etc/ceph/
  ssh ${node} "chown manila:manila /etc/ceph/ceph.client.manila.keyring && chmod 640 /etc/ceph/ceph.client.manila.keyring"
done
```

## Step 4: Configure Manila for CephFS

Edit `/etc/manila/manila.conf`:

```ini
[DEFAULT]
enabled_share_backends = cephfs-native
enabled_share_protocols = CEPHFS, NFS

[cephfs-native]
share_backend_name = CEPHFS
share_driver = manila.share.drivers.cephfs.driver.CephFSDriver
driver_handles_share_servers = False
cephfs_conf_path = /etc/ceph/ceph.conf
cephfs_auth_id = manila
cephfs_cluster_name = ceph
cephfs_volume_mode = 0755
```

## Step 5: Create Manila Share Types and Shares

```bash
# Restart Manila services
systemctl restart openstack-manila-share openstack-manila-api

# Create a share type
openstack share type create cephfs False \
  --extra-specs driver_handles_share_servers=False vendor_name=Ceph storage_protocol=CEPHFS

# Create a 100 GB CephFS share
openstack share create \
  --name my-cephfs-share \
  --share-type cephfs \
  CEPHFS 100
```

## Step 6: Grant Access and Mount

```bash
# Grant access to a specific Ceph user
openstack share access create my-cephfs-share cephx myuser

# Get the access rule (this shows the Ceph key)
openstack share access list my-cephfs-share

# Get export location
openstack share show my-cephfs-share -c export_locations

# Mount on a client using the kernel driver
mount -t ceph mon1:6789,mon2:6789,mon3:6789:/volumes/_nogroup/my-share-uuid \
  /mnt/myshare \
  -o name=myuser,secret=<cephx-key>
```

## Summary

OpenStack Manila with the CephFS native driver creates CephFS subvolumes for each share, enforcing quotas and isolating tenant data. The setup requires enabling CephFS with an MDS, creating a Manila-specific Ceph auth user with appropriate caps, and configuring the CephFS driver in manila.conf. Tenants receive POSIX-compatible shared filesystems that can be mounted simultaneously from multiple OpenStack instances.
