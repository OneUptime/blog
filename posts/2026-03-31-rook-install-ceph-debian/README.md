# How to Install Ceph on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Debian, Linux, Installation, Storage, Object Storage, Block Storage

Description: Install Ceph on Debian Linux using the official Ceph repository, configure a minimal cluster, and verify cluster health.

---

## Overview

Installing Ceph directly on Debian Linux (without Kubernetes) is appropriate for traditional server environments or when building a standalone storage cluster. The Ceph project provides official Debian packages via its APT repository. This guide covers installation on Debian 12 (Bookworm).

## Prerequisites

- At least 3 Debian servers (physical or VMs) for a production cluster
- Each node with at least one raw disk for OSD (in addition to the OS disk)
- Root or sudo access on all nodes
- Network connectivity between all nodes

## Step 1 - Add the Ceph Repository

On the admin/bootstrap node, add the official Ceph APT repository:

```bash
# Install prerequisites
apt update
apt install -y curl gnupg apt-transport-https

# Ensure keyrings directory exists
mkdir -p /etc/apt/keyrings/

# Add Ceph GPG key
curl -fsSL https://download.ceph.com/keys/release.gpg | gpg --dearmor -o /etc/apt/keyrings/ceph.gpg

# Add repository for Ceph Squid (19.x) on Debian 12
echo "deb [signed-by=/etc/apt/keyrings/ceph.gpg] https://download.ceph.com/debian-squid/ bookworm main" \
  > /etc/apt/sources.list.d/ceph.list

apt update
```

## Step 2 - Install Ceph Packages

On the admin/bootstrap node, install `cephadm` and `ceph-common`. `cephadm` is the modern tool for bootstrapping and managing Ceph clusters (the older `ceph-deploy` tool is deprecated and no longer maintained). `cephadm` deploys all Ceph daemons as containers, so you do not need to install individual daemon packages (such as `ceph-mon` or `ceph-osd`) on any node:

```bash
apt install -y cephadm ceph-common
```

## Step 3 - Bootstrap the Cluster with cephadm

Use `cephadm` for modern cluster bootstrapping:

```bash
# Bootstrap the first monitor on node1
cephadm bootstrap \
  --mon-ip 192.168.1.10 \
  --initial-dashboard-user admin \
  --initial-dashboard-password changeme
```

## Step 4 - Add Additional Nodes

Copy the SSH key to other nodes:

```bash
ssh-copy-id -f -i /etc/ceph/ceph.pub root@192.168.1.11
ssh-copy-id -f -i /etc/ceph/ceph.pub root@192.168.1.12

# Add hosts to the cluster
ceph orch host add node2 192.168.1.11
ceph orch host add node3 192.168.1.12
```

Add additional monitors:

```bash
ceph orch apply mon 3
```

## Step 5 - Add OSDs

```bash
# List available devices
ceph orch device ls

# Add OSDs on all nodes with available drives
ceph orch apply osd --all-available-devices
```

Monitor OSD creation:

```bash
watch ceph -s
```

## Step 6 - Verify Cluster Health

```bash
ceph -s
ceph osd tree
ceph df
```

Expected healthy output:

```yaml
cluster:
  health: HEALTH_OK

services:
  mon: 3 daemons, quorum node1,node2,node3
  mgr: node1.abc(active)
  osd: 3 osds: 3 up, 3 in
```

## Step 7 - Install RGW for S3 Access (Optional)

```bash
ceph orch apply rgw mystore --placement="3"
cephadm shell -- radosgw-admin realm create --rgw-realm=default --default
cephadm shell -- radosgw-admin user create --uid=admin --display-name="Admin" --access-key=KEY --secret=SECRET
```

## Summary

Installing Ceph on Debian uses the official Ceph APT repository and `cephadm` for cluster bootstrapping and orchestration. Adding nodes via `ceph orch host add` and deploying OSDs with `ceph orch apply osd` creates a fully managed Ceph cluster with daemons running as containers managed by systemd. The result is a production-capable storage cluster with block, file, and object storage capabilities.
