# How to Install Ceph on Amazon Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Amazon Linux, AWS, Linux, Installation, Storage, EC2

Description: Install Ceph on Amazon Linux 2023 on EC2 instances using the official Ceph RPM repository with EBS-backed OSDs.

---

## Overview

Amazon Linux 2023 (AL2023) is Amazon's cloud-optimized Linux distribution based on Fedora. It is compatible with RHEL/RPM packages, allowing you to install Ceph using the official Ceph RPM repositories. Running Ceph on EC2 with Amazon Linux provides a cost-effective storage solution using EBS gp3 volumes as OSDs. This guide covers the EC2-specific installation process.

## Prerequisites

- 3+ EC2 instances running Amazon Linux 2023 (m5.xlarge or larger)
- EBS gp3 volumes attached to each instance for OSDs
- Security groups allowing Ceph ports between instances
- SSH access with the `ec2-user` account

## Step 1 - Configure EC2 Security Groups

Allow Ceph traffic between nodes in the cluster security group:

```text
Inbound Rules:
- Type: Custom TCP, Port Range: 6789, Source: cluster-sg
- Type: Custom TCP, Port Range: 3300, Source: cluster-sg
- Type: Custom TCP, Port Range: 6800-7300, Source: cluster-sg
- Type: Custom TCP, Port Range: 7480, Source: 0.0.0.0/0 (RGW)
```

## Step 2 - Prepare Amazon Linux Nodes

On all instances:

```bash
# Update system
dnf update -y

# Install prerequisites
dnf install -y python3 podman curl nvme-cli

# Check EBS volume device names (NVMe on nitro instances)
lsblk
nvme list
```

On Nitro-based EC2 instances, EBS volumes appear as `/dev/nvme1n1`, `/dev/nvme2n1`, etc.

## Step 3 - Add Ceph Repository

```bash
cat > /etc/yum.repos.d/ceph.repo <<'EOF'
[ceph]
name=Ceph Squid Packages
baseurl=https://download.ceph.com/rpm-squid/el9/x86_64/
enabled=1
gpgcheck=1
gpgkey=https://download.ceph.com/keys/release.asc
priority=2
EOF

dnf makecache
```

## Step 4 - Install cephadm

```bash
dnf install -y cephadm
cephadm version
```

## Step 5 - Bootstrap on the First Node

```bash
# Get private IP (AL2023 requires IMDSv2)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
PRIVATE_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/local-ipv4)

cephadm bootstrap \
  --mon-ip $PRIVATE_IP \
  --allow-fqdn-hostname \
  --cluster-network 172.31.0.0/16
```

## Step 6 - Add Additional EC2 Nodes

```bash
# Exchange SSH keys with other nodes
ssh-copy-id -i /etc/ceph/ceph.pub ec2-user@10.0.1.11

# Switch to root for cephadm
ssh-copy-id -i /etc/ceph/ceph.pub root@10.0.1.11

# Add nodes
ceph orch host add ceph-node2 10.0.1.11
ceph orch host add ceph-node3 10.0.1.12
```

## Step 7 - Add EBS OSD Volumes

```bash
# Check available EBS volumes
ceph orch device ls

# Add all available NVMe EBS volumes as OSDs
ceph orch apply osd --all-available-devices
```

Monitor OSD creation:

```bash
ceph -w
```

## Step 8 - Verify and Configure Pools

```bash
ceph status

# Create a replicated pool
ceph osd pool create mypool 32
ceph osd pool set mypool size 3
ceph osd pool application enable mypool rbd
```

## Cost Optimization on AWS

To reduce cross-AZ replication costs, place all Ceph nodes in the same Availability Zone:

```bash
# Set CRUSH to avoid cross-AZ replication
ceph osd crush rule create-replicated local-az default host
ceph osd pool set mypool crush_rule local-az
```

## Summary

Installing Ceph on Amazon Linux 2023 requires adding the official Ceph RPM repository and using `cephadm` for cluster bootstrapping. EBS gp3 volumes attached to Nitro EC2 instances appear as NVMe devices and serve as OSDs. Placing nodes in the same Availability Zone reduces cross-AZ data transfer costs while maintaining Ceph's replication-based redundancy within a single AWS region.
