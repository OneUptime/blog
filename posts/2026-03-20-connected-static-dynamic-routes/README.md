# How to Understand Connected, Static, and Dynamic Routes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, IPv4, Static Routes, Dynamic Routing, Linux

Description: Understand the three fundamental route types in IPv4 networking - connected, static, and dynamic - and when to use each one.

## Introduction

Every router builds a Routing Information Base (RIB) from three sources: routes it learned automatically because an interface is configured (connected), routes manually entered by an administrator (static), and routes learned from other routers through a protocol (dynamic). Understanding these types is foundational to any routing configuration.

## Connected Routes

A connected route is automatically installed when an IP address is assigned to an interface and the interface is up. No configuration is needed - the router simply knows it can reach that subnet directly.

```bash
# Assign an IP to an interface - a connected route is created automatically

ip addr add 192.168.10.1/24 dev eth0
ip link set eth0 up

# The connected route appears with proto kernel
ip route show
# Output: 192.168.10.0/24 dev eth0 proto kernel scope link src 192.168.10.1
```

Connected routes have an administrative distance of 0 - they are always preferred over any other route type for their prefix.

## Static Routes

Static routes are manually configured by an administrator. They are useful for small networks, stub networks, or when you need precise control over traffic flow.

```bash
# Add a static route to 10.20.0.0/24 via next-hop 192.168.10.254
ip route add 10.20.0.0/24 via 192.168.10.254

# Add a static default route (used when no specific match exists)
ip route add default via 192.168.10.1

# Make static routes persistent (Debian/Ubuntu with systemd-networkd)
# /etc/systemd/network/10-eth0.network
# [Route]
# Gateway=192.168.10.254
# Destination=10.20.0.0/24

# Verify
ip route show
```

Static routes added with `ip route` use a default metric of 0 on Linux — the kernel does not implement Cisco-style administrative distance, only per-route metrics where lower wins. Use the `metric` keyword to make a route less preferred:

```bash
# Lower metric = higher preference
ip route add 10.20.0.0/24 via 192.168.10.254 metric 10
```

## Dynamic Routes

Dynamic routes are learned automatically from neighboring routers using routing protocols such as OSPF, BGP, RIP, or EIGRP. They adapt automatically when topology changes occur.

```bash
# Install FRR (Free Range Routing) for dynamic routing on Linux
apt install frr

# Enable OSPF daemon
sed -i 's/ospfd=no/ospfd=yes/' /etc/frr/daemons
systemctl restart frr

# Configure OSPF in vtysh
vtysh
  configure terminal
  router ospf
    network 192.168.10.0/24 area 0
    network 10.20.0.0/24 area 0
  end
  write memory

# View dynamically learned OSPF routes
ip route show proto ospf
```

## Administrative Distance Comparison

| Route Type | Linux default metric | Cisco AD |
|---|---|---|
| Connected | 0 | 0 |
| Static | 0 | 1 |
| OSPF | varies | 110 |
| BGP (eBGP) | varies | 20 |
| RIP | varies | 120 |

## When to Use Each

- **Connected** - automatic, no action needed
- **Static** - small networks, default routes, specific overrides
- **Dynamic** - medium-to-large networks, multi-router environments, automatic convergence

## Conclusion

Connected routes form the base of every routing table. Static routes provide predictable, manually-controlled forwarding. Dynamic routes add automation and resilience at the cost of protocol overhead. Most production networks use a combination of all three, with static routes for defaults and edge cases and a dynamic protocol for internal reachability.
