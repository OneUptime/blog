# How to Add a Static Route for an IPv4 Subnet on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Routing, Static Routes, ip command, IPv4

Description: Add a static IPv4 route to the Linux routing table using ip route add, specify the nexthop gateway or interface, set metrics, and make the route persistent.

## Introduction

Static routes direct traffic for specific subnets through a designated gateway. They are used when automatic routing protocols are not in use, when you need to reach a remote network via a specific path, or when you want to override a dynamic route.

## Adding a Basic Static Route

```bash
# Route traffic to 10.10.0.0/16 via gateway 192.168.1.254

sudo ip route add 10.10.0.0/16 via 192.168.1.254

# Verify the route was added
ip route show 10.10.0.0/16
```

## Specifying the Exit Interface

```bash
# Route via both gateway and explicit interface (useful with multiple interfaces)
sudo ip route add 10.10.0.0/16 via 192.168.1.254 dev eth0
```

## Route via Interface Only (No Gateway)

For directly-attached networks or point-to-point links:

```bash
# Route to 172.16.5.0/24 directly via eth1 (no gateway needed)
sudo ip route add 172.16.5.0/24 dev eth1
```

## Setting Route Metric (Priority)

Lower metric = higher priority. Use metrics to prefer one route over another:

```bash
# Primary route via eth0, metric 100
sudo ip route add 10.10.0.0/16 via 192.168.1.254 dev eth0 metric 100

# Secondary route via eth1, metric 200 (preferred only if the lower-metric route is unavailable)
sudo ip route add 10.10.0.0/16 via 192.168.2.254 dev eth1 metric 200
```

## ECMP: Multiple Equal-Cost Paths

```bash
# Add two paths to 10.10.0.0/16 for load balancing
sudo ip route add 10.10.0.0/16 \
  nexthop via 192.168.1.254 dev eth0 weight 1 \
  nexthop via 192.168.2.254 dev eth1 weight 1
```

## Verify the Route

```bash
# Confirm the route is in the table
ip route show 10.10.0.0/16

# Show which route the kernel will use for this destination
ip route get 10.10.5.1
```

## Making the Route Persistent

Runtime routes added with `ip route add` are lost on reboot. Persist them with your distro's method:

**Netplan (Ubuntu):**

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      routes:
        - to: 10.10.0.0/16
          via: 192.168.1.254
          metric: 100
```

**Debian /etc/network/interfaces:**

```text
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    post-up ip route add 10.10.0.0/16 via 192.168.1.254
    pre-down ip route del 10.10.0.0/16 via 192.168.1.254
```

**NetworkManager:**

```bash
nmcli con mod "Wired connection 1" +ipv4.routes "10.10.0.0/16 192.168.1.254"
nmcli con up "Wired connection 1"
```

## Conclusion

`ip route add <network>/<prefix> via <gateway>` is the standard command for adding static routes. Always verify with `ip route get` to confirm the kernel will use the new route, and persist it through your distribution's configuration tool.
