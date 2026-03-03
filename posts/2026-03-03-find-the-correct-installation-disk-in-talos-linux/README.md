# How to Find the Correct Installation Disk in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Installation, Disk Selection, Hardware, Kubernetes Setup

Description: Learn how to identify and select the correct installation disk for Talos Linux using talosctl commands, disk selectors, and hardware inspection techniques.

---

Picking the right disk for your Talos Linux installation might sound simple, but it is a step where things can go wrong if you are not careful. Servers often have multiple disks, and device names can vary between hardware platforms, virtualization technologies, and even between reboots. This guide walks you through the process of finding and confirming the correct installation disk before you commit to a Talos deployment.

## Why Disk Selection Matters

Talos Linux writes its partitions to the installation disk during setup. This includes the boot partition, the STATE partition (which holds your machine configuration), and the EPHEMERAL partition (which holds Kubernetes data). Choosing the wrong disk can mean overwriting data on a disk you intended to use for storage, or installing on a slow disk when a faster option is available.

Getting this right the first time saves you from having to wipe and reinstall, which is especially important in production environments.

## Step 1: Boot into Maintenance Mode

When a Talos node boots without a machine configuration, it enters maintenance mode. In this state, you can connect to the node using `talosctl` with the `--insecure` flag and inspect the hardware.

If you are PXE booting or booting from an ISO, the node will enter maintenance mode automatically after the initial boot completes.

```bash
# Connect to a node in maintenance mode
# Replace with the actual IP of your node
talosctl get disks --nodes 192.168.1.10 --insecure
```

## Step 2: List Available Disks

The `talosctl get disks` command shows all block devices detected by the kernel:

```bash
# List all detected disks
talosctl get disks --nodes 192.168.1.10 --insecure

# Example output:
# NODE          NAMESPACE   TYPE   ID         VERSION   SIZE       MODEL              SERIAL
# 192.168.1.10  runtime     Disk   sda        1         480 GB     INTEL SSDSC2KB48   PHYG0123456
# 192.168.1.10  runtime     Disk   sdb        1         4.0 TB     HGST HUS726T4TA    V0HK1234
# 192.168.1.10  runtime     Disk   nvme0n1    1         1.0 TB     Samsung 980 PRO    S5GYNG0R123456
# 192.168.1.10  runtime     Disk   nvme1n1    1         1.0 TB     Samsung 980 PRO    S5GYNG0R789012
```

This gives you the device ID, size, model name, and serial number for each disk. Use this information to identify which disk you want to install Talos on.

## Step 3: Get Detailed Disk Information

For more detail about each disk, including partition information and bus path, you can request YAML output:

```bash
# Get detailed information about a specific disk
talosctl get disks --nodes 192.168.1.10 --insecure -o yaml

# This provides additional fields like:
# - busPath: the physical path to the disk on the bus
# - wwid: World Wide Identifier
# - subsystem: how the disk is connected (scsi, nvme, etc.)
# - rotational: whether the disk is an HDD (true) or SSD (false)
```

The `rotational` field is particularly useful for distinguishing between HDDs and SSDs. If you want Talos on the fastest disk, look for `rotational: false`.

## Step 4: Choose Your Installation Disk

Based on the information gathered, decide which disk to use. Here are some guidelines:

**For control plane nodes**, choose a fast, reliable disk. NVMe or SSD is preferred because etcd (which runs on control plane nodes) is sensitive to disk latency. A slow disk can lead to etcd performance issues and even leadership election failures.

**For worker nodes**, the system disk does not need to be as fast since most of the IO will be on the EPHEMERAL partition where pods run. However, using an SSD is still recommended for overall responsiveness.

**For multi-disk nodes**, consider using the smaller, faster disk for Talos and the larger disk(s) for Kubernetes persistent storage or a distributed storage system like Ceph.

## Specifying the Disk in Machine Configuration

Once you have identified the correct disk, specify it in the machine configuration:

### Using Device Path

```yaml
# Simple device path
machine:
  install:
    disk: /dev/nvme0n1
    image: ghcr.io/siderolabs/installer:v1.7.0
```

### Using Stable Identifiers

Device paths like `/dev/sda` can change between reboots, especially on systems with multiple disk controllers. Using stable identifiers prevents this issue:

```yaml
# Using disk-by-id path
machine:
  install:
    disk: /dev/disk/by-id/nvme-Samsung_SSD_980_PRO_S5GYNG0R123456
```

You can find the stable identifiers by looking at the disk's serial number or WWID from the `talosctl get disks` output.

### Using Disk Selectors

Disk selectors match disks based on properties rather than specific device paths. This is the most flexible and reliable approach:

```yaml
# Select the first SSD with at least 100GB
machine:
  install:
    diskSelector:
      size: '>= 100GB'
      type: ssd

# Select by model pattern
machine:
  install:
    diskSelector:
      model: Samsung*

# Select by serial number
machine:
  install:
    diskSelector:
      serial: S5GYNG0R123456

# Select the smallest available disk
machine:
  install:
    diskSelector:
      size: '>= 50GB'
      match: smallest
```

Disk selectors are especially valuable for automated, large-scale deployments where you cannot manually specify the device path for each node.

## Handling Multiple Disks

When a node has multiple disks, you need to decide which one gets Talos and what to do with the rest.

```yaml
# Install Talos on the NVMe drive
machine:
  install:
    disk: /dev/nvme0n1
  # Configure additional disks for storage
  disks:
    - device: /dev/sda
      partitions:
        - mountpoint: /var/mnt/data
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/backup
```

Make sure the additional disks in the `machine.disks` section do not overlap with the installation disk. Talos will partition the installation disk automatically and will separately handle any additional disks you configure.

## Verifying After Installation

After installing Talos and applying the machine configuration, verify that the installation landed on the correct disk:

```bash
# Check mounted partitions
talosctl get mounts --nodes 192.168.1.10

# Verify the system disk
talosctl get systemdisk --nodes 192.168.1.10

# Check disk usage
talosctl get disks --nodes 192.168.1.10
```

The mounts output will show you which device is used for each Talos partition. Confirm that the partitions are on the disk you intended.

## Common Pitfalls

**USB drives appearing as /dev/sda** - If you boot from a USB drive (like a Talos ISO on a USB stick), the USB drive might take the `/dev/sda` device name, pushing your actual system disk to `/dev/sdb`. Always check with `talosctl get disks` before committing.

**RAID controllers hiding individual disks** - If your server has a hardware RAID controller, you might see only the RAID logical volume (like `/dev/sda`) rather than the individual physical disks. This is expected behavior. Install Talos on the RAID volume.

**Cloud instances with ephemeral root disks** - In some cloud environments, the root disk is ephemeral and gets wiped on reboot. Make sure you are installing on a persistent disk. Check your cloud provider's documentation for which disk types are persistent.

**Disk names changing after hardware changes** - Adding or removing disks from a server can shift device names. If you add a new disk that gets assigned `/dev/sda`, your previous `/dev/sda` might become `/dev/sdb`. Disk selectors or stable identifiers prevent this problem.

## Automating Disk Discovery

For large deployments, you can automate disk discovery as part of your provisioning pipeline:

```bash
#!/bin/bash
# Script to discover the best installation disk on a new node

NODE_IP=$1

# Get disk information in JSON format
DISKS=$(talosctl get disks --nodes "$NODE_IP" --insecure -o json)

# Find the first SSD that is at least 50GB
# (In practice, you would parse the JSON output)
echo "Available disks on $NODE_IP:"
talosctl get disks --nodes "$NODE_IP" --insecure

echo ""
echo "Recommended: Use disk selectors in your machine config"
echo "Example:"
echo "  diskSelector:"
echo "    size: '>= 50GB'"
echo "    type: ssd"
```

## Disk Selection Best Practices

1. Always inspect available disks before applying a configuration to a new node
2. Use disk selectors instead of hardcoded paths for automated deployments
3. Use stable identifiers (by-id, by-path) when you must use specific device paths
4. Choose SSDs or NVMe for control plane nodes where etcd performance matters
5. Document your disk layout decisions for each hardware configuration in your fleet
6. Test your disk selection on a single node before rolling out to the whole fleet

## Conclusion

Finding the correct installation disk for Talos Linux is a matter of inspecting available hardware, understanding your naming conventions, and using the right specification method in your machine configuration. Whether you use simple device paths, stable identifiers, or disk selectors, the key is verifying your choice before installation. Taking a few minutes to confirm the right disk saves you from the hassle of reinstalling or recovering from an overwritten disk.
