# How to Install Ceph on AlmaLinux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, AlmaLinux, RHEL, Linux, Installation, Storage, Block Storage

Description: Install Ceph on AlmaLinux 9 using cephadm, configure SELinux and firewall rules, and build a production-ready storage cluster.

---

## Overview

AlmaLinux is a community RHEL-compatible distribution that serves as a drop-in replacement for CentOS. It is fully compatible with Ceph's RHEL repositories and `cephadm`. This guide covers installing Ceph on AlmaLinux 9 with proper security configuration.

## Prerequisites

- 3+ AlmaLinux 9 servers (4 vCPU, 8GB RAM minimum)
- Additional raw disks for OSD on each node
- SSH root access between all nodes
- Static IP addresses assigned

## Step 1 - Prepare All Nodes

```bash
# Update packages
dnf update -y

# Install prerequisites
dnf install -y python3 curl podman lvm2 policycoreutils-python-utils

# Disable swap
swapoff -a
echo "vm.swappiness=0" >> /etc/sysctl.conf
sysctl -p

# Synchronize time (critical for Ceph)
dnf install -y chrony
systemctl enable --now chronyd
chronyc tracking
```

## Step 2 - Configure Firewall on All Nodes

```bash
firewall-cmd --permanent --add-service=ceph-mon
firewall-cmd --permanent --add-service=ceph
firewall-cmd --permanent --add-port=7480/tcp  # RGW
firewall-cmd --reload

# Verify
firewall-cmd --list-all
```

## Step 3 - Configure SELinux

```bash
# Verify SELinux mode
getenforce

# For Ceph containers, set appropriate booleans
setsebool -P container_use_devices on

# Set file contexts
semanage fcontext -a -t container_file_t "/var/lib/ceph(/.*)?"
restorecon -Rv /var/lib/ceph/
```

## Step 4 - Install and Bootstrap with cephadm

```bash
# Download cephadm
curl -fsSL https://download.ceph.com/rpm-squid/el9/noarch/cephadm \
  -o /usr/local/bin/cephadm
chmod +x /usr/local/bin/cephadm

# Bootstrap the cluster on the first node
cephadm bootstrap \
  --mon-ip 10.0.1.10 \
  --cluster-network 10.0.2.0/24 \
  --public-network 10.0.1.0/24
```

Note: Using a separate cluster network for OSD replication traffic improves performance and security.

## Step 5 - Add Cluster Members

```bash
# Distribute SSH public key
ssh-copy-id -i /etc/ceph/ceph.pub root@10.0.1.11
ssh-copy-id -i /etc/ceph/ceph.pub root@10.0.1.12

# Add nodes
ceph orch host add almalinux-node2 10.0.1.11
ceph orch host add almalinux-node3 10.0.1.12

# Deploy monitors to all nodes
ceph orch apply mon --placement="almalinux-node1,almalinux-node2,almalinux-node3"
```

## Step 6 - Deploy OSDs

```bash
# Check devices
ceph orch device ls --hostname=almalinux-node1
ceph orch device ls --hostname=almalinux-node2
ceph orch device ls --hostname=almalinux-node3

# Deploy all available OSDs
ceph orch apply osd --all-available-devices
```

Watch OSD creation:

```bash
ceph -w | grep "osd"
```

## Step 7 - Verify and Tune

```bash
ceph -s
ceph osd tree
ceph df detail

# Set CRUSH ruleset for replicated pools
ceph osd pool create mypool 32
ceph osd pool set mypool size 3
ceph osd pool set mypool min_size 2
```

## Setting Up Block Storage Access

```bash
# Create a client keyring
ceph auth get-or-create client.myapp \
  mon 'profile rbd' \
  osd 'profile rbd pool=mypool' \
  mgr 'profile rbd pool=mypool' \
  -o /etc/ceph/ceph.client.myapp.keyring

# Map an RBD image
rbd create mypool/myimage --size 10240
rbd map mypool/myimage --name client.myapp
mkfs.ext4 /dev/rbd/mypool/myimage
mount /dev/rbd/mypool/myimage /mnt/ceph
```

## Summary

Installing Ceph on AlmaLinux 9 using `cephadm` follows the same process as Rocky Linux, with firewalld services for Ceph already defined as named services. Using a dedicated cluster network separates replication traffic from client traffic. The SELinux `container_use_devices` boolean enables Ceph containers to access block devices while maintaining enforcing mode.
