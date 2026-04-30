# Why You Must Not Block ICMPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Firewall, IPv6 Security, RFC 4890, Network Policy

Description: Understand why blocking ICMPv6 breaks IPv6 functionality, which message types are essential, and why the 'block all ICMP' approach used for IPv4 is catastrophically wrong for IPv6.

## Introduction

A common security misconfiguration is to block all ICMPv6 traffic, treating it like ICMPv4 where many administrators block most ICMP. This is dangerously wrong for IPv6. ICMPv6 is not just a diagnostic protocol - it is a fundamental part of IPv6 operation. Neighbor Discovery (NDP) and classical Path MTU Discovery both depend on ICMPv6. Blocking ICMPv6 will break IPv6 connectivity in ways that are often difficult to diagnose.

## What Breaks When ICMPv6 Is Blocked

```text
If you block all ICMPv6:

1. NDP (Neighbor Discovery) fails completely
   → Types 133-136 are used for:
     - Router Discovery (RA/RS)
     - Address Resolution (NS/NA, replacing ARP)
     - Duplicate Address Detection (DAD)
   → Without NDP: hosts cannot get addresses, cannot resolve neighbors
   → Result: NO IPv6 connectivity at all on the local network

2. Classical Path MTU Discovery fails
   → Type 2 (Packet Too Big) is how sources learn the path MTU
   → Without it: sources keep using the first-hop MTU (1500 bytes typically)
   → TCP connections that cross links with smaller MTU silently fail
   → Result: "works with small data, fails with large" symptoms

3. traceroute6 fails
   → Type 3 (Time Exceeded) is generated at each hop
   → Without it: traceroute6 shows all * (no replies)
   → Result: routing debugging is impossible

4. MLD (Multicast Listener Discovery) fails
   → Types 130-132, 143 are used for multicast group management
   → Without it: multicast listener management breaks and multicast delivery may fail
   → DHCPv6 (which uses multicast) may also break

5. Error reporting fails
   → Type 1 (Destination Unreachable) tells sources why packets failed
   → Without it: connections time out instead of failing fast
```

## Essential ICMPv6 Types That Must Never Be Blocked

```text
CRITICAL - Blocking these breaks core IPv6 operation:

Type 2  (Packet Too Big)          - Classical PMTUD; blocking often = PMTU black holes
Type 133 (Router Solicitation)    - Router discovery; blocking = delayed or broken RA discovery
Type 134 (Router Advertisement)   - SLAAC; blocking = no default gateway
Type 135 (Neighbor Solicitation)  - NDP/address resolution; blocking = no ARP
Type 136 (Neighbor Advertisement) - NDP/address resolution; blocking = no ARP

IMPORTANT - Blocking causes significant problems:

Type 1  (Destination Unreachable) - Error reporting; blocking = silent failures
Type 3  (Time Exceeded)           - traceroute; blocking = no path debugging
Type 4  (Parameter Problem)       - Header errors; blocking = debug blind spot
Type 130-132, 143 (MLD)           - Multicast listener management; blocking = multicast delivery failures

POLICY-DEPENDENT / USEFUL:

Type 128 (Echo Request)           - ping6/connectivity checks; RFC 4890 recommends allowing it
Type 129 (Echo Reply)             - ping6 replies/connectivity checks; RFC 4890 recommends allowing it
Type 137 (Redirect)               - Router redirect; case-by-case policy, often blocked on hosts
```

## Correct ip6tables Minimum Host Policy for ICMPv6

```bash
# CORRECT IPv6 host firewall: allow critical ICMPv6

# Minimal host policy for basic IPv6 operation

# (Add MLD, Parameter Problem, and any FORWARD rules you need per RFC 4890)

# Allow Packet Too Big (CRITICAL - PMTUD)
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 2   -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 2   -j ACCEPT

# Allow Destination Unreachable (important for error reporting)
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 1   -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 1   -j ACCEPT

# Allow Time Exceeded (for traceroute6)
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 3   -j ACCEPT

# Allow NDP and router discovery on the local link
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 133 -j ACCEPT
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 134 -j ACCEPT
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 135 -j ACCEPT
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 136 -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 133 -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 134 -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 135 -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 136 -j ACCEPT

# Allow ping6 (useful for diagnostics)
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 128 -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 128 -j ACCEPT
sudo ip6tables -A INPUT   -p icmpv6 --icmpv6-type 129 -j ACCEPT
sudo ip6tables -A OUTPUT  -p icmpv6 --icmpv6-type 129 -j ACCEPT
```

## The IPv4 ICMPv6 Analogy Problem

```text
Why "block ICMP like in IPv4" is wrong for IPv6:

IPv4:
  ARP operates at Layer 2 (separate from IP)
  → Blocking ICMP doesn't break address resolution
  → Path MTU Discovery uses DF bit + ICMP Fragmentation Needed
  → IPv4 routers can fragment packets when DF is clear
  → Some ICMP types (echo, redirect) can be safely blocked

IPv6:
  NDP is part of ICMPv6 (NS/NA replace ARP)
  → Blocking ICMPv6 breaks all address resolution
  → Routers do not fragment IPv6 packets in transit
  → Blocking Type 2 breaks classical PMTUD and often creates PMTU black holes
  → No IPv6 feature can safely assume ICMPv6 is blocked
```

## Conclusion

ICMPv6 is architecturally different from ICMPv4 and must be treated differently in firewall policy. RFC 4890 provides comprehensive guidance on filtering ICMPv6. The absolute minimum: never block Packet Too Big (Type 2) or Neighbor Discovery (Types 133-136). Blocking these will silently break IPv6 in ways that are hard to diagnose. The correct mental model for IPv6 firewalls is to allow critical ICMPv6 by type, then apply other traffic restrictions on top.
