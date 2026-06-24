# How to Understand the AMT Address Space (2001:3::/32)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, AMT, Automatic Multicast Tunneling, 2001:3::/32, RFC 7450, Multicast

Description: Understand the AMT (Automatic Multicast Tunneling) address space 2001:3::/32 (RFC 7450), how AMT relays use it, and its role in enabling IPv6 multicast across unicast networks.

## Introduction

`2001:3::/32` is allocated for Automatic Multicast Tunneling (AMT) as defined in RFC 7450. Specifically, it is the IPv6 anycast relay discovery prefix for public AMT relays. AMT allows multicast receivers behind unicast-only networks to receive multicast streams by tunneling through an AMT gateway/relay pair. Unlike many special-purpose ranges, `2001:3::/32` is both forwardable and globally reachable in the IANA special-purpose registry.

## Key Properties

| Property | Value |
|---|---|
| Prefix | 2001:3::/32 |
| RFC | RFC 7450 |
| Source | True |
| Destination | True |
| Forwardable | Yes |
| Globally Reachable | Yes |

## How AMT Works

```text
Architecture:
  Multicast Source → Multicast Network → AMT Relay
                                              ↕ (UDP tunnel)
                              AMT Gateway ← Unicast Network
                                    ↕
                              Multicast Receiver

AMT Relay: Connected to multicast network, accessible via unicast
AMT Gateway: On the receiver's unicast network, discovers relay via anycast or DNS

Discovery examples:
  RFC 7450 anycast discovery → 2001:3::1
  RFC 8777 DNS-SD:
    _amt._udp.multicast.example.com → SRV → amt-relay.example.com
    amt-relay.example.com → AAAA → 2001:db8:100::53
```

## AMT Discovery Prefix 2001:3::/32

```python
import ipaddress

AMT_DISCOVERY_PREFIX = ipaddress.IPv6Network("2001:3::/32")
AMT_DISCOVERY_ADDRESS = ipaddress.IPv6Address("2001:3::1")

def is_amt_discovery_address(addr_str: str) -> bool:
    """Check if an IPv6 address is the well-known AMT discovery address."""
    try:
        return ipaddress.IPv6Address(addr_str) == AMT_DISCOVERY_ADDRESS
    except ValueError:
        return False

# RFC 7450 assigns 2001:3::/32 as the IPv6 AMT discovery prefix.
# Today, 2001:3::1 is the well-known Relay Discovery Address.
# The remaining addresses in 2001:3::/32 are reserved for future use.
example_discovery = "2001:3::1"
print(
    f"In AMT discovery prefix: "
    f"{ipaddress.IPv6Address(example_discovery) in AMT_DISCOVERY_PREFIX}"
)  # True
print(f"Is AMT discovery address: {is_amt_discovery_address(example_discovery)}")  # True

# The relay address returned to the gateway is a separate unicast IPv6 address.
# _amt._udp.multicast.example.com. IN SRV 0 0 2268 amt-relay.example.com.
# amt-relay.example.com. IN AAAA 2001:db8:100::53
```

## AMT Protocol Exchange

```text
1. Gateway sends Relay Discovery (UDP 2268)
   → dst: IPv6 Relay Discovery Address 2001:3::1
   → src: Gateway address

2. Relay responds with Relay Advertisement
   ← src: 2001:3::1
   ← Contains: relay's unicast IPv6 or IPv4 address

3. Gateway sends Request
   → dst: Relay unicast address on UDP 2268

4. Relay sends Membership Query (tunneled IGMP/MLD)
   ← Relay checks what groups gateway wants

5. Gateway sends Membership Update (MLD Report)
   → Requests specific multicast group

6. Relay sends multicast data encapsulated in UDP
   → Gateway decapsulates and delivers locally
```

## Filtering AMT in Firewall

```bash
# Allow AMT anycast discovery (UDP 2268 to 2001:3::1)
ip6tables -A OUTPUT -p udp --dport 2268 -d 2001:3::1 -j ACCEPT
ip6tables -A INPUT -p udp --sport 2268 -s 2001:3::1 -j ACCEPT

# After discovery, allow the relay's returned unicast address on UDP 2268
ip6tables -A OUTPUT -p udp --dport 2268 -d 2001:db8:100::53 -j ACCEPT
ip6tables -A INPUT -p udp --sport 2268 -s 2001:db8:100::53 -j ACCEPT

# If you don't use AMT, block it
ip6tables -A INPUT -p udp --sport 2268 -j DROP
ip6tables -A INPUT -p udp --dport 2268 -j DROP
ip6tables -A OUTPUT -p udp --sport 2268 -j DROP
ip6tables -A OUTPUT -p udp --dport 2268 -j DROP
```

## AMT vs PIM-SM for Multicast

```text
Native Multicast (PIM-SM):
  - Requires multicast-enabled routers throughout the path
  - Best for intranet multicast
  - No tunneling overhead

AMT:
  - Works across unicast-only networks (internet)
  - Uses UDP tunneling (overhead)
  - Useful for "over-the-top" multicast delivery
  - Lets providers reach receivers without end-to-end multicast routing
```

## Conclusion

The `2001:3::/32` AMT space provides the IPv6 anycast discovery prefix used to find public AMT relays. Public relays answer on `2001:3::1` and return their unicast relay address in the advertisement. If your network does not run AMT, block UDP port 2268 at your firewall; filtering `2001:3::/32` alone only affects the IPv6 discovery step. Monitor AMT relay availability with OneUptime if your organization depends on AMT for multicast content delivery.
