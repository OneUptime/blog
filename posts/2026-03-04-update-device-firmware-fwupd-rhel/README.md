# How to Update Device Firmware Using fwupd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Fwupd, Firmware, Hardware, Security, Linux

Description: Use fwupd on RHEL to check for and apply firmware updates to supported hardware devices, including UEFI, SSDs, and peripherals.

---

fwupd is a daemon and command-line tool that manages firmware updates for hardware devices on Linux. It connects to the Linux Vendor Firmware Service (LVFS) to download and apply updates for UEFI firmware, storage controllers, network adapters, and other devices.

## Install fwupd

```bash
# Install fwupd (often pre-installed on RHEL)

sudo dnf install -y fwupd

# Start the service if it is not already running
sudo systemctl start fwupd
```

## Check for Available Firmware Updates

```bash
# Refresh the firmware metadata from LVFS
sudo fwupdmgr refresh

# List devices that fwupd can manage
sudo fwupdmgr get-devices

# Check for available updates
sudo fwupdmgr get-updates
```

## View Device Details

```bash
# Get detailed information about all managed devices
sudo fwupdmgr get-devices --show-all

# Each device entry shows:
# - Device name and ID
# - Current firmware version
# - Vendor
# - Update capabilities (updatable, needs-reboot, etc.)
```

## Apply Firmware Updates

```bash
# Update all devices with available firmware updates
sudo fwupdmgr update

# Update a specific device by device ID
sudo fwupdmgr update <device-id>

# Some updates require a reboot to apply
# The update is staged and applied during the next boot
sudo reboot
```

## Check Update History

```bash
# View the history of firmware updates
sudo fwupdmgr get-history

# This shows:
# - Which devices were updated
# - Previous and new firmware versions
# - Whether the update succeeded or failed
```

## UEFI Firmware Updates

UEFI/BIOS updates are one of the most common use cases for fwupd.

```bash
# Check if your system's UEFI firmware is managed by fwupd
sudo fwupdmgr get-devices | grep -A5 "UEFI"

# The UEFI capsule update is applied during the next reboot
# Make sure the EFI System Partition is mounted
mount | grep efi

# If not mounted, mount it
sudo mount /boot/efi
```

## Downgrade Firmware (If Needed)

```bash
# List available firmware versions for a device
sudo fwupdmgr get-releases <device-id>

# Downgrade to an older available version
sudo fwupdmgr downgrade <device-id>

# Or install a specific local firmware cabinet file
sudo fwupdmgr local-install <firmware-file.cab>
```

## Security Attributes

fwupd can also check firmware security settings.

```bash
# View the Host Security ID (HSI) score
sudo fwupdmgr security

# This checks:
# - Secure Boot status
# - TPM version
# - Intel BootGuard
# - AMD PSP settings
# - SPI write protection
```

## Configure Metadata Refresh

```bash
# fwupd uses a systemd timer for periodic metadata refresh
sudo systemctl enable --now fwupd-refresh.timer
sudo systemctl status fwupd-refresh.timer
```

## Troubleshooting

```bash
# Check fwupd logs
sudo journalctl -u fwupd -f

# Run fwupd in verbose mode
sudo fwupdmgr get-devices -v

# If a device is not listed, it may not be supported by LVFS
# Check device support at: https://fwupd.org/lvfs/devices/
```

fwupd provides a standardized way to keep hardware firmware up to date on RHEL, closing security gaps that cannot be addressed by software updates alone.
