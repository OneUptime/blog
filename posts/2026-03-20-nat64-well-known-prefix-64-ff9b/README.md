# How to Understand the NAT64 Well-Known Prefix (64:ff9b::/96)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, NAT64, 64:ff9b, RFC 6052, Transition, DNS64

Description: Understand the NAT64 Well-Known Prefix 64:ff9b::/96 (RFC 6052), how IPv4 addresses are embedded in it, and how DNS64 and NAT64 gateways use it.

## Introduction

The NAT64 Well-Known Prefix `64:ff9b::/96` is defined in RFC 6052. It is used to represent IPv4 addresses as IPv6 addresses, enabling IPv6-only clients to communicate with IPv4-only servers through a NAT64 gateway. The last 32 bits of the /96 prefix hold the embedded IPv4 address.

## Address Construction

```text
64:ff9b::/96 + IPv4 address (32 bits) = IPv6 address

Example:
  IPv4: 93.184.216.34 (example.com)
  Hex: 0x5DB8D822
  IPv6: 64:ff9b::5db8:d822
       = 64:ff9b::93.184.216.34

General formula:
  64:ff9b:0000:0000:0000:0000:XXXX:XXXX
                                   ↑↑↑↑↑↑↑↑
                                   32-bit IPv4 address
```

## Python: Converting IPv4 to NAT64 WKP

```python
import ipaddress

NAT64_WKP = ipaddress.IPv6Network("64:ff9b::/96")

def ipv4_to_nat64_wkp(ipv4_str: str) -> str:
    """Embed an IPv4 address into the NAT64 Well-Known Prefix."""
    ipv4 = ipaddress.IPv4Address(ipv4_str)
    # WKP base as integer (top 96 bits)
    wkp_base = int(NAT64_WKP.network_address)
    # IPv4 as 32-bit integer
    ipv4_int = int(ipv4)
    # Combine
    ipv6_int = wkp_base | ipv4_int
    return str(ipaddress.IPv6Address(ipv6_int))

def nat64_wkp_to_ipv4(ipv6_str: str) -> str:
    """Extract IPv4 address from a NAT64 WKP address."""
    ipv6 = ipaddress.IPv6Address(ipv6_str)
    if ipaddress.IPv6Address(ipv6_str) not in NAT64_WKP:
        raise ValueError(f"{ipv6_str} is not in 64:ff9b::/96")
    # Last 32 bits = IPv4
    ipv4_int = int(ipv6) & 0xFFFFFFFF
    return str(ipaddress.IPv4Address(ipv4_int))

# Tests

print(ipv4_to_nat64_wkp("93.184.216.34"))   # 64:ff9b::5db8:d822
print(ipv4_to_nat64_wkp("8.8.8.8"))         # 64:ff9b::808:808
print(nat64_wkp_to_ipv4("64:ff9b::808:808"))# 8.8.8.8
```

## DNS64 Synthesizing AAAA Records

```bash
# DNS64 (BIND or Unbound) synthesizes AAAA records from A records:
# Query: example.com AAAA
# No AAAA record exists
# DNS64 fetches A record: 93.184.216.34
# DNS64 synthesizes: 64:ff9b::5db8:d822
# Returns AAAA: 64:ff9b::5db8:d822

# Verify DNS64 synthesis
dig AAAA example.com @[::1]
# Should return: 64:ff9b::5db8:d822

# Confirm NAT64 gateway handles the prefix
ping6 64:ff9b::808:808   # Should reach 8.8.8.8 via NAT64
```

## NAT64 Gateway Configuration (Jool)

```bash
# Install Jool (stateful NAT64)
apt-get install jool-tools

# Load Jool kernel module
modprobe jool

# Create NAT64 instance using WKP
jool instance add "default" --netfilter --pool6 64:ff9b::/96

# Add IPv4 pool for outgoing connections
jool -i "default" pool4 add --tcp 203.0.113.0/24 1-65535
jool -i "default" pool4 add --udp 203.0.113.0/24 1-65535
jool -i "default" pool4 add --icmp 203.0.113.0/24

# Verify
jool -i "default" instance display
jool -i "default" session display --tcp
```

## Filtering the WKP at Network Boundaries

```bash
# Block 64:ff9b::/96 at external interfaces
# (NAT64 traffic should not leave your network)
ip6tables -A FORWARD -d 64:ff9b::/96 -o eth-external -j DROP
ip6tables -A FORWARD -s 64:ff9b::/96 -i eth-external -j DROP
```

## Conclusion

The NAT64 Well-Known Prefix `64:ff9b::/96` embeds IPv4 addresses in the last 32 bits. DNS64 synthesizes AAAA records pointing to this prefix, and a NAT64 gateway translates packets. Never route 64:ff9b::/96 externally. Monitor NAT64 session counts and pool exhaustion with OneUptime to ensure IPv6-only clients can reach IPv4 services.
