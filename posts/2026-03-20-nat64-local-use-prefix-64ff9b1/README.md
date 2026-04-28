# How to Understand the NAT64 Local-Use Prefix (64:ff9b:1::/48) - 64ff9b1

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NAT64, IPv6, Local-Use, RFC 8215, Networking, Transition

Description: Understand the NAT64 local-use prefix 64:ff9b:1::/48 (RFC 8215) that provides a non-globally-routable alternative to the well-known NAT64 prefix for private network use.

## Introduction

RFC 8215 defines `64:ff9b:1::/48` as a local-use NAT64 prefix. Unlike the well-known prefix `64:ff9b::/96`, this block is explicitly non-globally-routable and intended for use within organizations. This prevents conflicts when multiple NAT64 deployments need different prefixes.

## Differences Between 64:ff9b::/96 and 64:ff9b:1::/48

| Property | 64:ff9b::/96 | 64:ff9b:1::/48 |
|---|---|---|
| RFC | RFC 6052 | RFC 8215 |
| Globally routable | No | No |
| Prefix length | /96 | /48 (more flexible) |
| Scope | Internet-wide standard | Local use only |
| DNS64 support | Yes (default) | Yes (configurable) |

## Why a Local-Use Prefix?

The `64:ff9b:1::/48` prefix provides a larger allocation from which operators can carve /96 subnets for their specific NAT64 deployments, avoiding dependency on the single well-known prefix.

```text
64:ff9b:1::/48 can host:
  64:ff9b:1:0000::/96   - NAT64 for VLAN A
  64:ff9b:1:0001::/96   - NAT64 for VLAN B
  64:ff9b:1:0002::/96   - NAT64 for VLAN C
  ... up to 2^48 /96 deployments
```

## Address Synthesis with Local-Use Prefix

```python
import ipaddress

def synthesize_nat64_local(ipv4: str, subnet: int = 0) -> str:
    """
    Synthesize a local-use NAT64 address.
    subnet: which /96 within 64:ff9b:1::/48 to use
    """
    base = ipaddress.IPv6Address(f"64:ff9b:1:{subnet:x}::")
    base_int = int(base)
    v4_int = int(ipaddress.IPv4Address(ipv4))
    return str(ipaddress.IPv6Address(base_int | v4_int))

# Site A uses subnet 0

print(synthesize_nat64_local("8.8.8.8", subnet=0))
# 64:ff9b:1::808:808

# Site B uses subnet 1
print(synthesize_nat64_local("8.8.8.8", subnet=1))
# 64:ff9b:1:1::808:808
```

## Configuring DNS64 with Local-Use Prefix

```bash
# BIND named.conf.options - using local-use prefix
options {
    # Use local-use prefix instead of well-known
    dns64 64:ff9b:1::/96 {
        clients { 2001:db8:cafe::/48; };
        mapped { !10.0.0.0/8; !172.16.0.0/12; !192.168.0.0/16; any; };
    };
};
```

## Configuring Jool with Local-Use Prefix

```bash
# Jool NAT64 with local-use prefix
sudo jool global update pool6 64:ff9b:1::/96

# Note: only one /96 active at a time per Jool instance
# For multiple subnets, run multiple Jool instances
```

## Routing the Local-Use Prefix

```bash
# Advertise the local-use prefix internally (NOT to the internet)
# BGP: advertise 64:ff9b:1::/48 to internal ASes only

# ip6tables: ensure it doesn't leak to internet
ip6tables -A FORWARD \
  -d 64:ff9b:1::/48 \
  -o eth0-external \
  -j DROP

# Route the prefix to the NAT64 gateway
ip -6 route add 64:ff9b:1::/48 via 2001:db8::1
```

## Conclusion

The `64:ff9b:1::/48` local-use prefix provides organizational flexibility for NAT64 deployments. Use it instead of the well-known prefix when you need multiple independent NAT64 deployments or want to ensure prefixes are explicitly non-globally-routable. Monitor NAT64 health across all /96 subnets with OneUptime's connectivity probes.
