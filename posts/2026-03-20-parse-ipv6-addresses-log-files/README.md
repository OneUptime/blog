# How to Parse IPv6 Addresses from Log Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Logging, Parsing, Regex, Python, Log Analysis

Description: Parse and extract IPv6 addresses from various log file formats using regex patterns, Python, and common log processing tools like awk and sed.

## Introduction

IPv6 addresses appear in many formats in log files: full notation, compressed notation, and IPv4-mapped IPv6 addresses. Parsing them reliably requires understanding IPv6 address syntax and using appropriate regex patterns. This guide covers patterns for various log formats and programming approaches.

## IPv6 Address Formats in Logs

IPv6 addresses can appear in several forms:
- **Full**: `2001:0db8:0000:0000:0000:0000:0000:0001`
- **Compressed**: `2001:db8::1`
- **Link-local**: `fe80::1%eth0` (with zone ID)
- **In URI/URL**: `[2001:db8::1]:8080`
- **IPv4-mapped**: `::ffff:192.168.1.1`

## Regex Patterns for IPv6 Addresses

```python
#!/usr/bin/env python3
# ipv6_regex.py

# Regex patterns for extracting IPv6 addresses from logs

import re

# Complete IPv6 address regex (handles all valid forms)
# This is the most comprehensive but complex pattern
IPV6_FULL_PATTERN = r"""
(?:
    # Full IPv6 (8 groups of hex, colon-separated)
    (?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}
|
    # IPv6 with :: compression
    (?:[0-9a-fA-F]{1,4}:){1,7}:
|
    (?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}
|
    (?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}
|
    (?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}
|
    (?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}
|
    (?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}
|
    [0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}
|
    :(?::[0-9a-fA-F]{1,4}){1,7}
|
    ::
)
"""

# Practical simplified pattern (handles common cases)
IPV6_SIMPLE = r'(?:[0-9a-fA-F]{1,4}:){1,7}(?:[0-9a-fA-F]{1,4}|:)|::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}'

# Extract IPv6 from URI (in brackets)
IPV6_IN_URI = r'\[([0-9a-fA-F:]+)\](?::\d+)?'

def extract_ipv6_addresses(text: str) -> list:
    """Extract all IPv6 addresses from text."""
    # First try to extract from URI format [addr]:port
    uri_matches = re.findall(IPV6_IN_URI, text)

    # Then try bare IPv6 addresses
    bare_matches = re.findall(IPV6_SIMPLE, text, re.VERBOSE)

    return list(set(uri_matches + bare_matches))

# Test with sample log lines
sample_logs = [
    "2026-01-01 10:00:00 Client [2001:db8::1]:54321 GET /api/v1/data 200",
    "Connection from 2001:db8:1:1:a1b2:c3d4:e5f6:7890 port 54321",
    "WARN fe80::1 attempted to connect to blocked port 22",
    "Remote addr: ::1 (loopback)",
    "IPv4-mapped: ::ffff:192.168.1.1 connected",
]

for log in sample_logs:
    addrs = extract_ipv6_addresses(log)
    print(f"Log: {log[:50]}...")
    print(f"  Found: {addrs}")
```

## Parsing Nginx Logs with IPv6

Nginx logs IPv6 clients differently than IPv4:

```bash
# Nginx access log with IPv6 clients:
# 2001:db8::1 - - [19/Mar/2026:10:00:00 +0000] "GET /path HTTP/2" 200 1234
# [2001:db8::1]:54321 - - [19/Mar/2026] "POST /api" 201 500

# Extract IPv6 source IPs from Nginx access log
grep -oP '(?<=\[)[0-9a-fA-F:]+(?=\])' /var/log/nginx/access.log | sort | uniq -c | sort -rn

# Or using awk for nginx combined log format
awk '{
    ip = $1
    # Remove brackets if present
    gsub(/[\[\]]/, "", ip)
    print ip
}' /var/log/nginx/access.log | grep ":" | sort | uniq -c | sort -rn | head -20
```

## Parsing Apache Logs

```bash
# Apache access log IPv6 parsing
# Apache logs IPv6 addresses without brackets in the access log

# Count requests by IPv6 source
awk '{print $1}' /var/log/apache2/access.log | \
    grep -E "^[0-9a-fA-F:]+$" | \
    sort | uniq -c | sort -rn | head -20

# Filter only global unicast IPv6 addresses (start with 2 or 3)
grep -oP '\b[23][0-9a-fA-F]{0,3}(?::[0-9a-fA-F]{0,4}){2,7}\b' /var/log/apache2/access.log
```

## Python Script: Parse IPv6 from Syslog

```python
#!/usr/bin/env python3
# parse_syslog_ipv6.py
# Extract and analyze IPv6 addresses from syslog

import re
import sys
from collections import Counter

IPV6_PATTERN = re.compile(
    r'\b(?:[0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}\b|'
    r'\b(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}\b|'
    r'\b(?:[0-9a-fA-F]{1,4}:){1,7}:\b|'
    r'\b::1\b|'
    r'\bfe80:[^\s/]+\b'
)

def parse_log_file(filename: str) -> Counter:
    """Parse IPv6 addresses from a syslog file."""
    ipv6_counter = Counter()

    with open(filename) as f:
        for line in f:
            matches = IPV6_PATTERN.findall(line)
            ipv6_counter.update(matches)

    return ipv6_counter

def main():
    log_file = sys.argv[1] if len(sys.argv) > 1 else "/var/log/syslog"
    counter = parse_log_file(log_file)

    print(f"Top IPv6 addresses in {log_file}:")
    for addr, count in counter.most_common(20):
        print(f"  {count:6d}  {addr}")

main()
```

## Normalizing IPv6 Addresses

Different log sources may produce the same address in different formats. Normalize before comparing:

```python
import ipaddress

def normalize_ipv6(addr_str: str) -> str:
    """Normalize an IPv6 address string to compressed canonical form."""
    try:
        # Remove zone ID if present (e.g., fe80::1%eth0)
        addr_str = addr_str.split('%')[0]
        # Remove brackets if present
        addr_str = addr_str.strip('[]')
        return str(ipaddress.ip_address(addr_str))
    except ValueError:
        return addr_str  # Return as-is if not a valid address

# Examples
print(normalize_ipv6("2001:0db8:0000:0000:0000:0000:0000:0001"))  # 2001:db8::1
print(normalize_ipv6("[2001:db8::1]"))  # 2001:db8::1
print(normalize_ipv6("::FFFF:192.168.1.1"))  # ::ffff:c0a8:101
```

## Conclusion

Parsing IPv6 addresses from log files requires regex patterns that handle the diverse formats IPv6 addresses appear in, including compressed form, URI bracket notation, link-local addresses with zone IDs, and IPv4-mapped addresses. Python's `ipaddress` module is invaluable for normalizing addresses to a canonical form before analysis or storage. Always normalize IPv6 addresses before deduplication or comparison to avoid treating the same address in different forms as distinct entries.
