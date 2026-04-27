# How to Parse IPv6 Addresses in Python - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Ipaddress, Parsing, Networking

Description: Parse, manipulate, and analyze IPv6 addresses in Python using the built-in ipaddress module, covering address normalization, prefix extraction, and type detection.

## Python ipaddress Module

The `ipaddress` module (Python 3.3+) is the standard library for IPv6 parsing.

```python
import ipaddress

# Parse a single IPv6 address

addr = ipaddress.ip_address("2001:db8::1")
print(addr)                   # 2001:db8::1 (normalized)
print(addr.compressed)        # 2001:db8::1 (shortest form)
print(addr.exploded)          # 2001:0db8:0000:0000:0000:0000:0000:0001
print(addr.version)           # 6
print(int(addr))              # integer representation

# Parse various formats
addresses = [
    "2001:0db8:0000:0000:0000:0000:0000:0001",  # full form
    "2001:db8::1",                               # compressed
    "2001:DB8::1",                               # uppercase (normalized)
    "::1",                                       # loopback
    "fe80::1",                                   # link-local
    "::ffff:192.0.2.1",                         # IPv4-mapped
]

for s in addresses:
    a = ipaddress.ip_address(s)
    print(f"{s!r} -> {a.compressed}")
```

## Address Type Detection

```python
import ipaddress

def classify_ipv6(addr_str):
    """Classify an IPv6 address by type."""
    try:
        addr = ipaddress.ip_address(addr_str)
    except ValueError:
        return "invalid"

    if addr.version != 6:
        return "ipv4"

    # Note: is_private for IPv6 covers more than just ULA (it includes the
    # documentation range, unspecified, and IPv4-mapped when the embedded
    # IPv4 is private), so check the more specific cases first and use an
    # explicit fc00::/7 membership test for ULA.
    if addr.is_unspecified:    return "unspecified (::)"
    if addr.is_loopback:       return "loopback (::1)"
    if addr.ipv4_mapped:       return f"IPv4-mapped (::ffff:{addr.ipv4_mapped})"
    if addr.is_link_local:     return "link-local (fe80::/10)"
    if addr.is_multicast:      return "multicast (ff00::/8)"
    if addr in ipaddress.ip_network("fc00::/7"):
        return "ULA (fc00::/7)"
    if addr.is_global:         return "global unicast"
    return "other"

tests = ["::1", "fe80::1", "fd00::1", "2001:db8::1",
         "ff02::1", "::", "::ffff:192.0.2.1"]
for t in tests:
    print(f"{t:30s} -> {classify_ipv6(t)}")
```

## Parsing IPv6 Networks/Prefixes

```python
import ipaddress

# Parse a prefix
net = ipaddress.ip_network("2001:db8::/32")
print(net.network_address)    # 2001:db8::
print(net.prefixlen)          # 32
print(net.num_addresses)      # 79228162514264337593543950336

# Check if address is in network
addr = ipaddress.ip_address("2001:db8::1")
print(addr in net)            # True

# Subnets - split a /32 into /48s
subnets_48 = list(net.subnets(new_prefix=48))
print(f"Number of /48s in a /32: {len(subnets_48)}")
print(f"First /48: {subnets_48[0]}")
print(f"Last  /48: {subnets_48[-1]}")

# Get prefix for a specific subscriber (IPAM-like)
def get_subscriber_prefix(base_net, subscriber_id, prefix_len=56):
    """Get a /56 prefix for subscriber by ID."""
    subnets = list(base_net.subnets(new_prefix=prefix_len))
    return subnets[subscriber_id % len(subnets)]

base = ipaddress.ip_network("2001:db8::/40")
for sid in [0, 1, 100, 255]:
    print(f"Subscriber {sid}: {get_subscriber_prefix(base, sid)}")
```

## Parsing from Logs

Extract and normalize IPv6 addresses from log lines.

```python
import re
import ipaddress

# IPv6 regex (handles full and compressed forms).
# Order matters: try the most specific alternatives first so the engine
# does not commit to a shorter match (e.g. "2001:db8::" before "2001:db8::1").
# \b can't be used as a boundary because it does not match between two
# non-word chars (e.g. between a space and a leading "::"), so we use
# explicit lookarounds that exclude word chars, ":", and ".".
IPV6_PATTERN = re.compile(
    r'(?<![\w:.])(?:'
    r'::(?:[fF]{4}(?::0{1,4})?:)?(?:25[0-5]|(?:2[0-4]|1?\d)?\d)'
    r'(?:\.(?:25[0-5]|(?:2[0-4]|1?\d)?\d)){3}|'              # IPv4-mapped
    r'(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|'             # full
    r'(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|'          # x::x
    r'(?:[0-9a-fA-F]{1,4}:){1,7}:|'                          # x::
    r':(?::[0-9a-fA-F]{1,4}){1,7}'                           # ::x
    r')(?![\w:.])'
)

log_lines = [
    "2026-03-20 12:00:01 Connection from 2001:db8::1 port 54321",
    "2026-03-20 12:00:02 Failed login from ::ffff:192.0.2.1",
    "2026-03-20 12:00:03 Access: fe80::1%eth0 (ignored)",
]

def extract_normalize_ipv6(log_line):
    """Extract and normalize first IPv6 address from log line."""
    matches = IPV6_PATTERN.findall(log_line)
    results = []
    for m in matches:
        # Remove zone ID (%eth0) if present
        m_clean = m.split('%')[0]
        try:
            normalized = str(ipaddress.ip_address(m_clean))
            results.append(normalized)
        except ValueError:
            pass
    return results

for line in log_lines:
    addrs = extract_normalize_ipv6(line)
    print(f"Line: {line[:50]!r}")
    print(f"  Found: {addrs}")
```

## Interface Addresses with Zone IDs

```python
import ipaddress

# Zone ID handling (fe80::1%eth0)
raw = "fe80::1%eth0"
zone_id = None

if '%' in raw:
    addr_str, zone_id = raw.split('%', 1)
else:
    addr_str = raw

addr = ipaddress.ip_address(addr_str)
print(f"Address: {addr}")
print(f"Zone ID: {zone_id}")
print(f"Is link-local: {addr.is_link_local}")

# Reconstruct with zone ID for socket use
def format_for_socket(addr, zone_id=None):
    """Format IPv6 address for use in socket calls."""
    s = str(addr)
    if zone_id:
        return f"{s}%{zone_id}"
    return s

print(format_for_socket(addr, zone_id))   # fe80::1%eth0
```

## Conclusion

Python's built-in `ipaddress` module handles all IPv6 parsing needs: `ipaddress.ip_address()` normalizes any valid IPv6 representation, `ipaddress.ip_network()` parses prefixes and supports subnet enumeration, and address type properties (`is_loopback`, `is_link_local`, `is_global`, `ipv4_mapped`) classify addresses without manual bit-checking. Use a compiled regex to extract IPv6 addresses from log files, then normalize through `ipaddress.ip_address()` to ensure consistent compressed form. Strip zone IDs (`%eth0`) before parsing, and preserve them separately for socket API calls that require them.
