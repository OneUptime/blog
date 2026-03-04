# How to Create and Mount a CephFS Filesystem on RHEL Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ceph, CephFS, Filesystem, Storage

Description: Create a CephFS filesystem on your Ceph cluster and mount it on RHEL client machines using either the kernel driver or ceph-fuse.

---

CephFS provides a POSIX-compliant distributed filesystem on top of Ceph. RHEL clients can mount it using the kernel CephFS driver or the FUSE-based ceph-fuse client.

## Create the CephFS Filesystem

On the Ceph admin node, create the required pools and filesystem:

```bash
# Deploy MDS (Metadata Server) daemons - CephFS requires at least one
sudo ceph orch apply mds myfs --placement="2 node1 node2"

# Create the data and metadata pools
sudo ceph osd pool create cephfs_data 64
sudo ceph osd pool create cephfs_metadata 32

# Create the filesystem
sudo ceph fs new myfs cephfs_metadata cephfs_data

# Verify the filesystem
sudo ceph fs ls
sudo ceph fs status myfs
```

## Create a Client Auth Key

Generate a restricted key for the client:

```bash
# Create a client key with access to the CephFS filesystem
sudo ceph fs authorize myfs client.cephfs-user / rw

# Retrieve the key
sudo ceph auth get client.cephfs-user
```

Save the key to use on the client machine.

## Mount Using the Kernel Driver

On the RHEL client, install the ceph-common package:

```bash
# Install ceph client tools
sudo dnf install -y ceph-common
```

Copy the Ceph configuration and keyring to the client:

```bash
# Copy from admin node
sudo scp root@node1:/etc/ceph/ceph.conf /etc/ceph/
# Create the keyring file
echo "AQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx==" | sudo tee /etc/ceph/ceph.client.cephfs-user.keyring
```

Mount the filesystem:

```bash
# Create the mount point
sudo mkdir -p /mnt/cephfs

# Mount using the kernel driver
sudo mount -t ceph node1:6789,node2:6789:/ /mnt/cephfs \
    -o name=cephfs-user,secretfile=/etc/ceph/ceph.client.cephfs-user.keyring

# Verify the mount
df -h /mnt/cephfs
```

## Persist the Mount in fstab

Add an entry to `/etc/fstab`:

```text
node1:6789,node2:6789:/   /mnt/cephfs   ceph   name=cephfs-user,secretfile=/etc/ceph/ceph.client.cephfs-user.keyring,_netdev   0 0
```

## Mount Using ceph-fuse (Alternative)

If the kernel driver is not available:

```bash
# Install ceph-fuse
sudo dnf install -y ceph-fuse

# Mount with ceph-fuse
sudo ceph-fuse /mnt/cephfs --id cephfs-user

# Verify
df -h /mnt/cephfs
```

## Test File Operations

```bash
# Write a test file
echo "CephFS is working" | sudo tee /mnt/cephfs/test.txt

# Read it back
cat /mnt/cephfs/test.txt
```

CephFS provides scalable shared storage that multiple RHEL clients can mount simultaneously for distributed workloads.
