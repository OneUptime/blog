# How to Install and Configure Open VM Tools on RHEL in VMware

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VMware, Open VM Tools, Virtualization, Linux

Description: Install and configure Open VM Tools on RHEL virtual machines in VMware to enable host-guest communication, time synchronization, and improved VM management.

---

Open VM Tools is the open source implementation of VMware Tools for Linux guests. Red Hat recommends using the `open-vm-tools` package from the RHEL repositories instead of the proprietary VMware Tools bundle. It provides host-guest communication, graceful shutdown support, time sync, and more.

## Install Open VM Tools

```bash
# Install the base package for server VMs
sudo dnf install -y open-vm-tools

# For VMs with a graphical desktop, also install the desktop package
sudo dnf install -y open-vm-tools-desktop
```

## Enable and Start the Service

```bash
# Enable vmtoolsd to start at boot
sudo systemctl enable vmtoolsd

# Start the service immediately
sudo systemctl start vmtoolsd

# Check the status
sudo systemctl status vmtoolsd
```

## Verify Open VM Tools is Running

```bash
# Check the installed version
vmware-toolbox-cmd --version

# Display VM information visible to vSphere
vmware-toolbox-cmd stat speed
vmware-toolbox-cmd stat hosttime

# List available commands
vmware-toolbox-cmd help
```

## Features Provided by Open VM Tools

### Graceful Guest Shutdown

vSphere can send shutdown commands to the guest OS:

```bash
# This works automatically once vmtoolsd is running
# In vSphere: Right-click VM > Power > Shut Down Guest OS
```

### File and Clipboard Sharing (Desktop Only)

```bash
# With open-vm-tools-desktop installed, shared folders and
# clipboard copy/paste between host and guest are available
# Configure shared folders in the VM settings in vSphere
```

### Guest Customization

Open VM Tools supports vSphere guest customization, which allows automatic configuration of hostname, network settings, and more during VM deployment from templates.

```bash
# Verify that the customization support is working
vmware-toolbox-cmd config get deployPkg enable-custom-scripts
```

## Configure Time Synchronization

```bash
# By default, vmtoolsd syncs guest time with the ESXi host
# To check the current time sync status
vmware-toolbox-cmd timesync status

# Enable time synchronization
vmware-toolbox-cmd timesync enable

# If you prefer to use NTP/chrony instead of VMware time sync
vmware-toolbox-cmd timesync disable

# Then configure chrony
sudo dnf install -y chrony
sudo systemctl enable --now chronyd
```

## Update Open VM Tools

```bash
# Open VM Tools is updated through the standard RHEL repos
sudo dnf update -y open-vm-tools

# Restart the service after updating
sudo systemctl restart vmtoolsd
```

## Troubleshooting

```bash
# Check vmtoolsd logs
sudo journalctl -u vmtoolsd -f

# Verify the kernel modules are loaded
lsmod | grep -i vmw

# If vSphere shows "VMware Tools: Not running"
# restart the service and check for errors
sudo systemctl restart vmtoolsd
sudo systemctl status vmtoolsd
```

Open VM Tools is the supported and recommended way to integrate RHEL guests with VMware vSphere infrastructure.
