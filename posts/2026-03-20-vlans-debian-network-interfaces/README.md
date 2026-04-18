# How to Configure VLANs on Debian Using /etc/network/interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, Debian, /etc/network/interfaces, 802.1Q, Vlan-raw-device, Linux, IPv4

Description: Learn how to configure 802.1Q VLAN interfaces on Debian Linux using /etc/network/interfaces, including tagged and untagged VLANs with static IP and DHCP assignment.

---

Debian uses the `vlan` package and `/etc/network/interfaces` to configure 802.1Q VLAN interfaces persistently.

## Prerequisites

```bash
# Install vlan package (provides vconfig and kernel module support)

apt install vlan -y

# Load 8021q module
modprobe 8021q
echo "8021q" >> /etc/modules
```

## Basic VLAN Interface Configuration

```bash
# /etc/network/interfaces

# Physical interface (no IP - acts as trunk port)
auto eth0
iface eth0 inet manual

# VLAN 10: Management
auto eth0.10
iface eth0.10 inet static
  address 10.10.0.1
  netmask 255.255.255.0
  gateway 10.10.0.254
  vlan-raw-device eth0

# VLAN 20: Servers (DHCP)
auto eth0.20
iface eth0.20 inet dhcp
  vlan-raw-device eth0

# VLAN 30: Storage (Jumbo frames)
auto eth0.30
iface eth0.30 inet static
  address 192.168.30.1
  netmask 255.255.255.0
  vlan-raw-device eth0
  mtu 9000
```

## Alternative Naming (dot notation vs. vlan prefix)

```bash
# Dot notation: eth0.10
# Preferred for readability

# Or numeric naming: vlan10 (less clear which parent)
# The VLAN ID (10) is derived from the numeric suffix of the interface name.
auto vlan10
iface vlan10 inet static
  address 10.10.0.1
  netmask 255.255.255.0
  vlan-raw-device eth0
```

## Applying Changes

```bash
# Bring up all configured interfaces
ifup eth0.10 eth0.20 eth0.30

# Or restart networking
systemctl restart networking

# Verify
ip addr show eth0.10
ip addr show eth0.20
```

## Adding Routes on VLAN Interfaces

```bash
# /etc/network/interfaces
auto eth0.10
iface eth0.10 inet static
  address 10.10.0.1
  netmask 255.255.255.0
  vlan-raw-device eth0
  up ip route add 10.20.0.0/24 via 10.10.0.254
  down ip route del 10.20.0.0/24
```

## Troubleshooting

```bash
# Check VLAN interface is up
ip -d link show eth0.10   # Shows VLAN id in output

# Check 8021q module is loaded
lsmod | grep 8021q

# Check /proc/net/vlan/
cat /proc/net/vlan/config
```

## Key Takeaways

- Install the `vlan` package and load `8021q` module before configuring VLAN interfaces on Debian.
- Use `vlan-raw-device` to specify which physical interface carries the tagged traffic.
- The physical parent interface should have no IP (`inet manual`) when used as a trunk.
- MTU on VLAN interfaces can be set independently but cannot exceed the parent's MTU.
