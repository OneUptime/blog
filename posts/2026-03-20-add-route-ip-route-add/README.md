# How to Add a Route with ip route add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Routing, Linux, Networking, Ip-command, IPv4, Troubleshooting

Description: Add static IPv4 routes on Linux using the ip route add command to direct traffic through specific gateways or interfaces.

## Introduction

The `ip route add` command adds entries to the Linux kernel routing table. Static routes are essential when traffic to specific networks must go through a particular gateway - for example, reaching a remote office through a VPN gateway rather than the default internet router.

## Viewing the Routing Table

Before adding routes, examine the current routing table:

```bash
# Show routes from the main table (default)

ip route show

# Show routes for a specific table
ip route show table main
```

## Adding a Default Route

The default route sends all unmatched traffic to a gateway:

```bash
# Add a default route via 192.168.1.1
sudo ip route add default via 192.168.1.1

# Specify the output interface explicitly
sudo ip route add default via 192.168.1.1 dev eth0
```

## Adding a Static Route to a Specific Network

```bash
# Route 10.50.0.0/16 through a VPN gateway at 192.168.1.10
sudo ip route add 10.50.0.0/16 via 192.168.1.10

# Route traffic out a specific interface (for directly connected networks)
sudo ip route add 172.16.0.0/24 dev tun0
```

## Setting Route Metrics

When multiple routes exist to the same destination, the route with the lower metric is preferred:

```bash
# Primary route with lower metric (preferred)
sudo ip route add 10.0.0.0/8 via 192.168.1.1 metric 100

# Secondary route with higher metric (less preferred)
sudo ip route add 10.0.0.0/8 via 192.168.1.2 metric 200
```

## Adding a Host Route

A host route (/32) directs traffic to a specific IP:

```bash
# Force traffic to 8.8.8.8 through a specific gateway
sudo ip route add 8.8.8.8/32 via 10.0.0.1
```

## Blackhole and Unreachable Routes

Used to silently drop or reject traffic to a network:

```bash
# Silently drop packets destined for 192.0.2.0/24
sudo ip route add blackhole 192.0.2.0/24

# Generate an ICMP host unreachable response
sudo ip route add unreachable 198.51.100.0/24
```

## Verifying Routes

```bash
# Check which route would be used for a destination
ip route get 10.50.1.100

# Show routes with additional details
ip -d route show
```

## Making Routes Persistent

Routes added with `ip route add` are lost on reboot. To make them persistent:

- **Netplan** (Ubuntu): Add under `routes:` in the interface YAML
- **NetworkManager**: Use `nmcli` or connection files
- **Debian/ifupdown**: Add `post-up ip route add ...` in `/etc/network/interfaces`

## Conclusion

`ip route add` is a powerful and immediate way to manipulate Linux routing. Combine it with `ip route get` to verify routing decisions and always make important routes persistent through your distribution's network configuration system.
