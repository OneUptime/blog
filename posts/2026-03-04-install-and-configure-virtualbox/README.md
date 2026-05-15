# How to Install and Configure VirtualBox on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VirtualBox, Virtualization, Linux

Description: Learn how to install and Configure VirtualBox on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure VirtualBox on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- Hardware virtualization enabled in the system firmware

## Overview

Installing and configuring VirtualBox on RHEL requires the Oracle VirtualBox repository, build tools, and kernel development packages so the VirtualBox kernel modules can be built for the running kernel. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

If the update installs a new kernel, reboot before continuing so the running kernel matches the kernel development package you install.

Install any required dependencies:

```bash
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y dnf-plugins-core gcc make perl kernel-devel-$(uname -r) kernel-headers elfutils-libelf-devel
```

## Step 2: Install Required Packages

Add the Oracle VirtualBox repository and install VirtualBox:

```bash
sudo dnf config-manager --add-repo https://download.virtualbox.org/virtualbox/rpm/rhel/virtualbox.repo
sudo rpm --import https://www.virtualbox.org/download/oracle_vbox_2016.asc
sudo dnf install -y VirtualBox-7.2
```

Verify the installation:

```bash
rpm -qi VirtualBox-7.2
VBoxManage --version
```

## Step 3: Configure Kernel Modules

Build and load the VirtualBox kernel modules if the installer did not load them automatically:

```bash
sudo /sbin/rcvboxdrv setup
lsmod | grep vbox
```

If the module build fails, check `/var/log/vbox-install.log` and confirm the installed `kernel-devel` package matches the running kernel from `uname -r`.

## Step 4: Configure User Access

```bash
sudo usermod -aG vboxusers "$USER"
newgrp vboxusers
id "$USER"
```

Members of the `vboxusers` group can access VirtualBox features such as USB device passthrough.

## Step 5: Verify the Configuration

Test the setup:

```bash
VBoxManage list hostinfo
VBoxManage list bridgedifs
```

Check the logs for any errors:

```bash
journalctl -k | grep -i vbox
```

## Step 6: Configure Firewall Rules

VirtualBox does not require opening a host firewall service for basic NAT networking. If you configure bridged networking, allow only the ports required by the guest services you expose:

```bash
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor host resources and adjust CPU, memory, and storage settings for each virtual machine based on your workload:

```bash
VBoxManage list runningvms
top -p $(pidof VirtualBoxVM)
```

## Security Considerations

- Run VirtualBox as a normal user instead of root
- Keep guest additions and extension packs aligned with the installed VirtualBox version
- Restrict bridged or host-only guest services with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Kernel driver not installed**: Run `sudo /sbin/rcvboxdrv setup` and review `/var/log/vbox-install.log`
2. **Permission denied for USB devices**: Confirm the user is in the `vboxusers` group with `id`
3. **Bridged networking problems**: Use `VBoxManage list bridgedifs` to confirm VirtualBox can see the host network interfaces

## Conclusion

You have successfully installed and configured VirtualBox on RHEL. Monitor the host regularly and keep VirtualBox updated to maintain security and performance.
