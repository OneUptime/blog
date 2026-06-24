# How to Use Match Sections to Target Specific Interfaces in systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: systemd-networkd, Match Section, Interface Selection, Linux, .network, .link, Networking

Description: Learn how to use [Match] sections in systemd-networkd .network and .link files to precisely target specific network interfaces using name, MAC address, driver, and other properties.

---

The `[Match]` section determines which interfaces a `.network` or `.link` file applies to. In `.network` files, match interface names with `Name=`. In `.link` files, use `OriginalName=` because matching happens before any userspace rename. Precise matching prevents configurations from applying to unintended interfaces.

## Match by Interface Name

```ini
# /etc/systemd/network/eth0.network

[Match]
Name=eth0          # Exact name match

# Wildcard
[Match]
Name=eth*          # Match eth0, eth1, eth2...

# Multiple names
[Match]
Name=eth0 eth1     # Match eth0 or eth1

# .link files use OriginalName=
[Match]
OriginalName=eth0  # Exact original interface name match
```

## Match by MAC Address

```ini
[Match]
MACAddress=aa:bb:cc:dd:ee:01   # Exact MAC match

# Useful for servers where interface names may vary
```

## Match by Driver

```ini
[Match]
Driver=virtio_net   # All virtio network interfaces (VMs)

[Match]
Driver=igb          # All Intel igb NIC interfaces
```

## Match by PCI Path

```ini
[Match]
Path=pci-0000:02:00.0   # Specific PCI slot

# Find path: udevadm info /sys/class/net/eth0 | grep ID_PATH
```

## Match by Interface Type

```ini
[Match]
Type=ether          # All Ethernet interfaces

[Match]
Type=wlan           # All wireless interfaces

[Match]
Kind=vlan           # All VLAN interfaces

[Match]
Kind=bond           # All bond interfaces

# Type examples: ether, wlan, loopback, wwan, ...
# Kind examples: vlan, bond, bridge, tun, dummy, ...
```

## Match by Virtualization

```ini
[Match]
Virtualization=vm   # Only match inside a VM
# Virtualization=container  # Only in containers
# Virtualization=no         # Only on bare metal
```

## Match by Host

```ini
[Match]
Host=webserver-01   # Only on this specific hostname
```

## Combining Match Criteria (AND logic)

```ini
# All criteria must match (logical AND)
[Match]
Name=eth*
Driver=igb
MACAddress=aa:bb:cc:dd:ee:ff
```

## Match Precedence

```text
Files are processed in lexicographic order (10- before 20- before 99-)
More specific files should have lower numbers to be processed first
The FIRST matching file wins (for both .link and .network files)
Drop-in .d/*.conf files are merged into the matched main file
```

## Example: Different Config for Physical vs. Virtual

```ini
# /etc/systemd/network/10-vm.network - VMs (virtio)
[Match]
Driver=virtio_net
Virtualization=vm

[Network]
DHCP=yes

# /etc/systemd/network/20-physical.network - Physical servers
[Match]
Type=ether
Virtualization=no

[Network]
Address=10.0.0.5/24
Gateway=10.0.0.1
```

## Checking Which File Matched

```bash
# Show which .link and .network files are applied to an interface
networkctl status eth0 | grep -E "Link File|Network File"
# Link File: /etc/systemd/network/10-eth0.link
# Network File: /etc/systemd/network/20-eth0.network

# Debug .link matching without applying changes
sudo SYSTEMD_LOG_LEVEL=debug udevadm test-builtin net_setup_link /sys/class/net/eth0
```

## Key Takeaways

- `[Match]` sections use AND logic: all specified criteria must match.
- Use `Name=` in `.network` files, `OriginalName=` in `.link` files, and `MACAddress=` for hardware-specific configs.
- Files are processed lexicographically; lower-numbered files take precedence, and the first matching `.network` or `.link` file wins.
- Use `networkctl status <iface>` to confirm which `.network` and `.link` files were applied to an interface.
