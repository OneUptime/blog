# How to Install Ceph on Oracle Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Oracle Linux, RHEL, Linux, Installation, Storage, Enterprise

Description: Install Ceph on Oracle Linux using official RPM repositories, with Oracle-specific kernel and UEK compatibility considerations.

---

## Overview

Oracle Linux is a RHEL-compatible enterprise distribution that ships with the Unbreakable Enterprise Kernel (UEK), which provides performance improvements for storage workloads. Ceph on Oracle Linux benefits from UEK's optimized RBD and CephFS kernel client implementations. This guide covers installation on Oracle Linux 9.

## Prerequisites

- 3+ Oracle Linux 9 nodes
- UEK kernel installed (recommended) or RHEL-compatible kernel
- Additional raw disks for OSD on each node
- Oracle Linux subscription or access to ULN

## Step 1 - Configure Oracle Linux Repositories

Oracle Linux 9 does not ship Ceph packages in its App Streams. Use the official Ceph repository instead:

```bash
cat > /etc/yum.repos.d/ceph.repo <<'EOF'
[ceph]
name=Ceph Squid
baseurl=https://download.ceph.com/rpm-squid/el9/x86_64/
enabled=1
gpgcheck=1
gpgkey=https://download.ceph.com/keys/release.asc
EOF

dnf install -y cephadm
```

## Step 2 - Install UEK Kernel

If not already using UEK:

```bash
# Check current kernel
uname -r

# Install UEK
dnf install -y kernel-uek kernel-uek-devel

# Set UEK as default
grubby --set-default /boot/vmlinuz-*uek*

# Reboot to load UEK
reboot
```

After reboot, verify UEK:

```bash
uname -r
# Should show a UEK version, e.g.: 5.15.x-xxx.x.x.el9uek.x86_64 (UEK R7) or 6.8.x-xxx.x.x.el9uek.x86_64 (UEK R8)
```

## Step 3 - Configure Firewall and SELinux

```bash
# Configure firewall
firewall-cmd --permanent --add-service=ceph
firewall-cmd --permanent --add-service=ceph-mon
firewall-cmd --reload

# Set SELinux for Ceph
setsebool -P container_use_devices on
semanage fcontext -a -t container_file_t "/var/lib/ceph(/.*)?"
restorecon -Rv /var/lib/ceph
```

## Step 4 - Bootstrap the Cluster

```bash
# Synchronize time via chrony
dnf install -y chrony
systemctl enable --now chronyd

# Bootstrap the cluster
cephadm bootstrap \
  --mon-ip 10.0.1.10 \
  --cluster-network 10.0.2.0/24 \
  --allow-fqdn-hostname
```

## Step 5 - Add Nodes and Deploy OSDs

```bash
# Exchange SSH keys
ssh-copy-id -i /etc/ceph/ceph.pub root@10.0.1.11
ssh-copy-id -i /etc/ceph/ceph.pub root@10.0.1.12

# Add hosts
ceph orch host add oracle-node2 10.0.1.11
ceph orch host add oracle-node3 10.0.1.12

# Deploy OSDs
ceph orch apply osd --all-available-devices
```

## Step 6 - Verify UEK Kernel Improvements

With UEK, the kernel RBD client shows improved performance. Verify the RBD module:

```bash
# Check RBD module is loaded
lsmod | grep rbd

# Check RBD kernel module details
modinfo rbd
```

Test RBD performance with UEK:

```bash
ceph osd pool create benchpool 32
rbd create benchpool/bench --size 10240
rbd map benchpool/bench
fio --filename=/dev/rbd/benchpool/bench --rw=randwrite --bs=4k --ioengine=libaio --iodepth=32 --numjobs=4 --time_based --runtime=60 --name=bench
```

## Step 7 - Check Cluster Health

```bash
ceph -s
ceph osd tree
ceph df
```

## Summary

Installing Ceph on Oracle Linux 9 with the UEK kernel provides enhanced RBD and CephFS client performance through Oracle's storage-optimized kernel. Oracle Linux's RHEL compatibility makes it straightforward to use the official Ceph RPM repository. The UEK kernel's improved storage subsystem makes Oracle Linux a strong choice for Ceph client workloads, particularly for RBD-backed virtual machine disks.
