# How to Configure Persistent Device Naming with udev on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Udev, Device Naming, Persistent Naming, Storage, Linux

Description: Configure persistent device naming with udev on RHEL to ensure storage devices, network interfaces, and serial ports maintain consistent names across reboots.

---

Device names like `/dev/sda` or `/dev/sdb` can change between reboots depending on device detection order. Persistent naming ensures your scripts, mount points, and configurations always reference the correct device regardless of boot order.

## Understanding Persistent Naming Options

RHEL provides several persistent naming schemes:

```bash
# View all persistent name symlinks for a block device
ls -la /dev/disk/by-id/
ls -la /dev/disk/by-uuid/
ls -la /dev/disk/by-path/
ls -la /dev/disk/by-label/

# by-id:    Based on device serial number and manufacturer
# by-uuid:  Based on filesystem UUID
# by-path:  Based on the hardware path (PCI slot, etc.)
# by-label: Based on filesystem label
```

## Use UUID in /etc/fstab

The most common use of persistent naming is in fstab:

```bash
# Find the UUID of a filesystem
blkid /dev/sda1

# Use UUID in fstab instead of device names
# BAD:  /dev/sdb1  /data  xfs  defaults  0  0
# GOOD: UUID=a1b2c3d4-...  /data  xfs  defaults  0  0

# View current fstab
cat /etc/fstab
```

## Create Custom Symlinks with udev Rules

For devices that need a specific, human-readable name:

```bash
# Find the unique attributes of your device
udevadm info --attribute-walk --name=/dev/sdb

# Create a udev rule for a specific disk by serial number
sudo tee /etc/udev/rules.d/99-persistent-storage.rules > /dev/null << 'EOF'
# Create /dev/data-disk for the disk with serial number WD-WMAY12345
SUBSYSTEM=="block", ENV{ID_SERIAL_SHORT}=="WD-WMAY12345", SYMLINK+="data-disk"

# Create /dev/backup-disk for another specific disk
SUBSYSTEM=="block", ENV{ID_SERIAL_SHORT}=="ST500LM021", SYMLINK+="backup-disk"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Persistent Names for Network Interfaces

RHEL 8+ uses predictable network interface naming by default (e.g., `ens192`, `enp0s3`). To create custom names:

```bash
# Find the MAC address of the interface
ip link show

# Create a udev rule for a custom network interface name
sudo tee /etc/udev/rules.d/70-custom-ifnames.rules > /dev/null << 'EOF'
# Rename the interface with MAC aa:bb:cc:dd:ee:ff to "mgmt0"
SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="aa:bb:cc:dd:ee:ff", NAME="mgmt0"

# Rename another interface to "data0"
SUBSYSTEM=="net", ACTION=="add", ATTR{address}=="11:22:33:44:55:66", NAME="data0"
EOF
```

## Persistent Names for Serial Ports

```bash
# Find attributes of a USB serial adapter
udevadm info --attribute-walk /dev/ttyUSB0

# Create a persistent name for a USB-serial device
sudo tee /etc/udev/rules.d/99-serial-ports.rules > /dev/null << 'EOF'
# Always name this FTDI adapter /dev/console-port
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", ATTRS{serial}=="A50285BI", SYMLINK+="console-port"
EOF
```

## Verify Persistent Names

```bash
# After reloading rules and triggering
sudo udevadm control --reload-rules
sudo udevadm trigger

# Check that symlinks were created
ls -la /dev/data-disk
ls -la /dev/backup-disk
ls -la /dev/console-port

# Test the rule against a device
sudo udevadm test /sys/class/block/sdb
```

## Use Persistent Names in LVM

```bash
# LVM uses its own naming that is already persistent
lvs
# /dev/mapper/rhel-root is persistent and does not change

# For raw disks in LVM, use the /dev/disk/by-id path
sudo pvcreate /dev/disk/by-id/wwn-0x50014ee2b5e1c8a0
```

## Disable Predictable Network Names (Not Recommended)

```bash
# If you need the old eth0 naming scheme (not recommended)
sudo grubby --update-kernel=ALL --args="net.ifnames=0 biosdevname=0"
sudo reboot
```

Persistent device naming prevents configuration breakage caused by device enumeration order changes, making your RHEL system more reliable across reboots and hardware changes.
