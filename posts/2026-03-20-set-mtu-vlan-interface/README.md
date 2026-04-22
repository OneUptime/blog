# How to Set the MTU on a VLAN Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MTU, VLAN, Linux, 802.1Q, Ip link, Networking, Jumbo Frame

Description: Learn how to set the MTU on a Linux VLAN interface, including the relationship between parent interface MTU and VLAN MTU, and how to configure jumbo frames for storage and high-performance networks.

---

The MTU (Maximum Transmission Unit) of a VLAN interface cannot exceed the MTU of its parent physical interface. For jumbo frames, you must raise both.

## Setting MTU on a VLAN Interface

```bash
# Set MTU on a standard VLAN interface

ip link set eth0.100 mtu 1500

# For jumbo frames on a VLAN:
# 1. First raise the parent interface MTU
ip link set eth0 mtu 9000

# 2. Then set the VLAN interface MTU
ip link set eth0.100 mtu 9000

# Verify
ip link show eth0
ip link show eth0.100
```

## Creating a VLAN Interface with MTU

```bash
# Create VLAN interface and immediately set MTU
ip link set eth0 mtu 9000
ip link add link eth0 name eth0.100 type vlan id 100
ip link set eth0.100 mtu 9000
ip link set eth0.100 up

# Assign IP
ip addr add 192.168.100.1/24 dev eth0.100
```

## Persistent MTU with systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Link]
MTUBytes=9000

[Network]
VLAN=eth0.100
LinkLocalAddressing=no
# No IP on parent interface
```

```ini
# /etc/systemd/network/20-eth0.100.netdev
[NetDev]
Name=eth0.100
Kind=vlan

[VLAN]
Id=100
```

```ini
# /etc/systemd/network/20-eth0.100.network
[Match]
Name=eth0.100

[Link]
MTUBytes=9000

[Network]
Address=192.168.100.1/24
```

## Persistent MTU with /etc/network/interfaces (Debian)

```bash
# /etc/network/interfaces
auto eth0
iface eth0 inet manual
  mtu 9000

auto eth0.100
iface eth0.100 inet static
  address 192.168.100.1/24
  vlan-raw-device eth0
  mtu 9000
```

## Verifying Effective MTU

```bash
# Show MTU on all interfaces
ip link show | grep mtu

# Test actual effective MTU with ping (no fragmentation)
ping -M do -s 8972 192.168.100.2   # 8972 + 28 header = 9000
# Success means jumbo frames are working end to end
```

## Common MTU Values

| Use Case | MTU |
|----------|-----|
| Standard Ethernet | 1500 |
| PPPoE | 1492 |
| VXLAN overlay | 1450 (1500 - 50 overhead) |
| Jumbo frames (iSCSI/NFS) | 9000 |
| InfiniBand (rare) | 65520 |

## Key Takeaways

- The VLAN interface MTU cannot exceed the parent interface MTU; raise both together.
- For jumbo frames, set the parent interface to 9000 and the VLAN interface to 9000.
- In systemd-networkd, set `MTUBytes` in the `[Link]` section of both the parent and VLAN network files.
- Test end-to-end jumbo frames with `ping -M do -s 8972` - even one hop without jumbo frame support causes failures.
