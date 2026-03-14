# How to Create systemd Device Units on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Udev, Hardware, Linux

Description: Understand and create systemd device units on Ubuntu to trigger services when specific hardware devices appear, combining udev rules with systemd service activation.

---

systemd device units represent hardware devices in the systemd dependency graph. When a device appears (or disappears), systemd can use that event as a dependency trigger for other units. This lets you start services automatically when specific hardware is plugged in, or prevent services from starting until required hardware is available.

Device units are unusual compared to other unit types because they are not created by writing unit files. Instead, udev creates them dynamically based on device properties, and you control their behavior by setting `SYSTEMD_WANTS` and similar tags in udev rules.

## How Device Units Work

When udev detects a device, it can set tags on that device. The `systemd` tag tells udev to expose the device as a systemd device unit. The unit name is derived from the device path, with `/` replaced by `-` and special characters escaped.

For example, the device `/dev/sda` becomes the unit `dev-sda.device`. The unit `/sys/bus/usb/devices/1-1` becomes a more complex name.

You can see device units in action:

```bash
# List active device units
systemctl list-units --type=device

# Show a specific device unit
systemctl status dev-sda.device

# Show all device units including inactive
systemctl list-units --type=device --all | head -30
```

## Reading Device Unit Properties

Device units expose properties from udev:

```bash
# Show device unit properties
systemctl show dev-sda.device

# Show specific properties
systemctl show dev-sda.device | grep -E "SysFSPath|Description|Wants"

# Inspect udev properties for a device
udevadm info /dev/sda

# Show the device's systemd-relevant properties
udevadm info --query=property /dev/sda | grep -E "SYSTEMD|DEVNAME|ID_"
```

## Using Devices as Service Dependencies

The most common use of device units is as dependencies. A service can declare it requires a specific device to be present before starting:

```bash
sudo nano /etc/systemd/system/serial-monitor.service
```

```ini
[Unit]
Description=Monitor serial device /dev/ttyUSB0
# This service only starts when the device exists
BindsTo=dev-ttyUSB0.device
After=dev-ttyUSB0.device

[Service]
Type=simple
ExecStart=/usr/local/bin/serial-monitor.py /dev/ttyUSB0
Restart=on-failure
RestartSec=5

[Install]
WantedBy=dev-ttyUSB0.device
```

The key directives:

- `BindsTo=dev-ttyUSB0.device`: If the device disappears, stop this service
- `After=dev-ttyUSB0.device`: Start only after the device is available
- `WantedBy=dev-ttyUSB0.device`: The device unit will pull in this service when it appears

```bash
sudo systemctl daemon-reload
sudo systemctl enable serial-monitor.service
```

Now when `/dev/ttyUSB0` appears, `serial-monitor.service` starts automatically. When the device is removed, the service stops.

## Triggering Services with udev Rules

For more complex device matching (specific USB vendor/product ID, storage devices, etc.), use udev rules to set the `SYSTEMD_WANTS` property:

```bash
# Find the vendor and product ID of a USB device
lsusb
# Example output: Bus 001 Device 003: ID 067b:2303 Prolific Technology, Inc. PL2303 Serial Port

# Get detailed device info
udevadm info -a /dev/ttyUSB0 | grep -E "ATTR|idVendor|idProduct" | head -20
```

Create a udev rule:

```bash
sudo nano /etc/udev/rules.d/80-serial-device.rules
```

```ini
# Rule for Prolific PL2303 USB serial adapter
# Match on vendor and product ID
ACTION=="add", \
SUBSYSTEM=="tty", \
ATTRS{idVendor}=="067b", \
ATTRS{idProduct}=="2303", \
TAG+="systemd", \
ENV{SYSTEMD_WANTS}="serial-monitor.service"
```

The `TAG+="systemd"` tells udev to expose this device to systemd, and `SYSTEMD_WANTS=` specifies which service to start.

Apply the rule:

```bash
# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Test the rule without a real device
udevadm test /sys/bus/usb/devices/1-1.2 2>&1 | grep -E "SYSTEMD|WANT"
```

## Setting a Custom Unit Name for a Device

The auto-generated device unit names are long and not human-readable. You can assign a custom alias:

```bash
sudo nano /etc/udev/rules.d/80-usb-serial.rules
```

```ini
# Assign a stable device name and expose to systemd
ACTION=="add", \
SUBSYSTEM=="tty", \
ATTRS{idVendor}=="067b", \
ATTRS{idProduct}=="2303", \
SYMLINK+="serial-adapter", \
TAG+="systemd", \
ENV{SYSTEMD_ALIAS}="/dev/serial-adapter"
```

The `SYSTEMD_ALIAS` creates an additional unit name `dev-serial\x2dadapter.device` that is easier to reference in unit files.

## Device Unit for Network Interfaces

Network interfaces can also be represented as device units:

```bash
# Check if a network interface has a device unit
systemctl status sys-subsystem-net-devices-enp3s0.device

# Create a service that depends on a specific interface
sudo nano /etc/systemd/system/vpn-route-setup.service
```

```ini
[Unit]
Description=Set up VPN routes after interface appears
BindsTo=sys-subsystem-net-devices-enp3s0.device
After=sys-subsystem-net-devices-enp3s0.device

[Service]
Type=oneshot
ExecStart=/usr/local/bin/setup-vpn-routes.sh
RemainAfterExit=yes
```

## Practical Example: USB Backup Drive

Automatically start a backup when a specific USB drive is plugged in:

```bash
# First, identify the drive's unique ID
udevadm info /dev/sdb | grep -E "ID_SERIAL|ID_FS_LABEL|ID_FS_UUID"
# Example: ID_FS_UUID=abc123-def456
```

Create the udev rule:

```bash
sudo nano /etc/udev/rules.d/85-backup-drive.rules
```

```ini
# When the backup drive appears, trigger backup service
ACTION=="add", \
SUBSYSTEM=="block", \
ENV{ID_FS_UUID}=="abc123-def456", \
TAG+="systemd", \
ENV{SYSTEMD_WANTS}="run-backup.service"
```

Create the backup service:

```bash
sudo nano /etc/systemd/system/run-backup.service
```

```ini
[Unit]
Description=Run backup to USB drive
After=media.mount

[Service]
Type=oneshot
User=backup-user
ExecStart=/usr/local/bin/run-backup.sh

# Don't restart - backup is a one-shot operation
Restart=no

# Notify when done
ExecStartPost=/usr/bin/notify-send "Backup complete"
```

```bash
sudo nano /usr/local/bin/run-backup.sh
```

```bash
#!/bin/bash
# Backup script triggered by USB drive insertion

SOURCE="/home"
DEST="/media/backup-drive"
LOG="/var/log/usb-backup.log"

echo "$(date): Starting backup" >> "$LOG"

# Mount the drive if not already mounted
if ! mountpoint -q "$DEST"; then
    mkdir -p "$DEST"
    mount UUID=abc123-def456 "$DEST" || {
        echo "$(date): Mount failed" >> "$LOG"
        exit 1
    }
fi

# Run the backup
rsync -av --delete "$SOURCE" "$DEST/home/" >> "$LOG" 2>&1

echo "$(date): Backup complete" >> "$LOG"
```

```bash
sudo chmod +x /usr/local/bin/run-backup.sh
sudo systemctl daemon-reload
sudo udevadm control --reload-rules
```

## Debugging Device Units

```bash
# Monitor udev events in real time
udevadm monitor --kernel --udev --property

# Simulate a device event to test rules
udevadm test $(udevadm info -q path /dev/sdb)

# Check what systemd knows about a device
systemctl show dev-sdb.device

# List all devices with SYSTEMD_WANTS set
udevadm info --export-db | grep -A 5 "SYSTEMD_WANTS"

# Watch systemd unit activation when a device appears
sudo journalctl -f -u 'run-backup.service'
```

## Converting fstab Entries

When systemd reads `/etc/fstab`, it automatically generates `.mount` and `.automount` units, which include device dependencies. You can see these generated units:

```bash
# List systemd-generated mount units from fstab
systemctl list-units --type=mount

# Show a specific generated unit
systemctl cat mnt-data.mount
```

## Common Patterns

**GPU acceleration service:** Start a compute service only when a specific GPU is present:

```ini
[Unit]
BindsTo=sys-bus-pci-devices-0000:01:00.0.device
After=sys-bus-pci-devices-0000:01:00.0.device
```

**Hardware health monitoring:** Start a fan controller service when the hardware monitoring chip is available:

```ini
[Unit]
After=dev-hwmon0.device
Wants=dev-hwmon0.device
```

## Troubleshooting

**Device unit not being created:** Check that the device has the `systemd` tag. Run `udevadm info /dev/device | grep TAGS` and verify `systemd` appears. If not, add `TAG+="systemd"` to your udev rule.

**Service starts too early (device not ready):** Add `After=dev-your-device.device` to ensure systemd waits for the device to be fully initialized by udev.

**Service does not stop when device is removed:** Use `BindsTo=` instead of `Requires=`. `BindsTo` propagates stop actions, while `Requires` only propagates start failures.

Device units bridge the hardware detection capabilities of udev with the service management capabilities of systemd, enabling clean, event-driven system administration without polling loops or custom daemons.
