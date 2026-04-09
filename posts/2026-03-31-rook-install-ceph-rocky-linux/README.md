# How to Install Ceph on Rocky Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rocky Linux, RHEL, Linux, Installation, Storage, Object Storage

Description: Install Ceph on Rocky Linux using cephadm with RHEL-compatible repositories and SELinux configuration for a production storage cluster.

---

## Overview

Rocky Linux is a community RHEL-compatible distribution ideal for enterprise Ceph deployments. Ceph on Rocky Linux benefits from RHEL's stability and long-term support. This guide covers installing Ceph on Rocky Linux 9 using `cephadm`, including SELinux and firewall configuration.

## Prerequisites

- 3+ Rocky Linux 9 nodes (16GB RAM recommended for production)
- Each node with at least one additional raw disk for OSDs
- Root access on all nodes
- Nodes reachable via hostname or IP

## Step 1 - System Preparation

On all nodes:

```bash
# Update system
dnf update -y

# Install required tools
dnf install -y python3 curl podman policycoreutils-python-utils

# Disable swap (recommended for Ceph)
swapoff -a
sed -i '/ swap / s/^/#/' /etc/fstab

# Set hostnames
hostnamectl set-hostname ceph-node1.example.com
```

## Step 2 - Configure Firewall

Open required Ceph ports:

```bash
firewall-cmd --permanent --add-port=6789/tcp   # mon
firewall-cmd --permanent --add-port=3300/tcp   # mon v2
firewall-cmd --permanent --add-port=6800-7300/tcp  # OSD, MGR, MDS, RGW
firewall-cmd --reload
```

## Step 3 - Configure SELinux

Ceph works with SELinux enforcing on Rocky Linux. Verify the correct SELinux context:

```bash
# Check current SELinux status
sestatus

# Set correct context for Ceph data directory
semanage fcontext -a -t container_file_t "/var/lib/ceph(/.*)?"
restorecon -Rv /var/lib/ceph
```

## Step 4 - Install cephadm

```bash
curl -fsSL https://download.ceph.com/rpm-squid/el9/noarch/cephadm -o /usr/local/bin/cephadm
chmod +x /usr/local/bin/cephadm

# Verify cephadm
cephadm version
```

## Step 5 - Bootstrap the Cluster

On the first node:

```bash
cephadm bootstrap \
  --mon-ip 192.168.1.10 \
  --initial-dashboard-user admin \
  --initial-dashboard-password Secure123! \
  --allow-fqdn-hostname
```

## Step 6 - Add Nodes to the Cluster

```bash
# Distribute SSH keys
ssh-copy-id -i /etc/ceph/ceph.pub root@192.168.1.11
ssh-copy-id -i /etc/ceph/ceph.pub root@192.168.1.12

# Add hosts
ceph orch host add ceph-node2 192.168.1.11
ceph orch host add ceph-node3 192.168.1.12

# Wait for orchestrator to be ready on new nodes
ceph orch host ls
```

## Step 7 - Deploy OSDs

```bash
# Check available devices
ceph orch device ls

# Deploy OSDs
ceph orch apply osd --all-available-devices
```

Monitor progress:

```bash
ceph -w
```

## Step 8 - Enable the Dashboard

```bash
# Access dashboard
ceph mgr services | grep dashboard

# Reset admin password if needed
echo 'Secure123!' > /tmp/dashboard-pw.txt
ceph dashboard ac-user-set-password admin -i /tmp/dashboard-pw.txt --force-password
rm /tmp/dashboard-pw.txt
```

## Verify Cluster Health

```bash
ceph status
ceph osd df
ceph pg stat
```

## Summary

Installing Ceph on Rocky Linux 9 with `cephadm` requires configuring firewalld to allow Ceph ports, setting correct SELinux file contexts for Ceph data directories, and using the `--allow-fqdn-hostname` flag when bootstrapping. The resulting cluster benefits from Rocky Linux's RHEL-compatible stability and long-term support lifecycle for production storage environments.
