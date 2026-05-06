# How to Configure a Default Gateway on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Linux, IPv4, Gateway

Description: Learn how to configure a default gateway on Linux temporarily and persistently using ip route, Netplan, NetworkManager, and systemd-networkd.

## What Is a Default Gateway?

The default gateway is the router your host sends packets to when no more specific route matches the destination. It is the gateway of last resort, represented as `0.0.0.0/0` in the routing table.

## Viewing the Current Default Gateway

```bash
# Show default route

ip route show default

# Or
ip route | grep default

# Sample output:
# default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.10 metric 100
```

## Adding a Default Gateway Temporarily

```bash
# Add default gateway (lost at reboot)
ip route add default via 192.168.1.1

# Add via specific interface
ip route add default via 192.168.1.1 dev eth0

# If a default route already exists, replace it
ip route replace default via 192.168.1.1
```

## Removing a Default Gateway

```bash
ip route del default

# Or delete specific gateway
ip route del default via 192.168.1.1
```

## Configuring Default Gateway Persistently

### Ubuntu/Debian with Netplan

```yaml
# /etc/netplan/01-network-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.10/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
```

```bash
sudo netplan apply
```

### RHEL/CentOS with NetworkManager

```bash
# Method 1: nmcli
nmcli connection modify eth0 ipv4.addresses 192.168.1.10/24
nmcli connection modify eth0 ipv4.gateway 192.168.1.1
nmcli connection modify eth0 ipv4.method manual
nmcli connection up eth0

# Verify
nmcli connection show eth0 | grep gateway
```

Or, on systems still using legacy ifcfg profiles, edit the ifcfg file:

```bash
# /etc/sysconfig/network-scripts/ifcfg-eth0
DEVICE=eth0
BOOTPROTO=none
IPADDR=192.168.1.10
PREFIX=24
GATEWAY=192.168.1.1
ONBOOT=yes
```

### systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=192.168.1.10/24
Gateway=192.168.1.1
DNS=8.8.8.8
```

```bash
systemctl restart systemd-networkd
```

### Debian (legacy /etc/network/interfaces)

```text
# /etc/network/interfaces
auto eth0
iface eth0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
```

```bash
ifdown eth0 && ifup eth0
```

## Multiple Default Gateways (Multi-Homed)

For hosts with multiple uplinks, use metrics to prefer one gateway:

```bash
# Primary gateway (lower metric = preferred)
ip route add default via 192.168.1.1 metric 100

# Secondary gateway (higher metric)
ip route add default via 192.168.2.1 metric 200
```

The lower-metric route is preferred while both routes are present.

## Testing Default Gateway Connectivity

```bash
# Ping the gateway
ping -c 3 192.168.1.1

# Test internet access through gateway
traceroute 8.8.8.8

# Verify which gateway is being used
ip route get 8.8.8.8
```

## Key Takeaways

- `ip route add default via GATEWAY` adds a temporary default route.
- Persist with Netplan (`routes: to: default via:`), nmcli, or systemd-networkd.
- Multiple default gateways are resolved by metric (lower = preferred).
- By default, the gateway must be reachable on a directly connected network.

**Related Reading:**

- [How to Add a Static Route on Linux](https://oneuptime.com/blog/post/2026-03-20-add-static-route-linux/view)
- [How to View the Routing Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-routing-table-linux/view)
- [How to Understand How IPv4 Routing Decisions Are Made](https://oneuptime.com/blog/post/2026-03-20-ipv4-routing-decisions/view)
