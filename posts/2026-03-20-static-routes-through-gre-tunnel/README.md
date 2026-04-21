# How to Add Static Routes Through a GRE Tunnel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, Static Routes, Routing, iproute2, Networking

Description: Add static routes to route traffic for remote subnets through a GRE tunnel, enabling connected networks to communicate over the tunnel endpoint.

## Introduction

After creating a GRE tunnel, you need to add static routes so the Linux routing table knows to send traffic for remote subnets through the tunnel. Without routes, the tunnel exists but no traffic is directed through it.

## Prerequisites

- GRE tunnel configured and up (gre0)
- Tunnel interface IPs assigned (e.g., 172.16.0.1 on Host A, 172.16.0.2 on Host B)
- IP forwarding enabled

## Add a Route for a Remote Subnet

```bash
# On Host A: route traffic to Host B's 192.168.2.0/24 through the tunnel

ip route add 192.168.2.0/24 via 172.16.0.2

# On Host B: route traffic to Host A's 192.168.1.0/24 through the tunnel
ip route add 192.168.1.0/24 via 172.16.0.1
```

## Alternatively, Route via Interface

You can route through the tunnel interface directly (without specifying next-hop):

```bash
# Route directly via the tunnel interface
ip route add 192.168.2.0/24 dev gre0
```

## Add Multiple Remote Subnets

```bash
# On Host A: multiple networks behind Host B
ip route add 192.168.2.0/24 via 172.16.0.2
ip route add 10.50.0.0/16 via 172.16.0.2
ip route add 172.20.0.0/14 via 172.16.0.2
```

## Route All Traffic Through the Tunnel (VPN-style)

```bash
# First ensure the tunnel's underlay traffic bypasses the tunnel default route
# Add a specific host route for the remote GRE underlay endpoint via the physical interface
ip route replace 10.0.0.2/32 via <physical-gateway> dev <physical-interface>

# Route all internet traffic through the tunnel
# (VPN-style routing; GRE itself does not encrypt traffic)
ip route replace default via 172.16.0.2 dev gre0
```

## Verify Routes

```bash
# Show all routes
ip route show

# Check if the tunnel route is present
ip route show | grep 192.168.2.0

# Test routing decision
ip route get 192.168.2.100
# Should show: via 172.16.0.2 dev gre0

# Test end-to-end
ping -c 3 192.168.2.1
```

## Make Routes Persistent

Routes added with `ip route` are not persistent. Add to network config:

```ini
# systemd-networkd: /etc/systemd/network/10-gre0.network
[Match]
Name=gre0

[Network]
Address=172.16.0.1/30

[Route]
Destination=192.168.2.0/24
Gateway=172.16.0.2

[Route]
Destination=10.50.0.0/16
Gateway=172.16.0.2
```

```yaml
# Netplan (Ubuntu): add routes under the gre0 tunnel definition
network:
  version: 2
  tunnels:
    gre0:
      mode: gre
      local: 10.0.0.1
      remote: 10.0.0.2
      addresses:
        - 172.16.0.1/30
      routes:
        - to: 192.168.2.0/24
          via: 172.16.0.2
```

## Conclusion

Static routes through GRE tunnels direct traffic for remote subnets to the tunnel's far-end interface IP. Use `ip route add <remote-subnet> via <far-end-tunnel-interface-ip>` on each side. For persistence, add routes in systemd-networkd `.network` files or equivalent configuration. Verify with `ip route get <remote-ip>` to confirm the routing decision uses the tunnel.
