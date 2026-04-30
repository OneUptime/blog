# How to Troubleshoot Harvester Installation Issues - Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Troubleshooting, Installation

Description: A comprehensive troubleshooting guide for resolving common Harvester installation and cluster bootstrap issues.

## Introduction

Installing Harvester on bare metal involves hardware setup, network configuration, OS installation, and Kubernetes bootstrap - each of which can encounter issues. This guide covers the most common installation problems and their solutions, organized by the phase in which they typically occur.

## Common Installation Issues

### Issue 1: System Won't Boot from USB/ISO

**Symptoms:**
- Server boots directly to the existing OS
- USB drive not detected in boot menu
- "No bootable device" error

**Troubleshooting:**

```bash
# Verify the USB was written correctly

# Check the ISO checksum first
sha512sum harvester-v1.3.0-amd64.iso
# Compare with the published checksum

# Re-write the USB with explicit sync
sudo dd if=harvester-v1.3.0-amd64.iso \
        of=/dev/sdX \
        bs=4M \
        status=progress \
        oflag=sync && sync

# If using Rufus on Windows, try:
# - GPT partition scheme + UEFI (for modern servers)
# - MBR partition scheme + BIOS (for older servers)
# - Try writing to a different USB drive
```

**BIOS/UEFI Settings to Check:**
- Disable Secure Boot
- Enable Legacy Boot or CSM if needed
- Set USB as first boot device
- Disable Fast Boot

---

### Issue 2: Installation Fails with Disk Errors

**Symptoms:**
- "Failed to partition device" error
- "No suitable disks found" error
- Installation hangs at disk formatting

**Troubleshooting:**

```bash
# Log in to the Harvester live installer shell (press Ctrl+Alt+F2)
# Or boot a Linux live USB and check disk health

# Check disk health with SMART
smartctl -a /dev/sda

# Check for existing partitions that need to be cleared
lsblk -f /dev/sda

# Clear existing signatures and partitions
wipefs -a /dev/sda
sgdisk --zap-all /dev/sda

# If disk has LVM metadata
lvdisplay | head -20
vgremove -f <vgname>
pvremove /dev/sda

# Check for RAID metadata
mdadm --examine /dev/sda
# If found: mdadm --zero-superblock /dev/sda

# Verify the disk is visible to the installer
lsblk
ls /dev/sd*
```

---

### Issue 3: Network Configuration Fails

**Symptoms:**
- Cannot reach the installer via network
- "Failed to configure network interface" error
- No IP address assigned

**Troubleshooting:**

```bash
# During installation, press Ctrl+Alt+F2 for a shell
# Or after first boot, access the node console

# Check network interface names
ip link show

# Check if the NIC is detected
lspci | grep -i ethernet
lspci | grep -i network

# Check if drivers are loaded
dmesg | grep -i eth
dmesg | grep -i net

# Check whether a default route exists
ip route

# Try manually configuring the interface
ip link set <interface> up
ip addr add 192.168.1.11/24 dev <interface>
ip route add default via 192.168.1.1 dev <interface>

# Test network connectivity
ping -c 3 192.168.1.1
ping -c 3 8.8.8.8
```

**NIC Not Detected:**
```bash
# Check if a driver needs to be loaded manually
# Identify the NIC chip
lspci -v | grep -A 10 "Ethernet"

# Load the appropriate driver (example for Intel 82599)
modprobe ixgbe

# For Mellanox/NVIDIA NICs
modprobe mlx5_core
```

---

### Issue 4: Installation Completes but System Won't Boot

**Symptoms:**
- "Kernel panic" after installation
- System boots to GRUB but fails to load Harvester
- Infinite reboot loop

**Troubleshooting:**

```bash
# In the GRUB menu, press 'e' to edit boot parameters
# Add these to the end of the 'linux' line for verbose boot:
# systemd.log_level=debug console=ttyS0,115200n8

# Common kernel parameter fix:
# If display output is blank or older graphics firmware is involved, add 'nomodeset'

# Access rescue mode
# Add to GRUB linux line: systemd.unit=rescue.target

# Check boot logs
journalctl -xb
journalctl --unit=rke2-server --follow

# Check if RKE2 failed to start
systemctl status rke2-server
journalctl -u rke2-server -n 100
```

---

### Issue 5: RKE2/Kubernetes Fails to Start

**Symptoms:**
- Installation completes but Harvester UI is inaccessible
- kubectl commands fail
- Pods stay in Pending or CrashLoopBackOff

**Troubleshooting:**

```bash
# SSH into the node (using the rancher user)
ssh rancher@192.168.1.11

# Check RKE2 server status
sudo systemctl status rke2-server

# View RKE2 logs
sudo journalctl -u rke2-server -f

# Check if the cluster is up
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml get nodes

# Common RKE2 startup issues:
# 1. Port conflicts
sudo ss -tlnp | grep -E "6443|9345|2379|2380"

# 2. Certificate issues (clock skew)
timedatectl status
# If time is wrong, fix NTP first, then rotate certs using the supported workflow:
sudo systemctl stop rke2-server
sudo rke2 certificate rotate
sudo systemctl start rke2-server

# 3. etcd startup failure
sudo ls -la /var/lib/rancher/rke2/server/db/
sudo journalctl -u rke2-server | grep -i etcd
```

---

### Issue 6: Node Won't Join the Cluster

**Symptoms:**
- New node shows NotReady
- "failed to bootstrap system" or token-related errors in rancherd logs
- Timeout joining existing cluster

**Troubleshooting:**

```bash
# On the new node, check connectivity to the cluster VIP
ping -c 3 192.168.1.100
curl -fk https://192.168.1.100/version

# Check rancherd bootstrap logs on the joining node
sudo journalctl -b -u rancherd

# Check the join token is correct
sudo yq eval .token /etc/rancher/rancherd/config.yaml

# Compare with the token on the existing cluster
ssh rancher@192.168.1.11
sudo yq eval .token /etc/rancher/rancherd/config.yaml

# Check firewall rules
sudo firewall-cmd --list-all  # For systems with firewalld

# Required ports to open between Harvester nodes:
# TCP 6443 - Kubernetes API
# TCP 9345 - RKE2 supervisor API
# TCP 10250 - kubelet
# UDP 8472 - Canal/Flannel VXLAN
# If the joining node is or becomes a management node, also allow TCP 2379,2380,2381
sudo firewall-cmd --add-port=6443/tcp --permanent
sudo firewall-cmd --add-port=9345/tcp --permanent
sudo firewall-cmd --add-port=10250/tcp --permanent
sudo firewall-cmd --add-port=8472/udp --permanent
sudo firewall-cmd --reload

# Check MTU mismatches on the management path and overlay interfaces
ip link show | grep mtu
```

---

### Issue 7: Longhorn Fails to Start

**Symptoms:**
- Storage not available
- PVCs stuck in Pending
- Longhorn pods in CrashLoopBackOff

**Troubleshooting:**

```bash
# Check Longhorn pod status
kubectl get pods -n longhorn-system

# Check Longhorn logs
kubectl logs -n longhorn-system \
    $(kubectl get pods -n longhorn-system -l app=longhorn-manager -o name | head -1)

# Common issue: iscsid not running
sudo systemctl status iscsid
sudo systemctl enable --now iscsid

# Check if open-iscsi is installed
rpm -q open-iscsi

# Check disk availability for Longhorn
lsblk
df -h

# Verify Longhorn nodes see the disks
kubectl get nodes.longhorn.io -n longhorn-system -o yaml | \
    grep -A 10 "diskStatus"
```

## General Debugging Commands

```bash
# Generate the official Harvester troubleshooting bundle
sudo supportconfig -k -c

# If Kubernetes is already reachable, capture recent cluster events too
sudo kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml \
    get events -A --sort-by=.metadata.creationTimestamp
```

## Conclusion

Harvester installation issues typically fall into a few categories: hardware compatibility, network misconfiguration, or Kubernetes bootstrap failures. The key to efficient troubleshooting is accessing the system console early, checking system logs, and verifying each layer - hardware → OS → network → Kubernetes → Harvester components. Most issues are solvable with the right log access and targeted fixes. When in doubt, the Harvester community forums and GitHub issues are excellent resources with solutions from users who have encountered similar problems.
