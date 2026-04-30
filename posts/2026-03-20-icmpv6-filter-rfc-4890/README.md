# How to Filter ICMPv6 Following RFC 4890

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, RFC 4890, Firewall, IPv6 Security, Filtering

Description: Implement ICMPv6 filtering policies following RFC 4890, understanding which messages to allow, rate-limit, or drop at different network boundary points.

## Introduction

RFC 4890 ("Recommendations for Filtering ICMPv6 Messages in Firewalls") provides a comprehensive framework for ICMPv6 filtering. It distinguishes between different boundary types (transit firewalls, host firewalls, customer edge routers) and provides specific recommendations for each. Unlike IPv4 ICMP filtering, IPv6 requires a carefully considered allow-list approach rather than a deny-all policy.

## RFC 4890 Filtering Categories

```text
RFC 4890 separates recommendations by boundary type. For the common ICMPv6 messages discussed here:

Transit traffic: MUST NOT be filtered
  Type 1   - Destination Unreachable (all codes)
  Type 2   - Packet Too Big (CRITICAL: never filter)
  Type 3/0 - Time Exceeded (hop limit exceeded in transit)
  Type 4/1 - Parameter Problem (unrecognized next header)
  Type 4/2 - Parameter Problem (unrecognized IPv6 option)
  Type 128 - Echo Request
  Type 129 - Echo Reply

Transit traffic: normally SHOULD NOT be filtered
  Type 3/1 - Time Exceeded (fragment reassembly timeout)
  Type 4/0 - Parameter Problem (erroneous header field)

Local-link traffic: valid only on the local link
  Type 130-132 - MLD
  Type 133-136 - Router/Neighbor Discovery
  Type 137 - Redirect (define a local policy for host firewalls)
  Type 141-142 - Inverse Neighbor Discovery
  Type 143 - MLDv2
  Type 148-149 - SEND Certificate Path messages
  Type 151-153 - Multicast Router Discovery
```

## Transit Firewall Policy (RFC 4890 Compliant)

```bash
# Transit firewall: sits between the Internet and your network

# Allows routable IPv6 traffic + essential ICMPv6

# Example setup: flush the built-in filter chains before adding rules
sudo ip6tables -F INPUT
sudo ip6tables -F OUTPUT
sudo ip6tables -F FORWARD
sudo ip6tables -P FORWARD DROP

# RFC 4890 Sections 4.3.1 and 4.3.2: error messages to allow through
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 1   -j ACCEPT  # Dest Unreachable (all codes)
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 2   -j ACCEPT  # Packet Too Big
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 3/0 -j ACCEPT  # Time Exceeded: hop limit exceeded
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 3/1 -j ACCEPT  # Time Exceeded: reassembly timeout
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 4/0 -j ACCEPT  # Parameter Problem: erroneous header
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 4/1 -j ACCEPT  # Parameter Problem: next header
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 4/2 -j ACCEPT  # Parameter Problem: IPv6 option

# Echo (diagnostic - allow in both directions)
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 128 -j ACCEPT  # Echo Request
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 129 -j ACCEPT  # Echo Reply

# RFC 4890 Section 4.3.3: local-link control traffic should never cross transit
# Explicit drops are optional but make the policy visible
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 133 -j DROP  # RS
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 134 -j DROP  # RA
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 135 -j DROP  # NS
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 136 -j DROP  # NA
sudo ip6tables -A FORWARD -p icmpv6 --icmpv6-type 137 -j DROP  # Redirect

# Other ICMPv6 types are handled by the default FORWARD policy
```

## Local Segment Policy (Host Firewall)

```bash
# Host firewall: allows local network ICMPv6

# RFC 4890 Sections 4.4.1 and 4.4.2: essential error messages
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 1   -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 2   -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 3/0 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 3/1 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 4/0 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 4/1 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 4/2 -j ACCEPT

# Allow NDP on local segment
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 133 -j ACCEPT  # RS
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 134 -j ACCEPT  # RA
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 135 -j ACCEPT  # NS
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 136 -j ACCEPT  # NA
# Redirect (Type 137) is a separate policy decision in RFC 4890

# Allow MLD (for IPv6 multicast to work)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 130 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 131 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 132 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 143 -j ACCEPT

# Allow ping6 in both directions
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type 128 -j ACCEPT
sudo ip6tables -A INPUT  -p icmpv6 --icmpv6-type 129 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 128 -j ACCEPT
sudo ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 129 -j ACCEPT
```

## nftables Implementation

```bash
# nftables version of RFC 4890-compliant filtering
sudo nft add table ip6 filter
sudo nft add chain ip6 filter input  '{ type filter hook input priority 0; policy drop; }'
sudo nft add chain ip6 filter forward '{ type filter hook forward priority 0; policy drop; }'

# Essential ICMPv6 error and echo traffic
sudo nft add rule ip6 filter input icmpv6 type { destination-unreachable, packet-too-big, time-exceeded, parameter-problem, echo-request, echo-reply } accept
sudo nft add rule ip6 filter forward icmpv6 type { destination-unreachable, packet-too-big, time-exceeded, parameter-problem, echo-request, echo-reply } accept

# NDP - allow on input, block on forward
sudo nft add rule ip6 filter input  icmpv6 type { nd-router-solicit, nd-router-advert, nd-neighbor-solicit, nd-neighbor-advert } accept
sudo nft add rule ip6 filter forward icmpv6 type { nd-router-solicit, nd-router-advert, nd-neighbor-solicit, nd-neighbor-advert, nd-redirect } drop

# MLD - allow on input if the host needs IPv6 multicast
sudo nft add rule ip6 filter input icmpv6 type { mld-listener-query, mld-listener-report, mld-listener-done, mld2-listener-report } accept
```

## Conclusion

RFC 4890 provides a clear and practical framework for ICMPv6 filtering. The key principles: always allow Destination Unreachable, Packet Too Big, Echo Request, and Echo Reply, plus the specific Time Exceeded and Parameter Problem codes RFC 4890 calls out; block local-link control traffic from crossing transit boundaries; allow NDP and MLD on local segments where they are needed, while treating Redirect (Type 137) as an explicit policy decision. The distinction between "local link" and "transit" boundaries is the most important concept - NDP messages are only valid on the link where they originate and must never be routed.
