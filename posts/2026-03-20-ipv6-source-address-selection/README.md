# How IPv6 Source Address Selection Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Source Address Selection, RFC 6724, Gai.conf, Routing, Multi-homing

Description: Understand and configure IPv6 source address selection (RFC 6724) to control which IPv6 address is used as the source for outbound connections.

## Introduction

When a host has multiple IPv6 addresses and initiates a connection, the kernel must choose which address to use as the source. RFC 6724 defines a preference algorithm that considers address scope, prefix matching, stability, and other factors. Misconfigured source address selection leads to broken connections, SMTP rejections, and policy routing failures.

## Understanding RFC 6724 Address Selection Rules

```text
RFC 6724 Selection Rules (applied in order):
1. Prefer same address (src == dst)
2. Prefer appropriate scope (link-local for link-local, etc.)
3. Avoid deprecated addresses
4. Prefer home addresses (Mobile IPv6)
5. Prefer outgoing interface
5.5 Prefer addresses in a prefix advertised by the next-hop
6. Prefer matching label
7. Prefer temporary addresses (RFC 4941) unless policy says otherwise
8. Use longest matching prefix
```

## Step 1: Check What Source Address is Selected

```bash
# Check which source address would be used for a destination

ip -6 route get 2001:db8::1

# Example output:
# 2001:db8::1 from :: via fe80::1 dev eth0 src 2001:db8:a::100

# The "src" field shows the selected source address

# Check for specific destination
ip -6 route get 2001:4860:4860::8888
ip -6 route get 2606:4700:4700::1111
```

## Step 2: List Available IPv6 Addresses

```bash
# Show all global addresses with their properties
ip -6 addr show scope global

# Example output with multiple addresses:
# inet6 2001:db8:a::100/64 scope global mngtmpaddr noprefixroute
# inet6 fd00::100/64 scope global
# inet6 2001:db8:b::200/64 scope global deprecated

# Flags that affect selection:
# deprecated  - address is expiring, prefer not to use
# temporary   - privacy address (RFC 4941)
# mngtmpaddr  - managed by kernel for privacy addresses
```

## Step 3: Configure Source Address with Routes

```bash
# Prefer a specific source address for a destination
sudo ip -6 route add 2001:db8::/32 \
    via fe80::1 dev eth0 src 2001:db8:a::100

# Use a dedicated routing table whose routes prefer a specific source
# The rule picks the table; the route's "src" sets the preferred source
sudo ip -6 route add default \
    via fe80::1 dev eth0 src 2001:db8:a::100 table 100
sudo ip -6 rule add to 2001:db8::/32 table 100 priority 1000

# Bind an application to a specific source address
curl --interface 2001:db8:a::100 -6 https://example.com
ssh -6 -b 2001:db8:a::100 user@remote.example.com
```

## Step 4: Configure /etc/gai.conf

```bash
# /etc/gai.conf controls getaddrinfo() destination sorting
# It does not directly configure the kernel's source-address algorithm

# View current configuration
cat /etc/gai.conf

# On Linux, kernel address labels used for source selection are separate
ip addrlabel list

# Common configurations:

# Prefer IPv4 destinations over IPv6 when both are returned
# Add to /etc/gai.conf:
# precedence ::ffff:0:0/96  100

# If you add any "precedence" or "label" lines, you replace the default table
# so keep the defaults you still want.

# Show what getaddrinfo returns for a host
python3 -c "
import socket
results = socket.getaddrinfo('google.com', 443)
for r in results[:5]:
    print(r[0].name, r[4])
"
```

## Step 5: Control Privacy Extensions

```bash
# Privacy extensions (RFC 4941) generate temporary addresses
# that are preferred for outbound connections

# Check if privacy addresses are enabled
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
# 0 = disabled
# 1 = generate temp addresses but prefer public
# 2 = generate temp addresses and PREFER temp (RFC 4941)

# Enable privacy addresses
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# Disable temporary addresses and use non-temporary addresses only
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=0

# RFC 7217 stable addresses for link-local and SLAAC/autoconf addresses
sudo sysctl -w net.ipv6.conf.eth0.addr_gen_mode=3
```

## Step 6: Debug Source Address Selection

```python
#!/usr/bin/env python3
"""Debug IPv6 source address selection."""

import subprocess

def get_source_for_destination(dest_addr):
    """Find which source address would be used to reach dest_addr."""
    result = subprocess.run(
        ['ip', '-6', 'route', 'get', dest_addr],
        capture_output=True, text=True
    )
    parts = result.stdout.split()
    if 'src' in parts:
        src_idx = parts.index('src')
        if src_idx + 1 < len(parts):
            return parts[src_idx + 1]
    return None

# Test source selection for different destinations
destinations = [
    '2001:4860:4860::8888',  # Google DNS
    '2606:4700:4700::1111',  # Cloudflare DNS
    '2001:db8::1',            # Example
]

for dest in destinations:
    src = get_source_for_destination(dest)
    print(f"Destination: {dest}")
    print(f"  Source: {src or 'not determined'}")
    print()
```

## Conclusion

IPv6 source address selection follows RFC 6724 rules, with the kernel choosing based on address scope, labels, prefix matching, and stability. Use `ip -6 route get <dest>` to see which source address would be selected for any destination. Control selection with `ip -6 route add ... src <addr>` for route-based preferences, use `/etc/gai.conf` to adjust destination ordering returned by `getaddrinfo()`, and use `ip addrlabel` on Linux for address-label policy. Privacy extensions (use_tempaddr=2) cause temporary addresses to be preferred for outbound connections - useful for privacy but can cause issues if upstream filters block non-registered source addresses.
