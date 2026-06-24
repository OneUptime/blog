# How to Create a .link File for Interface Renaming in systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: systemd-networkd, .link file, Interface Renaming, Udev, Linux, Predictable Names, Networking

Description: Learn how to create systemd-networkd .link files to rename network interfaces from predictable names (like ens3) to custom names (like eth0 or wan0) based on MAC address or other properties.

---

`.link` files in `/etc/systemd/network/` control interface renaming and link parameters. They are processed by `udev` during device enumeration.

## Why Rename Interfaces

- Consistent naming across machines (for example, always `lan0` for the same role)
- Meaningful names for clarity (`wan0`, `lan0`, `mgmt0`)
- Legacy application compatibility that expects traditional interface names

## Basic Interface Renaming by MAC Address

```ini
# /etc/systemd/network/10-rename-lan0.link

[Match]
MACAddress=aa:bb:cc:dd:ee:01

[Link]
Name=lan0
```

```bash
# Reload udev configuration
udevadm control --reload

# Re-apply the .link file to the current interface, or reboot
ip link set ens3 down
udevadm trigger --verbose --settle --action add /sys/class/net/ens3

# Verify after re-triggering or rebooting
ip link show lan0
```

## Renaming by PCI Bus Path

```ini
# /etc/systemd/network/10-wan.link
[Match]
# Match the ID_PATH value from: udevadm info --query=property /sys/class/net/ens3
Path=pci-0000:02:00.0*

[Link]
Name=wan0
```

## Finding Interface Properties for Matching

```bash
# Find MAC address
ip link show ens3 | grep "link/ether"

# Find ID_PATH and current predictable names
udevadm info --query=property /sys/class/net/ens3 | grep -E '^ID_(PATH|NET_NAME)'

# Find driver
ethtool -i ens3 | grep '^driver:'
```

## Setting Link Parameters in .link Files

```ini
# /etc/systemd/network/10-lan0.link
[Match]
MACAddress=aa:bb:cc:dd:ee:01

[Link]
Name=lan0

# Additional link settings:
MTUBytes=9000
WakeOnLan=magic

# Disable autonegotiation when forcing speed and duplex
BitsPerSecond=1G
Duplex=full
AutoNegotiation=no
```

## Disabling Predictable Interface Names

To keep kernel-assigned names via a `.link` file:

```ini
# /etc/systemd/network/10-kernel-names.link
[Match]
OriginalName=*

[Link]
NamePolicy=
```

Or via kernel parameter (Debian/Ubuntu GRUB example):
```bash
# /etc/default/grub
GRUB_CMDLINE_LINUX="net.ifnames=0"
update-grub

# Reboot for the kernel parameter to take effect
```

## Verifying .link File Processing

```bash
# Check which .link file matched an interface
udevadm test-builtin net_setup_link /sys/class/net/ens3

# View udev events for network interfaces
udevadm monitor --udev --property --subsystem-match=net
```

## Key Takeaways

- `.link` files in `/etc/systemd/network/` rename interfaces at udev time, before network configuration.
- Match by `MACAddress` for hardware-specific renaming; use `Path` for PCI-location-based naming.
- The `Name=` directive in the `[Link]` section sets the new interface name.
- Changes take effect on reboot, hotplug, or after re-triggering the interface with `udevadm trigger`.
