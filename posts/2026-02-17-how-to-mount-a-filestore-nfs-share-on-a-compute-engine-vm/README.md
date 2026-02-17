# How to Mount a Filestore NFS Share on a Compute Engine VM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, NFS, Compute Engine, Storage

Description: Learn how to mount a Google Cloud Filestore NFS share on a Compute Engine VM with persistent mount configuration and proper permissions setup.

---

Once you have a Filestore instance running in Google Cloud, the next step is mounting it on your Compute Engine VMs so your applications can actually use it. NFS mounting is a standard Linux operation, but there are a few GCP-specific details that trip people up. In this guide, I will cover the basic mount process, how to make it persistent across reboots, setting up proper file permissions, and some performance tips.

## Prerequisites

Before you start, you need:

- A running Filestore instance in the same VPC as your VM
- A Compute Engine VM running a Linux distribution (Debian, Ubuntu, CentOS, or similar)
- SSH access to the VM
- The Filestore instance IP address and share name

Get the Filestore connection details if you do not have them handy:

```bash
# Get the IP address and share name of your Filestore instance
gcloud filestore instances describe my-filestore \
  --zone=us-central1-a \
  --format="value(networks[0].ipAddresses[0],fileShares[0].name)"
```

This returns something like `10.0.0.2 vol1`, where `10.0.0.2` is the IP and `vol1` is the share name.

## Step 1 - Install NFS Client Utilities

Most Linux distributions do not come with NFS client tools pre-installed. SSH into your VM and install them.

For Debian or Ubuntu:

```bash
# Install NFS client packages on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y nfs-common
```

For CentOS or RHEL:

```bash
# Install NFS client packages on CentOS/RHEL
sudo yum install -y nfs-utils
```

For SUSE:

```bash
# Install NFS client packages on SUSE
sudo zypper install -y nfs-client
```

## Step 2 - Create the Mount Point

Create a directory where the Filestore share will be mounted:

```bash
# Create the mount point directory
sudo mkdir -p /mnt/filestore
```

You can name this directory anything you want and place it anywhere in the filesystem. Common choices are `/mnt/filestore`, `/mnt/nfs`, or `/data`.

## Step 3 - Mount the Share

Mount the Filestore share using the standard NFS mount command:

```bash
# Mount the Filestore NFS share
# Replace the IP and share name with your actual values
sudo mount -t nfs 10.0.0.2:/vol1 /mnt/filestore
```

Verify the mount succeeded:

```bash
# Check that the mount is active
df -h /mnt/filestore

# List any existing files on the share
ls -la /mnt/filestore
```

The `df` output should show the Filestore share with its full capacity.

## Step 4 - Test Read and Write

Create a test file to confirm both reads and writes work:

```bash
# Write a test file to the share
echo "Hello from $(hostname)" | sudo tee /mnt/filestore/test.txt

# Read the test file back
cat /mnt/filestore/test.txt
```

If you have multiple VMs mounting the same share, you should see the test file from each VM visible to all others. That is the whole point of shared NFS storage.

## Step 5 - Make the Mount Persistent

The manual mount command does not survive a VM reboot. To make it persistent, add an entry to `/etc/fstab`:

```bash
# Add the Filestore mount to fstab for persistence across reboots
echo "10.0.0.2:/vol1 /mnt/filestore nfs defaults,_netdev 0 0" | sudo tee -a /etc/fstab
```

The `_netdev` option tells the system that this is a network filesystem and should not be mounted until the network is available. Without this, the boot process can hang if it tries to mount the NFS share before networking is up.

Verify the fstab entry works by unmounting and remounting:

```bash
# Unmount and remount using fstab to verify the configuration
sudo umount /mnt/filestore
sudo mount -a

# Verify it is mounted again
df -h /mnt/filestore
```

## Mount Options for Better Performance

The default mount options work fine for most cases, but you can tune them for better performance:

```bash
# Mount with optimized options for better throughput
sudo mount -t nfs -o rw,hard,nointr,rsize=1048576,wsize=1048576,timeo=600,retrans=2 \
  10.0.0.2:/vol1 /mnt/filestore
```

Here is what each option does:

- `rw` - Mount read-write (default)
- `hard` - If the NFS server becomes unreachable, keep retrying instead of returning errors
- `nointr` - Do not allow signal interrupts on hard mounts
- `rsize=1048576` - Read buffer size of 1MB for better throughput on large files
- `wsize=1048576` - Write buffer size of 1MB
- `timeo=600` - Timeout in tenths of a second (60 seconds) before retrying
- `retrans=2` - Number of retries before a hard mount reports an error to the application

The corresponding fstab entry would be:

```
10.0.0.2:/vol1 /mnt/filestore nfs rw,hard,nointr,rsize=1048576,wsize=1048576,timeo=600,retrans=2,_netdev 0 0
```

## Setting Up File Permissions

By default, the root user on any VM that mounts the share has full access. For production setups, you typically want specific users and groups to own the data.

```bash
# Create a shared group and user for application access
sudo groupadd -g 1500 appgroup
sudo useradd -u 1500 -g appgroup appuser

# Set ownership on the share
sudo chown appuser:appgroup /mnt/filestore

# Set permissions so group members can read and write
sudo chmod 2775 /mnt/filestore
```

The `2775` permission sets the setgid bit, which means new files created in the directory will inherit the group ownership. This is important for shared access across multiple VMs - make sure you create the same user and group with the same IDs on each VM.

## Mounting on Multiple VMs with a Startup Script

If you are creating multiple VMs that all need the same Filestore mount, use a startup script:

```bash
# Create a VM with a startup script that mounts Filestore automatically
gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --metadata=startup-script='#!/bin/bash
apt-get update && apt-get install -y nfs-common
mkdir -p /mnt/filestore
mount -t nfs 10.0.0.2:/vol1 /mnt/filestore
echo "10.0.0.2:/vol1 /mnt/filestore nfs defaults,_netdev 0 0" >> /etc/fstab'
```

This ensures every new VM gets the NFS share mounted automatically.

## Unmounting the Share

If you need to unmount the share, make sure no processes are using files on it first:

```bash
# Check if any processes are using the mount
sudo lsof +D /mnt/filestore

# Unmount the share
sudo umount /mnt/filestore
```

If the unmount hangs, you can force it:

```bash
# Force unmount if the regular unmount hangs
sudo umount -f /mnt/filestore
```

## Troubleshooting Common Issues

**Mount hangs or times out** - Check that the VM and Filestore instance are in the same VPC. Verify there are no firewall rules blocking NFS traffic (TCP port 2049).

**Permission denied** - The NFS client on the VM must have the proper UID/GID mapping. Check that the user running the application has access to the mount point.

**Stale file handle errors** - This usually happens after a Filestore instance is recreated with the same IP. Unmount and remount to clear the stale handle.

**Boot hangs** - If you added an fstab entry without `_netdev` and the Filestore instance is unreachable, the VM can hang during boot. Use the serial console to access the VM and fix the fstab entry.

Mounting Filestore on Compute Engine is a basic operation, but getting the details right - persistent mounts, proper permissions, and performance options - makes the difference between a reliable setup and one that breaks on the first reboot.
