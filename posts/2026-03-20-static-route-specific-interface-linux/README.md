# How to Add a Static Route Through a Specific Interface on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Static Routes, Interface, Linux, Ip route, IPv4, Networking, Multi-homing

Description: Learn how to add a static route through a specific network interface on Linux using the dev parameter, and when interface-bound routes are necessary for correct routing behavior.

---

By default, Linux selects routes from its routing policy and routing tables, usually using the longest matching destination prefix and route metrics. You can force traffic through a specific interface by adding the `dev` parameter to static routes.

## Adding a Route Through a Specific Interface

```bash
# Route to 10.20.0.0/24 via gateway 10.10.0.1 on eth1

ip route add 10.20.0.0/24 via 10.10.0.1 dev eth1

# Route without a gateway (directly connected network on eth1)
ip route add 192.168.99.0/24 dev eth1

# Route with both gateway and interface (most explicit)
ip route add 172.16.0.0/12 via 172.16.1.1 dev eth0
```

## Why Specify the Interface?

```bash
# Problem: Two interfaces on the same /24 subnet (rare but possible)
# eth0: 10.0.0.5/24 (ISP1 LAN)
# eth1: 10.0.0.6/24 (ISP2 LAN, same subnet range)
# Use policy routing so traffic sourced from eth1 uses eth1:

ip route add 10.0.0.0/24 dev eth1 table 200
ip rule add pref 1000 from 10.0.0.6/32 table 200

# More common: default routes on multi-homed hosts
ip route add default via 192.168.1.1 dev eth0  # ISP1 default
```

## Interface-Bound Route for VPN

```bash
# Route VPN subnet through tun0 (no gateway needed for tunnel)
ip route add 10.8.0.0/24 dev tun0

# Route all traffic through a point-to-point VPN
# Keep a separate route to the VPN server outside the tunnel
ip route add default dev tun0
```

## Verifying the Interface Route

```bash
# Verify route shows correct interface
ip route show | grep eth1

# Use ip route get to confirm
ip route get 10.20.0.5
# 10.20.0.5 via 10.10.0.1 dev eth1 src 10.10.0.100

# Check which interface the traffic leaves on
traceroute -i eth1 10.20.0.5
```

## Persistent Route with systemd-networkd

```ini
# /etc/systemd/network/eth1.network
[Match]
Name=eth1

[Network]
Address=10.10.0.100/24

[Route]
Destination=172.16.0.0/12
Gateway=10.10.0.1
# The route is automatically associated with eth1
```

## Persistent Route with /etc/network/interfaces (Debian)

```bash
# /etc/network/interfaces
auto eth1
iface eth1 inet static
  address 10.10.0.100
  netmask 255.255.255.0
  up ip route add 172.16.0.0/12 via 10.10.0.1 dev eth1
  down ip route del 172.16.0.0/12 via 10.10.0.1 dev eth1
```

## Persistent Route with nmcli (RHEL)

```bash
# Add route tied to eth1 connection
nmcli connection modify eth1 \
  +ipv4.routes "172.16.0.0/12 10.10.0.1"
nmcli connection up eth1
```

## Key Takeaways

- Add `dev <interface>` to an `ip route add` command to explicitly bind the route to an interface.
- Interface-bound routes are useful for multi-homed hosts where the kernel might choose the wrong interface.
- For point-to-point tunnel interfaces (tun0, gre1), specify `dev` without a gateway since the tunnel is the directly connected next hop.
- In systemd-networkd, routes defined in an interface's `.network` file are automatically bound to that interface.
