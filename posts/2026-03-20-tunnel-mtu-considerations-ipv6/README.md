# How to Understand Tunnel MTU Considerations for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Networking, MTU, Tunneling, Network Configuration

Description: A practical guide to understanding MTU constraints when tunneling IPv6 traffic and how to configure appropriate MTU values to avoid fragmentation and performance issues.

## Why MTU Matters for IPv6 Tunnels

When you encapsulate IPv6 packets inside another protocol (such as in 6in4, GRE, or SIT tunnels), you add extra headers that consume bytes from the available path MTU. Unlike IPv4, IPv6 routers do not fragment packets in transit - only the source host performs fragmentation. This makes MTU configuration critical for tunnel setups.

The default Ethernet MTU is 1500 bytes. Adding tunnel overhead reduces the effective MTU available to the inner IPv6 packet.

## Common Tunnel Overhead Values

| Tunnel Type | Overhead | Effective IPv6 MTU (on 1500 MTU link) |
|---|---|---|
| IPv6-in-IPv4 (6in4/SIT) | 20 bytes (IPv4 header) | 1480 bytes |
| GRE over IPv4 | 24 bytes (IPv4 + GRE) | 1476 bytes |
| GRE over IPv6 | 44 bytes (IPv6 + GRE) | 1456 bytes |
| IPsec ESP tunnel | 50–70 bytes | ~1430–1450 bytes |
| VXLAN over IPv6 | 70 bytes | ~1430 bytes |

## IPv6 Minimum MTU Requirement

RFC 8200 mandates that every link in an IPv6 network must support a minimum MTU of **1280 bytes**. If your tunnel MTU falls below 1280, the tunnel is non-compliant and IPv6 communication will break.

## Configuring Tunnel MTU on Linux

The following example sets the MTU on a 6in4 (SIT) tunnel interface. Run this after creating the tunnel:

```bash
# Create a SIT tunnel interface (IPv6 over IPv4)

ip tunnel add sit1 mode sit remote 203.0.113.1 local 192.0.2.1 ttl 64

# Bring the tunnel interface up
ip link set dev sit1 up

# Set the MTU to account for the 20-byte IPv4 encapsulation overhead
# 1500 (Ethernet) - 20 (IPv4 header) = 1480
ip link set dev sit1 mtu 1480

# Assign an IPv6 address to the tunnel
ip -6 addr add 2001:db8:1::1/64 dev sit1

# Add a default IPv6 route through the tunnel
ip -6 route add ::/0 dev sit1
```

## Path MTU Discovery (PMTUD) in IPv6 Tunnels

IPv6 relies on Path MTU Discovery (PMTUD) to determine the correct MTU end-to-end. PMTUD works by sending large packets and listening for ICMPv6 "Packet Too Big" messages. In tunnel environments, two issues can break PMTUD:

1. **ICMP filtering**: Firewalls that block ICMPv6 "Packet Too Big" messages will cause silent packet drops.
2. **Tunnel endpoints ignoring PMTU**: Some tunnel implementations do not propagate ICMP errors correctly between the inner and outer headers.

## Verifying MTU on Tunnel Interfaces

Use the following commands to inspect and verify tunnel MTU settings:

```bash
# Check MTU of all interfaces including tunnel interfaces
ip link show

# Check MTU for a specific tunnel interface
ip link show sit1

# Test reachability and effective MTU using ping with a large packet
# -M do: do not fragment, -s: payload size
# 1432 = 1480 (MTU) - 40 (IPv6 header) - 8 (ICMPv6 header)
ping6 -M do -s 1432 2001:db8:1::2

# Use tracepath6 to detect MTU bottlenecks along the path
tracepath6 2001:db8:1::2
```

## Best Practices

- Always explicitly set the tunnel MTU rather than relying on auto-detection.
- Enable ICMPv6 "Packet Too Big" messages through all firewalls on the tunnel path.
- If PMTUD is unreliable (e.g., in corporate networks with ICMP filtering), consider setting a conservative MTU of 1280 bytes to guarantee compatibility.
- For GRE tunnels, use TCP MSS clamping as a fallback to prevent oversized segments:

```bash
# Clamp TCP MSS to avoid fragmentation issues in GRE tunnels
# Replace sit1 with your actual tunnel interface name
ip6tables -t mangle -A FORWARD -o sit1 -p tcp --tcp-flags SYN,RST SYN \
  -j TCPMSS --clamp-mss-to-pmtu
```

## Monitoring with OneUptime

After configuring your tunnel, use OneUptime to monitor the tunnel endpoint's reachability via IPv6 probes. Setting up a synthetic monitor targeting the remote tunnel endpoint's IPv6 address will alert you if fragmentation or MTU mismatches cause connectivity drops.

## Summary

IPv6 tunnel MTU configuration requires careful calculation of encapsulation overhead. Always set explicit MTU values, ensure ICMP "Packet Too Big" messages flow freely, and test end-to-end connectivity with large packets after deployment.
