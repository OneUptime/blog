# How to Set Up USB Device Access Control on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, USB, USBGuard, Device Control

Description: Learn how to control USB device access on Ubuntu using USBGuard, udev rules, and kernel module configuration to prevent unauthorized devices from connecting.

---

USB devices represent a significant security risk in server and workstation environments. Malicious USB devices - from keyloggers to BadUSB-style attacks - can execute code, exfiltrate data, or install malware just by being plugged in. On servers that should never have USB storage attached, having no controls means anyone with physical access can plug in a drive and copy gigabytes of data undetected.

Ubuntu provides several mechanisms to control USB access: `USBGuard` for policy-based device authorization, `udev` rules for flexible device handling, and kernel module blacklisting for completely disabling USB storage at the kernel level. The right tool depends on your security requirements.

## Option 1: Blocking USB Storage with Kernel Module Blacklisting

The most aggressive approach is blacklisting the USB storage kernel module entirely. When `usb-storage` isn't loaded, USB drives simply don't mount - the kernel doesn't know how to talk to them.

```bash
# Check if usb-storage is currently loaded
lsmod | grep usb_storage

# Blacklist the module permanently
echo "blacklist usb-storage" | sudo tee /etc/modprobe.d/blacklist-usb-storage.conf

# Update initramfs to apply early
sudo update-initramfs -u
```

After rebooting, USB storage devices will be completely ignored. Other USB devices (keyboards, mice, network adapters) still work normally since they use different kernel modules.

To verify:

```bash
# After reboot, confirm module is not loaded
lsmod | grep usb_storage
# Should return nothing
```

To re-enable USB storage temporarily without rebooting:

```bash
sudo modprobe usb-storage
```

## Option 2: USBGuard for Policy-Based Authorization

`USBGuard` takes a more sophisticated approach. It intercepts USB device events and applies an allow/deny policy. By default, any device not explicitly allowed is blocked. You can create detailed policies that allow specific devices by vendor ID, product ID, or serial number.

### Installing USBGuard

```bash
# Install USBGuard
sudo apt update
sudo apt install -y usbguard usbguard-applet-qt

# Check the service status
sudo systemctl status usbguard
```

### Generating an Initial Policy

The safest way to start is to generate a policy based on currently connected devices - that way your keyboard and mouse don't get blocked:

```bash
# Generate policy from currently connected USB devices
sudo usbguard generate-policy | sudo tee /etc/usbguard/rules.conf

# Review the generated policy
sudo cat /etc/usbguard/rules.conf
```

The output looks something like this:

```text
allow id 1d6b:0002 serial "" name "xHCI Host Controller" hash "..." parent-hash "..."
allow id 046d:c52b serial "" name "USB Receiver" hash "..." parent-hash "..."
allow id 0951:1666 serial "xxxx" name "DataTraveler 3.0" hash "..." parent-hash "..."
```

### Enabling Strict Mode

Before starting USBGuard in enforcing mode, review the policy to make sure it includes your keyboard, mouse, and any essential USB devices. Remove any USB storage entries if you want to block drives:

```bash
# Edit the policy to remove unwanted devices
sudo nano /etc/usbguard/rules.conf

# Change the default policy in the main config
sudo nano /etc/usbguard/usbguard-daemon.conf
```

Key settings in `usbguard-daemon.conf`:

```ini
# Block any device not matching a rule
ImplicitPolicyTarget=block

# Apply rules immediately when device connects
PresentControllerPolicy=apply-policy

# Where the rules file lives
RuleFile=/etc/usbguard/rules.conf

# Allow users in the 'wheel' group to interact with USBGuard
IPCAllowedUsers=root
IPCAllowedGroups=sudo
```

### Starting USBGuard

```bash
# Enable and start the USBGuard daemon
sudo systemctl enable usbguard
sudo systemctl start usbguard

# Check it's running
sudo systemctl status usbguard
```

### Managing Devices with usbguard-cli

Once USBGuard is running, use `usbguard` commands to manage devices:

```bash
# List currently connected USB devices and their status
sudo usbguard list-devices

# List only blocked devices
sudo usbguard list-devices -b

# Allow a specific device (use the device number from list-devices)
sudo usbguard allow-device 5

# Block a device
sudo usbguard block-device 5

# Allow a device and add a permanent rule
sudo usbguard allow-device -p 5
```

### Writing Custom Rules

USBGuard rules follow a specific syntax. Some examples:

```bash
# Allow a specific USB keyboard by vendor:product
allow id 046d:c52b name "USB Keyboard"

# Allow a specific USB drive by serial number only
allow id 0951:1666 serial "001CC0EC3A28E761F1050036"

# Block all USB mass storage devices
block with-interface equals { 08:*:* }

# Allow USB hubs but block storage
allow with-interface equals { 09:*:* }
block with-interface equals { 08:06:50 }
```

The `with-interface` condition matches based on USB interface class codes:
- `08:*:*` - Mass Storage class
- `09:*:*` - Hub class
- `03:*:*` - Human Interface Device (keyboard, mouse)
- `02:*:*` - Communications (network adapters)

## Option 3: udev Rules for Flexible Handling

`udev` rules run when the kernel detects a new device. You can use them to automatically handle USB devices - mounting, logging, or disabling specific device types.

### Logging All USB Connections

Create a udev rule that logs every USB device connection:

```bash
sudo nano /etc/udev/rules.d/99-usb-audit.rules
```

```text
# Log all USB device connections to syslog
SUBSYSTEM=="usb", ACTION=="add", RUN+="/usr/bin/logger -t usb-audit 'USB CONNECTED: ID=%s{idVendor}:%s{idProduct} Name=%s{manufacturer}:%s{product} Serial=%s{serial}'"
SUBSYSTEM=="usb", ACTION=="remove", RUN+="/usr/bin/logger -t usb-audit 'USB REMOVED: ID=%s{idVendor}:%s{idProduct}'"
```

```bash
# Reload udev rules
sudo udevadm control --reload-rules
```

Now every USB connection/disconnection is logged to syslog:

```bash
# View USB audit log
sudo grep "usb-audit" /var/log/syslog
```

### Blocking Specific USB Storage Devices

To prevent specific USB storage from automounting via udev:

```bash
sudo nano /etc/udev/rules.d/99-block-usb-storage.rules
```

```text
# Block USB mass storage devices from being accessed
SUBSYSTEM=="block", SUBSYSTEMS=="usb", ACTION=="add", RUN+="/bin/sh -c 'echo 0 > /sys/bus/usb/devices/%k/authorized'"
```

### Allowing Only Specific Devices by Vendor ID

Create an allowlist of known USB devices:

```bash
sudo nano /etc/udev/rules.d/99-usb-allowlist.rules
```

```text
# Allow only known USB devices by vendor:product ID
# Logitech USB Receiver
SUBSYSTEM=="usb", ATTR{idVendor}=="046d", ATTR{idProduct}=="c52b", ACTION=="add", ENV{AUTHORIZED}="1"

# Dell keyboard
SUBSYSTEM=="usb", ATTR{idVendor}=="413c", ATTR{idProduct}=="2113", ACTION=="add", ENV{AUTHORIZED}="1"

# Block everything else that's USB storage
SUBSYSTEM=="usb", ACTION=="add", ATTR{bInterfaceClass}=="08", ENV{AUTHORIZED}!="1", RUN+="/bin/sh -c 'echo 0 > /sys/bus/usb/devices/%k/authorized'"
```

## Finding Device Vendor and Product IDs

To build an allowlist, you need the IDs for your known good devices:

```bash
# List currently connected USB devices with IDs
lsusb

# Detailed information about a specific device
lsusb -v -d 046d:c52b

# Check udev device properties for a connected device
udevadm info -a -n /dev/sdb  # for a USB drive at /dev/sdb
```

Sample `lsusb` output:
```text
Bus 001 Device 003: ID 046d:c52b Logitech, Inc. Nano Receiver
Bus 002 Device 002: ID 0951:1666 Kingston Technology DataTraveler 3.0
```

The format is `idVendor:idProduct`.

## Monitoring USB Events in Real Time

Watch USB events as they happen:

```bash
# Monitor udev events (plug in a device to see it)
sudo udevadm monitor --subsystem-match=usb

# Or monitor kernel events
dmesg -w | grep -i usb
```

## Combining Approaches

For a high-security server:

1. Use kernel module blacklisting to prevent USB storage globally
2. Deploy USBGuard to control all USB device authorization
3. Add udev rules for audit logging

This layered approach means an attacker would need to overcome multiple independent controls. The kernel-level block stops drivers from loading, USBGuard blocks device authorization at the USB subsystem level, and the audit logs give you forensic visibility.

A reasonable configuration for most servers: blacklist `usb-storage` to prevent data exfiltration via USB drives, while leaving USBGuard to manage the remaining policy for other device types. Check the logs regularly for unexpected USB events.
