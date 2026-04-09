# How to Install Ceph on SUSE Linux Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, SUSE, SLE, Enterprise Linux, Installation, Storage

Description: Install Ceph on SUSE Linux Enterprise Server using SUSE's supported Ceph packages and SES orchestration tools.

---

## Overview

SUSE Linux Enterprise Server (SLES) supports Ceph through SUSE Enterprise Storage (SES), a commercial Ceph distribution. Alternatively, you can use the community `cephadm` approach with SUSE's repositories. This guide covers both approaches for SLES 15 SP5+.

## Prerequisites

- SLES 15 SP5 or newer on 3+ nodes
- SUSE Linux Enterprise subscription (for SES approach)
- Each node with additional raw disks for OSDs
- Root access on all nodes

## Approach 1 - SUSE Enterprise Storage (Recommended for Production)

SUSE Enterprise Storage is fully supported and integrates with SUSE's update infrastructure.

### Register and Enable SES Module

```bash
# Register SLES
SUSEConnect --regcode YOUR_REGISTRATION_CODE

# Enable SES module
SUSEConnect -p ses/7/x86_64

# Verify module is enabled
SUSEConnect --list-extensions | grep ses
```

### Install SES Packages

```bash
zypper refresh
zypper install -y ceph cephadm ceph-grafana-dashboards
```

## Approach 2 - Community cephadm

For non-commercial use, install directly from the Ceph project:

```bash
# Install prerequisites
zypper install -y python3 curl podman

# Download cephadm
curl -fsSL https://download.ceph.com/rpm-squid/el9/noarch/cephadm \
  -o /usr/local/bin/cephadm
chmod +x /usr/local/bin/cephadm
```

## Step 1 - Configure Firewall (firewalld)

SLES 15 uses firewalld:

```bash
firewall-cmd --permanent --add-service=ceph
firewall-cmd --permanent --add-service=ceph-mon
firewall-cmd --permanent --add-port=7480/tcp
firewall-cmd --reload
```

## Step 2 - Bootstrap the Cluster

```bash
cephadm bootstrap \
  --mon-ip 192.168.10.1 \
  --cluster-network 192.168.20.0/24 \
  --allow-fqdn-hostname
```

## Step 3 - Configure AppArmor

SLES may use AppArmor instead of SELinux. Allow Ceph container operations:

```bash
# Check AppArmor status
systemctl status apparmor

# For cephadm containers, add to AppArmor abstractions
echo "/var/lib/ceph/** rwk," >> /etc/apparmor.d/abstractions/ceph
systemctl reload apparmor
```

## Step 4 - Add Nodes and Deploy

```bash
# Copy SSH key to other nodes
ssh-copy-id -i /etc/ceph/ceph.pub root@192.168.10.2
ssh-copy-id -i /etc/ceph/ceph.pub root@192.168.10.3

# Add nodes
ceph orch host add sles-node2 192.168.10.2
ceph orch host add sles-node3 192.168.10.3

# Deploy monitors and OSDs
ceph orch apply mon 3
ceph orch apply osd --all-available-devices
```

## Step 5 - SUSE-Specific Tuning

SLES uses XFS for the root filesystem by default, which is optimal for Ceph. Ensure the OSD disks are wiped:

```bash
# Wipe disk signatures
wipefs -a /dev/sdb
sgdisk --zap-all /dev/sdb
```

For legacy FileStore setups, configure the OSD journal size:

```bash
ceph config set osd osd_journal_size 1024
```

## Step 6 - Verify Health

```bash
ceph -s
ceph osd df
ceph df
```

## SUSE-Specific Monitoring

SUSE Enterprise Storage includes pre-configured Grafana dashboards:

```bash
ceph mgr module enable dashboard
ceph dashboard set-grafana-api-url http://localhost:3000
```

## Summary

Installing Ceph on SUSE Linux Enterprise is best done via SUSE Enterprise Storage for production environments, which provides commercial support and update infrastructure. The community cephadm approach works for non-commercial scenarios. Key SLES considerations are AppArmor configuration for container operations and firewalld rules using Ceph's named services for clean firewall management.
