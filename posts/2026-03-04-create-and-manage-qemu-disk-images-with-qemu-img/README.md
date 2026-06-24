# How to Create and Manage QEMU Disk Images with qemu-img on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, QEMU, Virtualization, Linux

Description: Learn how to create and Manage QEMU Disk Images with qemu-img on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to create and manage QEMU disk images with qemu-img on RHEL. Following these steps will help you create, inspect, resize, and convert virtual disk images safely.

## Prerequisites

- RHEL with a minimal or standard installation and enabled package repositories
- Root or sudo access
- Enough free storage for the disk images you plan to create

## Overview

Managing QEMU disk images with qemu-img requires careful planning and execution. The `qemu-img` utility creates, converts, checks, and resizes disk images while they are offline.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install the package that provides the `qemu-img` utility:

```bash
sudo dnf install -y qemu-img
```

## Step 2: Install Required Packages

```bash
qemu-img --version
```

Verify the installation:

```bash
rpm -qf "$(command -v qemu-img)"
```

## Step 3: Create a Disk Image

Create a directory for disk images:

```bash
mkdir -p ~/disk-images
```

Create a 20 GiB QCOW2 disk image:

```bash
qemu-img create -f qcow2 ~/disk-images/example.qcow2 20G
```

QCOW2 is commonly used with RHEL virtualization because it supports features such as compression and snapshots. Raw images are simpler and can provide better performance, but they have fewer image-level features.

## Step 4: Inspect the Disk Image

```bash
qemu-img info ~/disk-images/example.qcow2
```

Review the file format, virtual size, disk size, and format-specific information before attaching the image to a virtual machine.

## Step 5: Verify the Configuration

Check the image for consistency:

```bash
qemu-img check ~/disk-images/example.qcow2
```

If the image is attached to a virtual machine, shut down the virtual machine before checking, resizing, or converting the image. Modifying an image that is in use can corrupt the disk.

To attempt a repair after taking a backup, use:

```bash
qemu-img check -r all ~/disk-images/example.qcow2
```

## Step 6: Resize or Convert Disk Images

To increase the virtual size of a QCOW2 image by 10 GiB:

```bash
cp ~/disk-images/example.qcow2 ~/disk-images/example-backup.qcow2
qemu-img resize ~/disk-images/example.qcow2 +10G
```

After growing a disk image, resize the partitions, physical volumes, and file systems inside the guest operating system so the guest can use the new space.

To convert a raw disk image to QCOW2:

```bash
qemu-img convert -f raw ~/disk-images/original.img -O qcow2 ~/disk-images/converted.qcow2
qemu-img info ~/disk-images/converted.qcow2
```

## Step 7: Performance Tuning

Choose the disk format and allocation settings based on your workload. For example, you can preallocate metadata for a QCOW2 image when creating it:

```bash
qemu-img create -f qcow2 -o preallocation=metadata ~/disk-images/preallocated.qcow2 20G
```

Use `qemu-img info` to compare the virtual size and actual disk usage of images.

## Security Considerations

- Do not use `qemu-img` to modify disk images that are in use by a running virtual machine
- Keep backup copies before resizing, repairing, or converting important disk images
- Store disk images with restrictive file permissions
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
2. **Image is in use**: Shut down any virtual machine that uses the disk before running `qemu-img check`, `qemu-img resize`, or `qemu-img convert`
3. **Guest does not show new space after resize**: Resize the guest partitions, physical volumes, and file systems after growing the disk image

## Conclusion

You have successfully created and managed QEMU disk images with qemu-img on RHEL. Keep images backed up, avoid modifying disks that are in use, and check image details with `qemu-img info` before attaching them to virtual machines.
