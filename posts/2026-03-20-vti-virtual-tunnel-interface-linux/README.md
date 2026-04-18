# How to Create a VTI (Virtual Tunnel Interface) on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VTI, IPsec, Virtual Tunnel Interface, Networking, VPN, Routing

Description: Create Virtual Tunnel Interfaces (VTI) on Linux to provide routable IPsec tunnel interfaces that work with standard routing tools and policy-based routing.

## Introduction

VTI (Virtual Tunnel Interface) is a Linux network interface type designed for use with IPsec. Unlike traditional policy-based IPsec that intercepts matching traffic, VTI creates an actual interface that routes traffic into the IPsec SA. This allows using standard routing tools (ip route, OSPF, BGP) to direct traffic through IPsec tunnels.

## VTI vs Policy-Based IPsec

| Feature | Policy-Based IPsec | VTI IPsec |
|---|---|---|
| Interface | No dedicated interface | Dedicated vti0 interface |
| Routing | Traffic selectors only | Standard ip route commands |
| Monitoring | Hard to see per-tunnel stats | Use `ip -s link show vti0` |
| Dynamic routing | Complex | OSPF/BGP can use VTI |

## Create a VTI Interface

```bash
# Create a VTI tunnel interface

# i_key and o_key must match the IPsec mark
ip link add vti0 type vti \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    key 1

# Assign tunnel IP
ip addr add 172.16.0.1/30 dev vti0

# Bring it up
ip link set vti0 up
ip link set vti0 mtu 1400  # Lower MTU for IPsec overhead
```

## Configure IPsec to Use the VTI Mark

Using StrongSwan's `vti` interface type:

```text
# /etc/ipsec.conf
conn site-to-site
    left=10.0.0.1
    right=10.0.0.2
    ike=aes256-sha256-modp2048!
    esp=aes256-sha256!
    authby=secret
    type=tunnel
    mark=1          # Must match the VTI key
    leftsubnet=0.0.0.0/0
    rightsubnet=0.0.0.0/0
    auto=start
```

## Add Routes Through the VTI

```bash
# Route traffic for the remote network through the VTI
ip route add 192.168.2.0/24 dev vti0

# Check routing table
ip route show
```

## VTI Traffic Marking

VTI uses marks to associate tunnel traffic with the IPsec policy:

```bash
# Show VTI interface with mark
ip -d link show vti0
# Should show: vti local 10.0.0.1 remote 10.0.0.2 ikey 0x1 okey 0x1
```

## Monitor VTI Statistics

```bash
# Show packet/byte counts through the VTI
ip -s link show vti0

# Watch in real time
watch -n 2 "ip -s link show vti0"
```

## Use Case: Route-Based VPN with Dynamic Routing

VTI enables OSPF/BGP to run over IPsec:

```bash
# Configure OSPF daemon (e.g., FRRouting) to use vti0
# VTI interface is visible to routing daemons like any other interface
```

## Conclusion

VTI interfaces bridge the gap between IPsec's traditional policy-based approach and the flexibility of route-based VPNs. Creating a VTI with `ip link add type vti local/remote key` pairs it with an IPsec SA identified by the mark/key. Traffic routed to the VTI interface is automatically processed by IPsec, enabling dynamic routing protocols over IPsec tunnels.
