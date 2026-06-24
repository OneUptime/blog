# How to Understand the Discard-Only Address Block (100::/64) - 100

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Discard-Only, 100::/64, RFC 6666, Blackhole, Networking

Description: Understand the IPv6 discard-only address block 100::/64 (RFC 6666), analogous to IPv4's 192.0.2.0/24, used for routing black holes and sink holes in network operations.

## Introduction

RFC 6666 allocates `100::/64` as the IPv6 "Discard-Only" address block. Operators typically route it to a discard or null interface inside their own autonomous system. Unlike IPv4 documentation space such as `192.0.2.0/24`, it is a dedicated operational prefix used for black-hole routing and traffic sinkholes.

## Use Cases

### 1. BGP Black-Hole Routing

```bash
# Install a discard route for 100::/64 on routers inside your AS
# RFC 6666 says this prefix should not be announced to or accepted from
# third-party autonomous systems

# Linux: add a blackhole route for the discard-only prefix
ip -6 route add blackhole 100::/64

# Verify
ip -6 route show 100::/64
```

### 2. Null Routing for DoS Mitigation

```bash
# When under a DDoS attack, null-route the victim's /128
# Traffic gets dropped before reaching the server

# Example victim address
ip -6 route add blackhole 2001:db8:dead:beef::10/128

# In multi-router RTBH designs, controllers can signal the drop internally
# using a next-hop from 100::/64
# Do not announce 100::/64 to upstream providers
```

### 3. Service Discovery Experiments

```bash
# Use 100::/64 addresses in lab environments only if your routers explicitly
# send this prefix to a discard/null route
# Useful for testing fallback and error handling

# Test your application's IPv6 behavior with a bounded transfer time
curl --max-time 5 http://[100::1]/test
# A local Linux blackhole route can fail immediately; a remote discard path
# may instead look like a timeout
```

## Packet Behavior

```python
import ipaddress

def is_discard_only(addr: str) -> bool:
    """Check if an address is in the discard-only block."""
    try:
        a = ipaddress.IPv6Address(addr)
        return a in ipaddress.IPv6Network("100::/64")
    except ValueError:
        return False

# Test
print(is_discard_only("100::1"))     # True
print(is_discard_only("100::ffff"))  # True
print(is_discard_only("100:0:0:1::"))  # False (outside /64)
print(is_discard_only("::1"))        # False
```

## Filtering at Network Boundaries

```bash
# Treat 100::/64 as non-production traffic at host and router boundaries

# Block as source (spoofed discard-only source)
ip6tables -A INPUT -s 100::/64 -j DROP
ip6tables -A FORWARD -s 100::/64 -j DROP

# Block forwarded destination traffic from internal hosts
ip6tables -A FORWARD -d 100::/64 -j LOG --log-prefix "DISCARD-ONLY: "
ip6tables -A FORWARD -d 100::/64 -j DROP

# Block locally generated destination traffic
ip6tables -A OUTPUT -d 100::/64 -j LOG --log-prefix "DISCARD-ONLY: "
ip6tables -A OUTPUT -d 100::/64 -j DROP
```

## NGINX - Reject Traffic from Discard-Only Block

```nginx
# nginx.conf - inside the http {} context
# (Defensive measure in case of routing misconfigurations)
http {
    geo $ipv6_geo {
        default 1;
        100::/64 0;  # Discard-only block - deny
    }

    server {
        if ($ipv6_geo = 0) {
            return 403;
        }
    }
}
```

## Comparison with IPv4 Equivalents

| Purpose | IPv4 | IPv6 |
|---|---|---|
| Documentation | 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24 | 2001:db8::/32 |
| Discard/Sink | No direct special-purpose equivalent | 100::/64 |
| Benchmarking | 198.18.0.0/15 | 2001:2::/48 |
| Loopback | 127.0.0.0/8 | ::1/128 |

## Conclusion

The `100::/64` discard-only block provides a well-known IPv6 prefix for RTBH and sinkhole-style routing inside an autonomous system. Network operators use it for DDoS mitigation and traffic sinkholing, and labs can use it for controlled failure testing when it is explicitly routed to a discard interface. Ensure `100::/64` is kept internal to your network and filtered on inter-domain boundaries. Use OneUptime's network monitoring to detect unexpected routing changes to this block.
