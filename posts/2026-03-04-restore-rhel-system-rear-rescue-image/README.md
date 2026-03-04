# How to Restore a RHEL System from a ReaR Rescue Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ReaR, Disaster Recovery, Restoration, System Recovery, Linux

Description: Walk through the full process of restoring a RHEL system from a ReaR rescue image, from booting the ISO to verifying the recovered system.

---

When a RHEL system suffers a catastrophic failure, the ReaR (Relax-and-Recover) rescue image allows you to restore it to its pre-failure state. This guide walks through the complete restoration process.

## Prerequisites

You need:
- The ReaR rescue ISO created with `rear mkbackup`
- The backup archive (stored on NFS, CIFS, or local media)
- Access to the server console (physical, iLO, iDRAC, or virtual)

## Step 1: Boot from the ReaR Rescue ISO

Attach the ISO to the server and boot from it:

```bash
# For virtual machines, mount the ISO in the hypervisor
# For physical servers, write the ISO to a USB drive
sudo dd if=/var/lib/rear/output/rear-$(hostname).iso of=/dev/sdc bs=4M status=progress
```

Boot the server and select "Recover" from the ReaR boot menu.

## Step 2: Log In to the Rescue System

The rescue system drops you into a root shell. Verify network connectivity:

```bash
# Check that networking is active
ip addr show

# If network is not configured, set it up manually
ip addr add 10.0.1.100/24 dev eth0
ip link set eth0 up
ip route add default via 10.0.1.1
```

## Step 3: Run the Recovery

Start the automated recovery process:

```bash
# Run rear recover to restore the system
rear recover
```

ReaR will:
1. Recreate the original disk layout (partitions, LVM, filesystems)
2. Mount the backup source (NFS, CIFS, or local)
3. Extract the backup archive to the recreated filesystems
4. Reinstall the bootloader (GRUB2)
5. Restore SELinux contexts

## Step 4: Handle Disk Layout Changes

If the replacement disk is a different size, ReaR may prompt you to edit the layout:

```bash
# ReaR will show a mapping dialog if disks differ
# You can manually edit the disk layout file
vi /var/lib/rear/layout/disklayout.conf

# Example: change disk size references
# Original: /dev/sda 500107862016
# New:      /dev/sda 1000204886016
```

## Step 5: Verify the Restored System

After recovery completes, verify before rebooting:

```bash
# Chroot into the restored system
chroot /mnt/local

# Check that critical files exist
cat /etc/hostname
cat /etc/fstab

# Verify the bootloader
grub2-install --recheck /dev/sda

# Exit chroot
exit
```

## Step 6: Reboot

```bash
# Reboot into the restored system
reboot
```

After booting, verify services are running:

```bash
# Check system status
systemctl is-system-running

# Verify critical services
systemctl status sshd
systemctl status firewalld

# Check filesystem mounts
df -h
```

The system should be fully operational in the same state as when the last ReaR backup was created.
