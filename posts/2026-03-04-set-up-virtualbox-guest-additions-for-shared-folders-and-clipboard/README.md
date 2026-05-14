# How to Set Up VirtualBox Guest Additions on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VirtualBox, Virtualization, Linux

Description: Learn how to set Up VirtualBox Guest Additions for Shared Folders and Clipboard on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Set Up VirtualBox Guest Additions for Shared Folders and Clipboard on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A RHEL virtual machine running in Oracle VM VirtualBox
- Access to the VirtualBox host to insert the Guest Additions ISO and configure shared folders or clipboard settings

## Overview

Set Up VirtualBox Guest Additions for Shared Folders and Clipboard requires installing the Guest Additions inside the RHEL guest, then enabling the VirtualBox features on the VM. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf group install -y "Development Tools"
sudo dnf install -y kernel-devel kernel-headers elfutils-libelf-devel perl
```

## Step 2: Install Required Packages

From the VirtualBox window for the running RHEL VM, select **Devices > Insert Guest Additions CD Image**. If the CD image is not mounted automatically, create a mount point and mount it:

```bash
sudo mkdir -p /mnt/cdrom
sudo mount /dev/cdrom /mnt/cdrom
```

Run the Linux Guest Additions installer from the mounted ISO:

```bash
cd /mnt/cdrom
sudo sh ./VBoxLinuxAdditions.run
```

Reboot the guest after the installer completes:

```bash
sudo reboot
```

## Step 3: Configure the Shared Folder

Create a shared folder from the VirtualBox Manager with **Settings > Shared Folders**, or from the host command line. Replace `RHEL-VM` with the VM name and `/home/user/rhel-share` with the host folder path:

```bash
VBoxManage sharedfolder add "RHEL-VM" --name "rhelshare" --hostpath "/home/user/rhel-share" --automount
```

For Linux guests, automatically mounted shared folders are available to `root` and members of the `vboxsf` group. Add your RHEL user to that group:

```bash
sudo usermod -aG vboxsf "$USER"
```

Log out and back in, or reboot, so the new group membership applies.

## Step 4: Enable Shared Clipboard

From the VirtualBox VM window, select **Devices > Shared Clipboard > Bidirectional**. You can also set it from the host command line while the VM is running:

```bash
VBoxManage controlvm "RHEL-VM" clipboard mode bidirectional
```

If the VM is powered off, you can make the same setting persistent with:

```bash
VBoxManage modifyvm "RHEL-VM" --clipboard-mode=bidirectional
```

## Step 5: Verify the Configuration

Check that the Guest Additions kernel modules are loaded:

```bash
lsmod | grep -E 'vboxguest|vboxsf|vboxvideo'
```

Verify that the shared folder is mounted. With automatic mounting, Linux guests commonly mount the folder under `/media` with an `sf_` prefix:

```bash
findmnt -t vboxsf
ls /media/sf_rhelshare
```

You can also mount the share manually if needed:

```bash
sudo mkdir -p /mnt/rhelshare
sudo mount -t vboxsf rhelshare /mnt/rhelshare
```

## Step 6: Configure Firewall Rules

VirtualBox shared folders and the shared clipboard do not require opening guest firewall ports because they are provided by Guest Additions integration, not by a network service in RHEL.

## Step 7: Performance Tuning

For best results, keep the Guest Additions version aligned with the VirtualBox version installed on the host. After upgrading VirtualBox on the host, reinstall or update Guest Additions in the RHEL guest.

## Security Considerations

- Enable bidirectional clipboard only when you need it
- Share only the host folders that the guest needs
- Use read-only shared folders when the guest does not need write access
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Guest Additions installer fails**: Make sure the running kernel has matching development packages installed, then reboot into the updated kernel and rerun the installer
2. **Permission denied on shared folders**: Verify that your user is a member of the `vboxsf` group with `id`
3. **Shared clipboard does not work**: Confirm Guest Additions are installed and the VM's Shared Clipboard mode is set to `Bidirectional`

## Conclusion

You have successfully configured set up virtualbox guest additions for shared folders and clipboard on RHEL. Keep Guest Additions aligned with the VirtualBox host version and limit shared folders and clipboard access to what you need.
