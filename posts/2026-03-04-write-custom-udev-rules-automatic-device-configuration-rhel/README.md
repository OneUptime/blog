# How to Write Custom udev Rules for Automatic Device Configuration on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Udev, Device Management, Automation, Hardware, Linux

Description: Write custom udev rules on RHEL to automatically configure devices when they are connected, including setting permissions, running scripts, and creating persistent device names.

---

udev is the device manager for the Linux kernel. It manages device nodes in `/dev` and handles all user-space actions when devices are added or removed. Custom udev rules let you automate tasks like setting permissions, renaming devices, or running scripts when specific hardware is connected.

## Understanding udev Rules

udev rules are stored in `/etc/udev/rules.d/` (local rules) and `/usr/lib/udev/rules.d/` (system defaults). Rules in `/etc/udev/rules.d/` override system defaults. Rules are processed in lexical order by filename.

## Find Device Attributes

Before writing a rule, identify the device attributes to match against.

```bash
# List all device attributes for a specific device
# Replace /dev/sdb with your device
udevadm info --attribute-walk --name=/dev/sdb

# For USB devices, find the vendor and product ID
lsusb
# Example output: Bus 002 Device 003: ID 0781:5583 SanDisk Corp.

# Get detailed udev info for a device path
udevadm info --query=all --name=/dev/sdb
```

## Example 1: Set Permissions on a USB Device

```bash
# Create a rule file
sudo tee /etc/udev/rules.d/99-usb-permissions.rules > /dev/null << 'EOF'
# Set permissions for a specific USB serial adapter
# Match by vendor ID (0403) and product ID (6001) for FTDI USB-Serial
SUBSYSTEM=="usb", ATTR{idVendor}=="0403", ATTR{idProduct}=="6001", MODE="0666", GROUP="dialout"
EOF
```

## Example 2: Create a Symlink for a USB Drive

```bash
# Create a persistent name for a specific USB drive
sudo tee /etc/udev/rules.d/99-usb-drive.rules > /dev/null << 'EOF'
# Create /dev/backup-drive symlink when this specific USB drive is connected
# Match by serial number for uniqueness
SUBSYSTEM=="block", ATTRS{serial}=="AA00000000000489", SYMLINK+="backup-drive"
EOF
```

## Example 3: Run a Script When a Device is Connected

```bash
# Create the script first
sudo tee /usr/local/bin/usb-backup.sh > /dev/null << 'SCRIPT'
#!/bin/bash
# Automatically mount and sync when backup drive is connected
mount /dev/backup-drive /mnt/backup
rsync -a /home/ /mnt/backup/home-backup/
SCRIPT
sudo chmod +x /usr/local/bin/usb-backup.sh

# Create the udev rule to trigger the script
sudo tee /etc/udev/rules.d/99-auto-backup.rules > /dev/null << 'EOF'
# Run backup script when the specific USB drive is connected
ACTION=="add", SUBSYSTEM=="block", ATTRS{serial}=="AA00000000000489", RUN+="/usr/local/bin/usb-backup.sh"
EOF
```

## Example 4: Rename a Network Interface

```bash
# Give a consistent name to a network adapter by MAC address
sudo tee /etc/udev/rules.d/70-custom-net.rules > /dev/null << 'EOF'
# Rename the interface with this MAC address to "lan0"
SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="aa:bb:cc:dd:ee:ff", NAME="lan0"
EOF
```

## Reload and Test Rules

```bash
# Reload udev rules without rebooting
sudo udevadm control --reload-rules

# Trigger rules for existing devices
sudo udevadm trigger

# Test a rule against a specific device (dry run)
sudo udevadm test /sys/class/block/sdb

# Monitor udev events in real-time (plug/unplug devices to see events)
sudo udevadm monitor --property
```

## Rule Syntax Reference

```bash
# Matching keys (use == for comparison):
# SUBSYSTEM, KERNEL, ATTR{}, ATTRS{}, ACTION, ENV{}

# Assignment keys (use = or +=):
# NAME, SYMLINK, MODE, OWNER, GROUP, RUN, ENV{}

# Common actions:
# ACTION=="add"     - device connected
# ACTION=="remove"  - device disconnected
```

Custom udev rules give you precise control over how RHEL handles hardware events, enabling automated workflows for device management.
