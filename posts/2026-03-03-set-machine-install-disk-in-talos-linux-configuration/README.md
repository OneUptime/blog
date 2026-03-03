# How to Set Machine Install Disk in Talos Linux Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Configuration, Installation, Kubernetes, Infrastructure

Description: Learn how to properly set the machine install disk in Talos Linux for reliable installations across different hardware.

---

When you install Talos Linux on a machine, one of the first things the installer needs to know is which disk to write to. Get this wrong, and you might wipe a data drive or fail to boot entirely. Talos Linux handles disk selection through the machine configuration, and there are several ways to specify the target disk depending on your hardware and deployment scenario.

This post covers how to set the install disk in Talos Linux, the different ways to reference a disk, and how to handle common situations like machines with multiple drives.

## The Basics

The install disk is specified in the `machine.install.disk` field of your Talos machine configuration:

```yaml
# Basic install disk configuration
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
```

This tells Talos to install itself to `/dev/sda`. The installer will partition the disk, write the boot loader, and set up the system partitions. Everything on that disk will be overwritten.

## Disk Naming Conventions

Linux uses different naming schemes for different types of disks:

- `/dev/sda`, `/dev/sdb` - SCSI and SATA drives, including most SSDs connected via SATA
- `/dev/nvme0n1`, `/dev/nvme1n1` - NVMe drives
- `/dev/vda`, `/dev/vdb` - VirtIO drives (common in virtual machines)
- `/dev/xvda`, `/dev/xvdb` - Xen virtual drives (AWS EC2 instances)
- `/dev/mmcblk0` - eMMC storage (common in single-board computers)

The exact device name depends on your hardware and the order in which the kernel discovers the devices. This is where things can get tricky.

## The Problem with Device Names

Device names like `/dev/sda` are not guaranteed to be stable across reboots. If you add a new disk or change the BIOS boot order, what was `/dev/sda` might become `/dev/sdb`. This can cause installation failures or, worse, accidentally wiping the wrong disk.

For NVMe drives, the naming is typically more predictable because it is based on the physical slot, but it is still not guaranteed.

## Using Disk Selectors for Reliable Identification

Talos supports disk selectors that let you identify the install disk by its properties rather than its device name. This is the recommended approach for production deployments:

```yaml
# Use a disk selector instead of a device name
machine:
  install:
    diskSelector:
      size: '>= 100GB'
      type: ssd
    image: ghcr.io/siderolabs/installer:v1.6.0
```

The disk selector supports several criteria:

```yaml
machine:
  install:
    diskSelector:
      # Match by size (supports >=, <=, ==)
      size: '>= 100GB'

      # Match by type: hdd or ssd
      type: ssd

      # Match by model name (substring match)
      model: 'Samsung SSD 980'

      # Match by serial number (exact match)
      serial: 'S4EVNF0M8'

      # Match by bus path
      busPath: '/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0'
```

You can combine multiple criteria, and Talos will select the first disk that matches all of them.

## Finding Disk Information

Before setting the install disk, you need to know what disks are available on the machine. If Talos is already running in maintenance mode, you can query the disks:

```bash
# List all disks on the machine
talosctl disks --nodes 192.168.1.10
```

This command outputs a table showing each disk's device name, size, model, serial number, type (SSD or HDD), and bus path. Use this information to set your disk selector or device path.

If you are setting up a new machine and Talos is not running yet, you can boot from a Talos ISO in maintenance mode and then query the disks.

## Handling Multiple Disks

Many servers have multiple disks - an SSD for the OS and larger HDDs or additional SSDs for data. You need to make sure Talos installs to the right one.

A common pattern is to install Talos on the smallest SSD and leave the larger disks for persistent storage:

```yaml
# Install on the smallest SSD
machine:
  install:
    diskSelector:
      type: ssd
      size: '<= 256GB'
    image: ghcr.io/siderolabs/installer:v1.6.0
```

If you have two SSDs of the same size, use the model or serial number to distinguish them:

```yaml
# Install on a specific disk by serial
machine:
  install:
    diskSelector:
      serial: 'WD-WMC4N0K8J1P2'
    image: ghcr.io/siderolabs/installer:v1.6.0
```

## Virtual Machine Configurations

In virtual environments, disk naming is usually more predictable. Here are common configurations for popular platforms:

```yaml
# VMware (SCSI disk)
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
```

```yaml
# KVM/QEMU with VirtIO
machine:
  install:
    disk: /dev/vda
    image: ghcr.io/siderolabs/installer:v1.6.0
```

```yaml
# AWS EC2
machine:
  install:
    disk: /dev/xvda
    image: ghcr.io/siderolabs/installer:v1.6.0
```

For cloud providers, the disk name is usually consistent within the same instance type, so hardcoding the device name is acceptable.

## Wipe Mode

When Talos installs to a disk, it can either do a full wipe or a system-only wipe. The `wipe` option controls this:

```yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
    wipe: true
```

When `wipe` is set to `true`, Talos erases all partitions on the disk before installing. When set to `false` (the default for upgrades), it only overwrites the system partitions and leaves user data intact. For initial installations, the disk is always wiped regardless of this setting.

## Generating Configuration with the Install Disk

When you generate a Talos configuration, you can specify the install disk as a patch:

```bash
# Generate config with a specific install disk
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --install-disk /dev/nvme0n1

# Or use a patch for disk selector
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch '{"machine": {"install": {"diskSelector": {"type": "ssd", "size": ">= 100GB"}}}}'
```

## Changing the Install Disk After Initial Setup

If you need to change the install disk on a running node (for example, migrating from an HDD to an SSD), you can update the machine configuration:

```bash
# Update the install disk
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "replace", "path": "/machine/install/disk", "value": "/dev/nvme0n1"}]'

# Then upgrade to trigger the reinstall
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.6.0
```

Be very careful with this operation. If the node is a control plane member, make sure your etcd cluster has enough healthy members to tolerate losing one node during the migration.

## Best Practices

For production deployments, here are the recommendations:

Use disk selectors instead of device names whenever possible. Device names can change; disk properties like serial numbers and model names do not.

If you must use device names, verify them on each machine before applying the configuration. A quick `talosctl disks` check can save you from wiping the wrong drive.

For homogeneous hardware (all machines have the same disk layout), using a size-and-type selector works well. For heterogeneous hardware, use serial numbers or bus paths.

Document your disk layout for each machine type. When you are managing dozens or hundreds of nodes, knowing that "Dell R740 nodes use /dev/sda for the OS and /dev/sdb through /dev/sdd for storage" saves a lot of confusion.

Always double-check your install disk configuration before applying it to a new node. There is no undo button for formatting the wrong disk.

## Conclusion

Setting the install disk correctly is a foundational step in any Talos Linux deployment. Whether you use simple device names for virtual machines or disk selectors for bare-metal servers, the configuration is straightforward. Take the time to identify your disks properly, use selectors for reliability, and verify your configuration before applying it. A few minutes of careful setup here prevents a lot of pain down the road.
