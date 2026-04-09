# How to Install Ceph on Fedora

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Fedora, Linux, Installation, Storage, RPM, Development

Description: Install Ceph on Fedora Linux for development and testing using DNF packages from official Ceph repositories.

---

## Overview

Fedora serves as the upstream for RHEL and AlmaLinux, making it a good environment for testing new Ceph versions. While Fedora is not typically used for production Ceph, it is excellent for development, learning, and testing. This guide covers installing Ceph on Fedora 40+.

## Prerequisites

- Fedora 40 or newer (Fedora follows a rapid release cycle; check Ceph compatibility)
- At least 1 machine (single-node cluster for development is acceptable)
- Additional disk for OSD (or a loop device for testing)
- Root or sudo access

## Step 1 - Update System

```bash
dnf update -y
dnf install -y python3 podman curl git
```

## Step 2 - Install Ceph from Fedora Repositories

Fedora includes Ceph packages in its official repositories:

```bash
# Check available Ceph versions
dnf search ceph | head -20

# Install Ceph
dnf install -y ceph ceph-mgr ceph-mon ceph-osd ceph-radosgw cephadm
```

Alternatively, use the official Ceph repository for the latest version:

```bash
# For Ceph Squid (19.x)
cat > /etc/yum.repos.d/ceph.repo <<'EOF'
[ceph]
name=Ceph Squid
baseurl=https://download.ceph.com/rpm-squid/fc40/x86_64/
enabled=1
gpgcheck=1
gpgkey=https://download.ceph.com/keys/release.asc
EOF

dnf install -y cephadm
```

## Step 3 - Create a Loop Device for OSD (Development)

For development on a single machine:

```bash
# Create a 10GB sparse file
truncate -s 10G /tmp/ceph-osd.img
LOOP=$(losetup -f --show /tmp/ceph-osd.img)
echo "Loop device: $LOOP"

# Wipe any existing signatures
wipefs -a $LOOP
```

## Step 4 - Bootstrap a Single-Node Cluster

```bash
cephadm bootstrap \
  --mon-ip 127.0.0.1 \
  --single-host-defaults \
  --allow-fqdn-hostname
```

The `--single-host-defaults` flag adjusts minimum replica counts for a single-node setup.

## Step 5 - Add the Loop Device OSD

```bash
# Find the loop device
LOOP=$(losetup -j /tmp/ceph-osd.img | cut -d: -f1)

# Add to Ceph
ceph orch daemon add osd localhost:$LOOP
```

Monitor OSD creation:

```bash
ceph -w
```

## Step 6 - Verify the Single-Node Cluster

```bash
ceph -s
ceph osd tree
```

Expected output for single-node:

```yaml
cluster:
  health: HEALTH_WARN
         1 pool(s) have no replicas configured

services:
  mon: 1 daemons, quorum localhost
  mgr: localhost.xxxxx(active)
  osd: 1 osds: 1 up, 1 in
```

## Step 7 - Create a Test Pool

```bash
# Create pool with single replica for dev
ceph osd pool create testpool 16
ceph osd pool set testpool size 1
ceph osd pool set testpool min_size 1

# Write a test object
echo "Hello Ceph" | rados put test-object - --pool testpool
rados get test-object /tmp/test-output --pool testpool
cat /tmp/test-output
```

## Cleanup

```bash
# Remove the cluster
cephadm rm-cluster --fsid $(ceph fsid) --force

# Remove loop device
losetup -d $LOOP
rm /tmp/ceph-osd.img
```

## Summary

Installing Ceph on Fedora is straightforward using either Fedora's native DNF packages or the official Ceph RPM repository. For development purposes, loop devices provide OSD backing without dedicated hardware. Using `--single-host-defaults` with cephadm enables a functional single-node cluster suitable for testing, operator development, and learning Ceph administration.
