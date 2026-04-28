# How to Normalize IPv6 Addresses in Log Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Log Processing, Normalization, Python, Data Pipeline

Description: Normalize IPv6 address representations in log processing pipelines to ensure consistent storage and querying, covering compressed form, IPv4-mapped addresses, and zone IDs.

## Introduction

IPv6 addresses can appear in many forms in log data: full 8-group hex notation, compressed with `::`, IPv4-mapped (`::ffff:192.168.1.1`), with zone IDs (`fe80::1%eth0`), and in URI brackets (`[2001:db8::1]:80`). Without normalization, the same host address can appear as dozens of different strings, breaking deduplication, aggregation, and SIEM correlation. This guide covers normalization techniques for common log pipeline components.

## Canonical IPv6 Normalization

The canonical form is RFC 5952 compressed notation: lowercase, with the longest run of consecutive zero groups replaced by `::`.

```python
#!/usr/bin/env python3
# normalize_ipv6.py

import ipaddress
import re

def normalize_ipv6(raw: str) -> str | None:
    """
    Normalize an IPv6 address string to RFC 5952 canonical form.
    Returns None if the input is not a valid IPv6 address.
    """
    if not raw:
        return None

    # Strip URI brackets: [2001:db8::1]:8080 -> 2001:db8::1
    bracket_match = re.match(r'^\[([0-9a-fA-F:\.]+)\](?::\d+)?$', raw)
    if bracket_match:
        raw = bracket_match.group(1)

    # Strip zone ID: fe80::1%eth0 -> fe80::1
    raw = raw.split('%')[0]

    # Strip leading/trailing whitespace
    raw = raw.strip()

    try:
        return str(ipaddress.IPv6Address(raw))
    except ValueError:
        return None

# Test cases

test_cases = [
    "2001:0DB8:0000:0000:0000:0000:0000:0001",  # Full form
    "2001:db8::1",                               # Already compressed
    "[2001:db8::1]:8080",                        # URI format
    "::FFFF:192.168.1.1",                        # IPv4-mapped (uppercase)
    "fe80::1%eth0",                              # Link-local with zone ID
    "::1",                                       # Loopback
    "192.168.1.1",                               # IPv4 (not IPv6 - returns None)
]

for addr in test_cases:
    result = normalize_ipv6(addr)
    print(f"  {addr!r:45s} -> {result!r}")
```

## Normalization in Vector (VRL)

```toml
[transforms.normalize_ips]
type = "remap"
inputs = ["source"]
source = '''
  # Normalize client_ip field
  if exists(.client_ip) {
    # Strip zone ID
    .client_ip = split(string!(.client_ip), "%")[0]
    # Strip brackets and port
    if starts_with(string!(.client_ip), "[") {
      .client_ip = replace(string!(.client_ip), r'\[([0-9a-fA-F:]+)\](?::\d+)?', "$1")
    }
    # Convert to lowercase
    .client_ip = downcase(string!(.client_ip))
  }
'''
```

## Normalization in Logstash (Ruby filter)

```ruby
# logstash/pipelines/normalize_ipv6.conf

filter {
  ruby {
    code => '
      require "ipaddr"

      ip_field = event.get("client_ip")
      next unless ip_field

      # Strip zone ID
      ip_str = ip_field.split("%").first
      # Strip URI brackets
      ip_str = ip_str.gsub(/^\[|\]$/, "").split("]").first

      begin
        normalized = IPAddr.new(ip_str).to_s
        event.set("client_ip", normalized)
        event.set("ip_version", normalized.include?(":") ? 6 : 4)
      rescue IPAddr::InvalidAddressError
        # Leave as-is if invalid
      end
    '
  }
}
```

## Normalization in Fluent Bit (Lua)

```lua
-- /etc/fluent-bit/normalize_ipv6.lua

function normalize_ip(tag, timestamp, record)
    local ip = record["client_ip"]
    if not ip then return 1, timestamp, record end

    -- Strip zone ID
    ip = ip:match("([^%%]+)")

    -- Strip URI brackets and port
    local bracketed = ip:match("^%[([0-9a-fA-F:%.]+)%]")
    if bracketed then ip = bracketed end

    -- Convert to lowercase
    ip = ip:lower()
    record["client_ip"] = ip

    -- Mark as IPv6 if contains colon
    record["ip_version"] = ip:find(":") and 6 or 4

    return 1, timestamp, record
end
```

## Normalization in Python Log Processor

```python
import ipaddress
import re
from typing import Any

# Pre-compiled regex for URI bracket extraction
BRACKET_RE = re.compile(r'^\[([0-9a-fA-F:.]+)\](?::\d+)?$')

def normalize_log_record(record: dict[str, Any]) -> dict[str, Any]:
    """Normalize all IP address fields in a log record."""
    ip_fields = ['client_ip', 'src_ip', 'dst_ip', 'remote_addr',
                 'xff_ip', 'forwarded_for']

    for field in ip_fields:
        if field in record and record[field]:
            normalized = normalize_ipv6(str(record[field]))
            if normalized:
                record[field] = normalized
                record[f'{field}_version'] = 6 if ':' in normalized else 4

    return record
```

## Conclusion

Normalize IPv6 addresses at the earliest point in the log pipeline - ideally in the log collection agent (Fluent Bit, Vector) rather than at query time. The normalization steps are: strip zone IDs (`%eth0`), extract from URI brackets (`[addr]:port`), strip whitespace, then apply `ipaddress.ip_address()` or equivalent to produce RFC 5952 canonical form. Store the `ip_version` alongside the normalized IP for efficient filtering. Normalizing IPv4-mapped addresses (`::ffff:192.168.1.1`) ensures they are consistently recognized as IPv6 rather than sometimes matching IPv4-only filters.
