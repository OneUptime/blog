# How to Set the MTU with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, systemd-networkd, Linux, .network, .link, Jumbo Frame, Networking

Description: Learn how to set the MTU on network interfaces using systemd-networkd, including setting it in .link files for early application and .network files for interface-specific configuration.

---

MTU can be set in systemd-networkd through either a `.link` file (applied at udev/driver time) or a `.network` file (applied when the interface is configured). The `.link` file approach is preferred as it applies earlier in the boot process.

## Setting MTU in a .link File (Recommended)

```ini
# /etc/systemd/network/10-eth0.link

[Match]
MACAddress=aa:bb:cc:dd:ee:01

[Link]
# Set MTU at link setup time (before IP assignment)
MTUBytes=9000
```

## Setting MTU in a .network File

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Link]
# Also works here, applied when networkd processes the interface
MTUBytes=9000

[Network]
Address=10.0.0.5/24
Gateway=10.0.0.1
```

## Setting MTU for VLAN Interfaces

```ini
# Parent interface must have MTU >= VLAN MTU
# /etc/systemd/network/10-eth0.link
[Match]
MACAddress=aa:bb:cc:dd:ee:01

[Link]
# Set parent to 9000
MTUBytes=9000

# /etc/systemd/network/20-eth0.10.network
[Match]
Name=eth0.10

[Link]
# VLAN inherits (but set explicitly to be safe)
MTUBytes=9000

[Network]
Address=192.168.10.1/24
```

## Setting MTU for Tunnel Interfaces

```ini
# /etc/systemd/network/gre1.network
[Match]
Name=gre1

[Link]
# 1500 - 24 (GRE overhead) = 1476
MTUBytes=1476

[Network]
Address=172.16.1.1/30
```

## Applying and Verifying

```bash
# For .link file changes: reload udev
udevadm control --reload
udevadm trigger --action=add /sys/class/net/eth0

# For .network file changes: reload networkd
networkctl reload

# Verify MTU
ip link show eth0 | grep mtu
# 2: eth0: <...> mtu 9000 ...

# Test MTU end-to-end (no fragmentation ping)
ping -M do -s 8972 10.0.0.1   # 8972 + 28 = 9000
```

## Finding Interface MAC for .link File

```bash
# Get MAC address for the .link file [Match] section
ip link show eth0 | grep "link/ether"
# link/ether aa:bb:cc:dd:ee:01 brd ff:ff:ff:ff:ff:ff
```

## MTU for bonded interfaces

```ini
# /etc/systemd/network/bond0.netdev
[NetDev]
Name=bond0
Kind=bond

[Bond]
Mode=active-backup
MIIMonitorSec=100ms
# Note: this example sets MTU in bond0.network, not in the [Bond] section

# /etc/systemd/network/bond0.network
[Match]
Name=bond0

[Link]
MTUBytes=9000
```

## Key Takeaways

- Prefer setting MTU in `.link` files (applied at udev time) for earlier and more reliable application.
- MTU can also be set in the `[Link]` section of `.network` files with `MTUBytes=`.
- For VLAN interfaces, set the parent interface MTU first; the VLAN cannot exceed the parent's MTU.
- Verify end-to-end MTU with `ping -M do -s <size>` to confirm jumbo frames work through the entire path.
