# How to Parse IPv6 Addresses in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Parsing, Ipaddress, Networking, Programming

Description: Parse IPv6 addresses from various formats in Python using the ipaddress module, regex, and handling edge cases like zone IDs and embedded IPv4.

## Basic Parsing with ipaddress

The simplest way to parse IPv6 addresses in Python:

```python
import ipaddress

def parse_ipv6(address: str) -> ipaddress.IPv6Address | None:
    """Parse an IPv6 address string, returning None if invalid."""
    try:
        return ipaddress.IPv6Address(address)
    except ValueError:
        return None

# Examples

addresses = [
    "2001:db8::1",
    "2001:0db8:0000:0000:0000:0000:0000:0001",  # Expanded
    "::1",          # Loopback
    "fe80::1",      # Link-local
    "::",           # Unspecified
    "invalid-addr", # Invalid - returns None
]

for addr_str in addresses:
    result = parse_ipv6(addr_str)
    if result:
        print(f"Parsed: {result.compressed}")
    else:
        print(f"Invalid: {addr_str}")
```

## Parsing IPv6 with Prefix Length

Parse CIDR notation (address with prefix length):

```python
import ipaddress

def parse_ipv6_with_prefix(cidr: str) -> tuple:
    """
    Parse an IPv6 address with prefix length.
    Returns (IPv6Interface, network) tuple.
    """
    iface = ipaddress.IPv6Interface(cidr)
    return (iface.ip, iface.network)

# Parse interface address
addr, network = parse_ipv6_with_prefix("2001:db8:1::100/64")
print(f"Host:    {addr}")        # 2001:db8:1::100
print(f"Network: {network}")     # 2001:db8:1::/64
```

## Handling Zone IDs (Link-Local Scope)

IPv6 link-local addresses often include a zone ID (e.g., `fe80::1%eth0`). Since Python 3.9, the `ipaddress` module supports zone IDs directly and exposes them via the `scope_id` attribute:

```python
import ipaddress

def parse_ipv6_with_zone(address: str) -> tuple:
    """
    Parse an IPv6 address that may include a zone ID.
    Returns (IPv6Address, zone_id) tuple.
    """
    addr = ipaddress.IPv6Address(address)
    return (addr, addr.scope_id)

# Example with zone ID
addr, zone = parse_ipv6_with_zone("fe80::1%eth0")
print(f"Address: {addr}, Zone: {zone}")   # Address: fe80::1%eth0, Zone: eth0
```

## Parsing IPv4-Mapped IPv6 Addresses

IPv4-mapped addresses have the form `::ffff:192.0.2.1`:

```python
import ipaddress

def parse_ipv4_mapped(address: str) -> str | None:
    """
    Check if an IPv6 address is IPv4-mapped and extract the IPv4 part.
    """
    addr = ipaddress.IPv6Address(address)
    if addr.ipv4_mapped is not None:
        return str(addr.ipv4_mapped)
    return None

# Test
mapped = "::ffff:192.0.2.1"
ipv4 = parse_ipv4_mapped(mapped)
print(f"IPv4 mapped address: {ipv4}")   # 192.0.2.1
```

## Parsing IPv6 from URLs

IPv6 addresses in URLs are enclosed in brackets:

```python
import ipaddress
import urllib.parse
import re

def parse_ipv6_from_url(url: str) -> ipaddress.IPv6Address | None:
    """Extract and parse IPv6 address from a URL."""
    parsed = urllib.parse.urlparse(url)
    hostname = parsed.hostname  # urllib handles the bracket removal

    if hostname:
        try:
            addr = ipaddress.IPv6Address(hostname)
            return addr
        except ValueError:
            return None
    return None

# Examples
urls = [
    "https://[2001:db8::1]:8080/path",
    "http://[::1]/admin",
    "https://example.com",  # Not IPv6
]

for url in urls:
    result = parse_ipv6_from_url(url)
    print(f"{url} → {result}")
```

## Parsing Multiple Addresses from Text

Extract all IPv6 addresses from a block of text (e.g., log files):

```python
import ipaddress
import re

# IPv6 regex pattern (simplified - handles most cases)
IPV6_PATTERN = re.compile(
    r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|'              # full 8-group form
    r'\b(?:[0-9a-fA-F]{1,4}:){1,7}(?::[0-9a-fA-F]{1,4}){1,7}\b|'  # :: in the middle
    r'\b(?:[0-9a-fA-F]{1,4}:){1,7}:|'                              # ends with ::
    r'::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}\b|'             # starts with ::
    r'::'                                                           # just ::
)

def extract_ipv6_addresses(text: str) -> list[ipaddress.IPv6Address]:
    """Extract valid IPv6 addresses from text."""
    candidates = IPV6_PATTERN.findall(text)
    valid = []
    for candidate in candidates:
        try:
            valid.append(ipaddress.IPv6Address(candidate))
        except ValueError:
            pass
    return valid

# Test with log output
log_line = "Connection from 2001:db8::1 to 2001:4860:4860::8888 on port 443"
addresses = extract_ipv6_addresses(log_line)
for addr in addresses:
    print(addr)
```

## Conclusion

Python's `ipaddress` module handles most IPv6 parsing needs cleanly. For edge cases like zone IDs in link-local addresses or URL bracket notation, strip the extra characters before passing to `IPv6Address()`. For log parsing, a regex pre-filter followed by `IPv6Address()` validation gives reliable results.
