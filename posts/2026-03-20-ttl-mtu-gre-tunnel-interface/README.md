# How to Set the TTL and MTU on a GRE Tunnel Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, GRE, Tunnel, TTL, MTU, Networking, Performance, iproute2

Description: Configure the TTL and MTU values on a Linux GRE tunnel interface to prevent fragmentation and ensure proper packet handling through the tunnel.

## Introduction

GRE tunnels add overhead to packets: the outer IP header (20 bytes) plus GRE header (4 bytes minimum) = 24 bytes total. This reduces the effective MTU from 1500 to 1476 bytes. Setting the correct MTU prevents fragmentation and improves performance. The TTL value affects how many network hops the encapsulated packet can traverse.

## Set TTL on Tunnel Creation

```bash
# Create GRE tunnel with TTL=255 (maximum)

ip tunnel add gre0 mode gre \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 255

# TTL=64 is common for LAN tunnels
ip tunnel add gre0 mode gre \
    local 10.0.0.1 \
    remote 10.0.0.2 \
    ttl 64
```

## Change TTL on an Existing Tunnel

```bash
# Modify TTL on an existing tunnel
ip tunnel change gre0 ttl 255

# Verify
ip tunnel show gre0
```

## Understanding GRE MTU

```text
Physical MTU:   1500 bytes
GRE overhead:    -24 bytes (20 IP + 4 GRE headers)
GRE tunnel MTU: 1476 bytes
```

For GRE over IPv6 (20 bytes larger outer header):
```text
GRE overhead: -44 bytes (40 IPv6 + 4 GRE)
GRE tunnel MTU: 1456 bytes
```

## Set MTU on Tunnel Interface

```bash
# Set MTU to 1476 (standard GRE over IPv4)
ip link set gre0 mtu 1476

# Verify
ip link show gre0 | grep mtu
```

## Configure MSS Clamping

TCP MSS clamping adjusts the Maximum Segment Size in TCP SYN packets to prevent fragmentation in the tunnel:

```bash
# Clamp TCP MSS to fit within GRE tunnel MTU
iptables -A FORWARD -o gre0 -p tcp -m tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --set-mss 1436

# Or using automatic PMTU clamping
iptables -A FORWARD -o gre0 -p tcp -m tcp --tcp-flags SYN,RST SYN \
    -j TCPMSS --clamp-mss-to-pmtu
```

## Set PMTU Discovery

```bash
# Enable path MTU discovery on the tunnel
ip tunnel change gre0 pmtudisc

# Or disable PMTU discovery (use fixed MTU)
ip tunnel change gre0 nopmtudisc
```

## Check Current Tunnel Parameters

```bash
# Show tunnel with all parameters
ip -d tunnel show gre0

# Example output:
# gre0: gre/ip remote 10.0.0.2 local 10.0.0.1 ttl 255 nopmtudisc
```

## Test for Fragmentation

```bash
# Test with a large packet - should work without fragmentation
ping -s 1448 -M do -c 3 172.16.0.2
# -s 1448: payload size (1448 + 20 IP + 8 ICMP = 1476 total, exactly fits GRE tunnel MTU)
# -M do: don't fragment

# If this fails with "Message too long", the MTU setting is incorrect
```

## Conclusion

Set GRE tunnel MTU to 1476 bytes (physical MTU 1500 minus 24 bytes GRE overhead) to prevent fragmentation. Set TTL to 64 for LAN tunnels or 255 for internet-facing tunnels where packets may need to traverse many hops. Use TCP MSS clamping (`--clamp-mss-to-pmtu`) in iptables on the FORWARD chain to automatically handle TCP connections traversing the tunnel. These settings are especially important for traffic flowing through multiple GRE hops.
