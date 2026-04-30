# How ICMPv6 Source Address Is Determined

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Source Address, IPv6, RFC 4443, Error Messages

Description: Understand the rules for selecting the source address of ICMPv6 error messages, why the correct source address matters, and how it affects diagnostics and firewall policy.

## Introduction

When a router or host generates an ICMPv6 error message, the choice of source address is not arbitrary - RFC 4443 says that if the original packet was sent to one of the node's unicast addresses, the ICMPv6 reply must use that same address. Otherwise, the ICMPv6 message must still use a unicast address belonging to the node, usually chosen the same way the node would pick a source address for any other packet sent back to the original sender. This rule helps ensure that the ICMPv6 error message can be routed back to the original source, and that the source address is meaningful for the network that will receive the error.

## RFC 4443 Source Address Rules

```sql
RFC 4443 Section 2.2: ICMPv6 error message source address selection

Rule 1: If the ICMPv6 message is a response to a packet sent to one
        of the node's unicast addresses, use that same address as the
        ICMPv6 source.

Rule 2: If the original packet was sent to any other address
        (for example, multicast, anycast, or a unicast address that
        does not belong to the node), the ICMPv6 source must still be
        a unicast address belonging to the node.

Rule 3: The address should normally be chosen the same way the node
        would choose a source address for any other packet sent to the
        ICMPv6 destination (the source of the invoking packet).
        A node may choose a different unicast address if it is more
        informative and still reachable from that destination.

Goal: The ICMPv6 error source should be a reachable, useful unicast
      address for the node sending the error.
```

## Why Source Address Matters

```text
Impact of ICMPv6 source address on operations:

1. Reachability:
   If ICMPv6 source is a link-local address and the original
   packet's source is on a different network, the link-local
   source cannot be reached → error is undeliverable

2. Firewall policy:
   Firewalls filter ICMPv6 by source address
   Correct source ensures the error passes through the return path
   Wrong source (e.g., internal RFC 1918-like ULA) may be blocked

3. traceroute/tracepath hop identification:
   Each hop sends Time Exceeded from a unicast address selected for
   the reply path back to the sender
   This address helps identify the router at that hop
   Choosing the wrong source confuses path-debugging output

4. PMTU Discovery:
   Packet Too Big is typically sent from a unicast address on the
   interface used to send the ICMPv6 reply back toward the source
   Source uses this to identify which router reported the bottleneck
```

## Verifying ICMPv6 Source Address Selection

```bash
# Send a packet that will trigger an ICMPv6 error

# Watch what source address the error uses

# Test 1: Trigger Destination Unreachable by sending to an unreachable host
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 1" &
ping -6 -c 1 -W 3 2001:db8::99  # Replace with an unreachable address in a routed IPv6 prefix
# Look at the source address of the error message

# Test 2: Trigger Time Exceeded with hop limit = 1
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 3" &
ping -6 -t 1 -c 1 2001:4860:4860::8888  # First router should send Time Exceeded
# Source of Time Exceeded = address the router chose to send the reply back to you

# Test 3: Trigger Packet Too Big
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 2" &
tracepath -6 2001:4860:4860::8888  # Often elicits Packet Too Big when the path MTU drops

# Verify: tracepath -6 shows the router addresses that send hop-limit and MTU errors
tracepath -6 2001:4860:4860::8888
```

## Simulating Source Address Selection

```python
import ipaddress

def _usable_unicast(addr: str) -> bool:
    ip = ipaddress.ip_address(addr)
    return not ip.is_multicast and not ip.is_unspecified

def _scope(addr: str) -> str:
    ip = ipaddress.ip_address(addr)
    if ip.is_link_local or ip.is_loopback:
        return "link-local"
    return "global"

def select_icmpv6_source_address(
    local_unicast_addrs: list[str],
    invoking_packet_dst: str,
    icmp_destination: str,
) -> str:
    """
    Simplified RFC 4443 / RFC 6724 ICMPv6 source address selection.

    Args:
        local_unicast_addrs: Addresses assigned to the node
        invoking_packet_dst: Destination address of the packet
                             that triggered the ICMPv6 error
        icmp_destination:    Destination address of the ICMPv6 error
                             (the source of the invoking packet)

    Returns:
        Selected source address for the ICMPv6 error message
    """
    candidates = [a for a in local_unicast_addrs if _usable_unicast(a)]

    if not candidates:
        raise ValueError("No usable unicast source address found")

    # RFC 4443: if the original packet was sent to one of our unicast
    # addresses, reply from that same address.
    if invoking_packet_dst in candidates:
        return invoking_packet_dst

    if not ipaddress.ip_address(icmp_destination).is_loopback:
        candidates = [a for a in candidates if not ipaddress.ip_address(a).is_loopback]
        if not candidates:
            raise ValueError("No usable non-loopback source address found")

    # Otherwise, prefer an address whose scope matches the ICMPv6 destination.
    preferred_scope = _scope(icmp_destination)
    scoped = [a for a in candidates if _scope(a) == preferred_scope]
    if scoped:
        return scoped[0]

    return candidates[0]

# Example: Host replying to a packet sent to one of its addresses
local_addrs = ["2001:db8:1::10", "fe80::10"]

src = select_icmpv6_source_address(
    local_unicast_addrs=local_addrs,
    invoking_packet_dst="2001:db8:1::10",
    icmp_destination="2001:db8:1::100",
)
print(f"ICMPv6 error source address: {src}")
```

## Common Source Address Mistakes

```text
Mistake 1: Using an internal-only source for external errors
  Problem: Error sent from internal address; external firewalls may block it
  Fix:     Use a source address that is reachable back toward the original
           sender and appropriate for the ICMPv6 destination

Mistake 2: Using :: (unspecified) as ICMPv6 source
  RFC 4291 says packets with source :: must never be forwarded
  Causes: ICMPv6 cannot be delivered back to source

Mistake 3: Using a loopback source for non-loopback traffic
  RFC 4291 says loopback must not be used as a source outside the local node

Mistake 4: Treating the incoming interface as the required source address
  RFC 4443 does not require ingress-interface sourcing for every error
  The better rule is to choose a reachable, informative unicast source
```

## Conclusion

ICMPv6 error message source address selection does not boil down to "use the ingress interface address." Under RFC 4443, a node replies from the same unicast address only when the original packet was sent to that address; otherwise it chooses a unicast address belonging to the node using normal source-address-selection logic for the ICMPv6 destination, or another more informative reachable unicast address. The practical implication for network operators: routers with unnumbered interfaces or point-to-point links must still ensure that ICMPv6 errors use a reachable source address, because the wrong choice results in undeliverable errors and makes path debugging much harder.
