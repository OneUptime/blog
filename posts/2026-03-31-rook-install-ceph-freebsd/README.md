# How to Install Ceph on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, FreeBSD, Unix, Installation, Storage, Port, BSD

Description: Install Ceph on FreeBSD using the Ports collection or pkg binary packages for a BSD-based storage cluster.

---

## Overview

FreeBSD supports Ceph, though the Ceph port was removed from the FreeBSD ports tree in 2023. Ceph must now be built from source on FreeBSD. While Linux is the primary Ceph platform, FreeBSD provides a working Ceph installation for organizations already using FreeBSD infrastructure. Note that Ceph on FreeBSD has some limitations compared to Linux, particularly around kernel client features. This guide covers building from source and manual cluster deployment.

## Prerequisites

- FreeBSD 14.x or newer (recommended)
- At least 3 nodes for a cluster (or 1 for development)
- Additional disk for OSD
- Root access
- Internet access for pkg repository

## Important FreeBSD Limitations

Before proceeding, understand these FreeBSD-specific limitations:

- **No kernel RBD client** - FreeBSD lacks the in-kernel rbd module
- **No CephFS kernel client** - CephFS mounts require FUSE
- **cephadm not supported** - Manual deployment required
- **Container support** - podman/docker support is limited on FreeBSD

These limitations make FreeBSD better suited for Ceph RGW (object storage) servers than full cluster roles.

## Step 1 - Update pkg and Install Dependencies

```bash
# Update pkg repository
pkg update

# Install required dependencies
pkg install -y python3 leveldb snappy lz4 gperftools rdkafka lua54
```

## Step 2 - Install Ceph from Source

The Ceph port (`net/ceph14`) was removed from the FreeBSD ports tree in 2023, so binary packages are no longer available via pkg. Ceph must be built from source on FreeBSD.

```bash
# Install build dependencies
pkg install -y cmake git ninja gcc bash

# Clone the Ceph source
git clone https://github.com/ceph/ceph.git
cd ceph
git checkout v18.2.0  # or the latest stable release tag
git submodule update --init --recursive

# Build Ceph (see README.FreeBSD in the source tree for details)
./do_freebsd.sh
```

Refer to the `README.FreeBSD` file in the Ceph source tree for the most up-to-date build instructions, as FreeBSD build steps may change between releases.

After building, verify the installation:

```bash
ceph --version
```

## Step 3 - Configure Ceph on FreeBSD

Create the Ceph configuration file:

First, generate a UUID for the cluster and create the config directory:

```bash
uuidgen
# Copy the output UUID for use in ceph.conf below

mkdir -p /usr/local/etc/ceph
ln -s /usr/local/etc/ceph /etc/ceph
```

```ini
# /usr/local/etc/ceph/ceph.conf
[global]
fsid = <paste-your-generated-uuid-here>
mon initial members = freebsd-node1
mon host = 192.168.1.10
auth cluster required = cephx
auth service required = cephx
auth client required = cephx
osd pool default size = 3
osd pool default min size = 2
```

## Step 4 - Bootstrap the Monitor

```bash
# Create required directories
mkdir -p /var/lib/ceph/mon/ceph-freebsd-node1
mkdir -p /var/lib/ceph/osd

# Create monitor keyring
ceph-authtool \
  --create-keyring /tmp/ceph.mon.keyring \
  --gen-key \
  -n mon.

# Create admin keyring
ceph-authtool \
  --create-keyring /usr/local/etc/ceph/ceph.client.admin.keyring \
  --gen-key \
  -n client.admin \
  --cap mon 'allow *' \
  --cap osd 'allow *' \
  --cap mds 'allow *' \
  --cap mgr 'allow *'

# Import admin key into monitor keyring
ceph-authtool /tmp/ceph.mon.keyring \
  --import-keyring /usr/local/etc/ceph/ceph.client.admin.keyring

# Create the monitor map
FSID=$(grep fsid /usr/local/etc/ceph/ceph.conf | awk '{print $3}')
monmaptool --create \
  --add freebsd-node1 192.168.1.10 \
  --fsid $FSID \
  /tmp/monmap

# Initialize monitor
ceph-mon --cluster ceph \
  --mkfs \
  -i freebsd-node1 \
  --monmap /tmp/monmap \
  --keyring /tmp/ceph.mon.keyring
```

## Step 5 - Configure OSD on FreeBSD

```bash
# Get OSD UUID and prepare OSD
OSD_UUID=$(uuidgen)
OSD_ID=$(ceph osd create $OSD_UUID)

mkdir -p /var/lib/ceph/osd/ceph-$OSD_ID

# Initialize OSD
ceph-osd --cluster ceph \
  -i $OSD_ID \
  --mkfs \
  --mkkey \
  --osd-uuid $OSD_UUID

# Register the OSD keyring
ceph auth add osd.$OSD_ID osd 'allow *' mon 'allow profile osd' \
  -i /var/lib/ceph/osd/ceph-$OSD_ID/keyring
```

## Step 6 - Enable rc.d Services

```bash
# Enable Ceph service in rc.conf
echo 'ceph_enable="YES"' >> /etc/rc.conf

# Create bsdrc marker for OSD (required on FreeBSD)
touch /var/lib/ceph/osd/ceph-$OSD_ID/bsdrc

# Start services
service ceph start mon.freebsd-node1
service ceph start osd.$OSD_ID
```

## Step 7 - Verify

```bash
ceph -s
ceph osd tree
```

## Summary

Ceph on FreeBSD works primarily for RGW object storage servers and cluster management roles rather than full block/file storage clients due to the absence of kernel RBD and CephFS drivers. Since the Ceph port was removed from FreeBSD's ports tree, installation requires building from source with manual cluster configuration, as cephadm is also not supported. FreeBSD's ZFS can complement Ceph by providing the underlying storage for OSD directories.
