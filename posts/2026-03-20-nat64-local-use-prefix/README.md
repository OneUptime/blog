# How to Understand the NAT64 Local-Use Prefix (64:ff9b:1::/48)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NAT64, Local-Use Prefix, RFC 8215, Transition, DNS64

Description: Understand the NAT64 Local-Use Prefix 64:ff9b:1::/48 (RFC 8215), its differences from the Well-Known Prefix, and how to use operator-specific NAT64 prefixes.

## Introduction

RFC 8215 defines `64:ff9b:1::/48` as a locally assigned prefix for NAT64 deployments. Unlike the Well-Known Prefix (`64:ff9b::/96`), this prefix is for operator-specific use and is not publicly routable. It allows operators to use multiple NAT64 prefixes or non-standard /96 sub-prefixes within their network.

## Differences from the Well-Known Prefix

| Property | 64:ff9b::/96 (WKP) | 64:ff9b:1::/48 (Local-Use) |
|---|---|---|
| RFC | RFC 6052 | RFC 8215 |
| Scope | Global (well-known) | Local operator use |
| Sub-prefix length | Fixed /96 | Operator chooses /96 sub-blocks |
| DNS64 behavior | Automatic synthesis | Requires explicit DNS64 configuration |
| Routing | Must not be globally routed | Must not be globally routed |

## Using 64:ff9b:1::/48 for Multiple NAT64 Instances

```python
import ipaddress

# Local-use space: 64:ff9b:1::/48

# Operator can carve /96 sub-prefixes for different NAT64 gateways

LOCAL_USE_BLOCK = ipaddress.IPv6Network("64:ff9b:1::/48")

# Allocate /96 sub-prefixes for each NAT64 gateway
gw1_prefix = ipaddress.IPv6Network("64:ff9b:1:1::/96")   # Gateway 1
gw2_prefix = ipaddress.IPv6Network("64:ff9b:1:2::/96")   # Gateway 2
gw3_prefix = ipaddress.IPv6Network("64:ff9b:1:3::/96")   # Gateway 3

def embed_ipv4(nat64_prefix: ipaddress.IPv6Network, ipv4_str: str) -> str:
    """Embed IPv4 into a /96 NAT64 prefix."""
    assert nat64_prefix.prefixlen == 96
    ipv4 = ipaddress.IPv4Address(ipv4_str)
    base = int(nat64_prefix.network_address)
    result = base | int(ipv4)
    return str(ipaddress.IPv6Address(result))

print(embed_ipv4(gw1_prefix, "8.8.8.8"))  # 64:ff9b:1:1::808:808
print(embed_ipv4(gw2_prefix, "8.8.8.8"))  # 64:ff9b:1:2::808:808
```

## DNS64 Configuration for Local-Use Prefix

```bash
# Unbound - configure DNS64 with local-use prefix
# /etc/unbound/unbound.conf
server:
    module-config: "dns64 validator iterator"
    dns64-prefix: 64:ff9b:1:1::/96   # Use local-use prefix, not WKP

# BIND - DNS64 with non-default prefix
# /etc/named.conf
dns64 64:ff9b:1:1::/96 {
    clients { any; };
    exclude { ::ffff:0:0/96; };
    mapped { !10.0.0.0/8; !192.168.0.0/16; any; };
};
```

## NAT64 Gateway with Local-Use Prefix (Jool)

```bash
# Jool NAT64 with local-use prefix
jool instance add "local1" --netfilter --pool6 64:ff9b:1:1::/96

# Add IPv4 pool
jool -i "local1" pool4 add --tcp 198.51.100.0/24 1024-65535
jool -i "local1" pool4 add --udp 198.51.100.0/24 1024-65535

# Route the local-use prefix to this server
ip -6 route add 64:ff9b:1:1::/96 dev eth0
```

## When to Use Local-Use vs WKP

```text
Use 64:ff9b::/96 (WKP) when:
  - Single NAT64 gateway
  - Clients use default DNS64 (no special configuration)
  - IPv4 address space is simple (no RFC1918 exemptions)

Use 64:ff9b:1::/48 (Local-Use) when:
  - Multiple NAT64 gateways with different IPv4 pools
  - Need to translate RFC1918 addresses (WKP excludes these by default)
  - Want clear separation between different NAT64 services
  - Different DSCP/QoS treatment for different NAT64 paths
```

## Conclusion

The local-use prefix `64:ff9b:1::/48` gives operators flexibility to deploy multiple NAT64 gateways with different /96 sub-prefixes, each associated with different IPv4 pools or policies. It is never globally routed. Configure DNS64 explicitly with the chosen sub-prefix and monitor NAT64 session tables and pool utilization with OneUptime.
