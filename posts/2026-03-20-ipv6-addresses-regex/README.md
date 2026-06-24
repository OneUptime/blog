# How to Handle IPv6 Addresses in Regular Expressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Regex, Regular Expression, Validation, Programming, Pattern Matching

Description: Write and use regular expressions to match, validate, and extract IPv6 addresses from text, logs, and user input, handling all valid IPv6 formats.

## Introduction

Writing a regex to match IPv6 addresses is notoriously complex due to the many valid shorthand forms, optional zone IDs, and bracket notation for URLs. This guide provides tested patterns for common use cases and explains when to use parsing libraries instead of regex.

## Why IPv6 Regex is Hard

A single IPv6 address has many valid representations:
```text
2001:0db8:0000:0000:0000:0000:0000:0001  # Full
2001:db8::1                              # Double colon compressed
::1                                      # Loopback
::                                       # All zeros
2001:db8:0:0:0:0:0:1                    # Partial compression
::ffff:192.168.1.1                       # IPv4-mapped
```

## Recommended Approach: Use Parsing Libraries

For validation, always prefer parsing libraries over regex:

```python
# Python: ipaddress module (no regex needed)

import ipaddress

def is_ipv6(s):
    try:
        ipaddress.IPv6Address(s)
        return True
    except ValueError:
        return False
```

## Practical Regex Patterns

### Pattern 1: Match IPv6 in Logs (Non-Strict)

For extracting IPv6-like strings from logs and text:

```python
import re

# Matches most IPv6 addresses (non-exhaustive but practical for logs)
IPV6_PATTERN = r'[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}'

# Usage in log parsing
log_line = '2001:db8::1 - - [19/Mar/2026] "GET / HTTP/1.1" 200'
match = re.search(IPV6_PATTERN, log_line)
if match:
    print(f"Found IPv6: {match.group()}")
```

### Pattern 2: Extract IPv6 from URLs (with Brackets)

```python
import re

# Loose match for bracketed IPv6 literals in URLs.
# URI zone IDs use %25 inside the brackets, not a bare %.
IPV6_IN_URL_PATTERN = r'\[([0-9A-Fa-f:.]+(?:%25(?:[0-9A-Za-z._~-]|%[0-9A-Fa-f]{2})+)?)\](?::\d+)?'

urls = [
    'http://[2001:db8::1]:8080/api',
    'https://[::1]/admin',
    'http://example.com:80/',
]

for url in urls:
    match = re.search(IPV6_IN_URL_PATTERN, url)
    if match:
        print(f"IPv6 in URL: {match.group(1)}")
```

### Pattern 3: Comprehensive IPv6 Validation Regex

```python
import re

# Comprehensive pattern based on the RFC 3986 ABNF for IPv6 text forms,
# plus an optional RFC 4007-style %zone suffix.
H16 = r'[0-9A-Fa-f]{1,4}'
IPV4_SEG = r'(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)'
IPV4_ADDR = rf'(?:{IPV4_SEG}\.){{3}}{IPV4_SEG}'
LS32 = rf'(?:{H16}:{H16}|{IPV4_ADDR})'

IPV6_FULL_PATTERN = re.compile(rf"""
    ^(?:
        (?:{H16}:){{6}}{LS32}
        | ::(?:{H16}:){{5}}{LS32}
        | (?:{H16})?::(?:{H16}:){{4}}{LS32}
        | (?:(?:{H16}:){{0,1}}{H16})?::(?:{H16}:){{3}}{LS32}
        | (?:(?:{H16}:){{0,2}}{H16})?::(?:{H16}:){{2}}{LS32}
        | (?:(?:{H16}:){{0,3}}{H16})?::{H16}:{LS32}
        | (?:(?:{H16}:){{0,4}}{H16})?::{LS32}
        | (?:(?:{H16}:){{0,5}}{H16})?::{H16}
        | (?:(?:{H16}:){{0,6}}{H16})?::
    )(?:%[^%]+)?$
""", re.VERBOSE)

# Test
test_addrs = ['2001:db8::1', '::1', '::', '::ffff:192.168.1.1',
              '::13.1.68.3', 'fe80::1%eth0', 'not-valid',
              '192.168.1.1', '2001:db8:0:0:0:0:0:1']

for addr in test_addrs:
    valid = bool(IPV6_FULL_PATTERN.fullmatch(addr))
    print(f"{addr}: {valid}")
```

### Pattern 4: Extract IPv4 and IPv6-Like Strings from Text

```python
import re

def extract_ips(text: str) -> dict[str, list[str]]:
    """Extract IPv4 addresses and IPv6-like strings from text."""
    # Simple but effective for log extraction, not full validation
    ipv6_re = re.compile(
        r'(?<![:\w])(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(?![:\w])'
    )
    ipv4_re = re.compile(
        r'\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b'
    )

    ipv6_matches = ipv6_re.findall(text)
    ipv4_matches = ipv4_re.findall(text)

    return {
        'ipv6': [m for m in ipv6_matches if ':' in m],
        'ipv4': ipv4_matches
    }

log_text = """
192.168.1.1 accessed /api at 2001:db8::1:8080 from 10.0.0.5
Rejected connection from 2001:db8:bad::1 at ::1
"""
result = extract_ips(log_text)
print("IPv6:", result['ipv6'])
print("IPv4:", result['ipv4'])
```

## Nginx/Apache Log Parsing with IPv6

```bash
# Extract IPv6 addresses from nginx logs using grep regex
grep -oE '([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}' /var/log/nginx/access.log | \
    sort | uniq -c | sort -rn | head -20

# Extract unique IPv6 addresses only (must contain 2+ colons)
grep -oE '[0-9a-fA-F:]{3,40}' /var/log/nginx/access.log | \
    grep '.*:.*:' | sort -u
```

## When to Use Regex vs Libraries

| Use Case | Recommendation |
|----------|---------------|
| User input validation | Use `ipaddress` / `netip.ParseAddr` |
| Log parsing/extraction | Regex is fine (loose matching) |
| Security-critical validation | Always use parsing library |
| Database insertion | Parse and normalize first |
| Display/masking | Regex for extraction is acceptable |

## Conclusion

IPv6 regex patterns are complex and error-prone for strict validation. For input validation and security decisions, always use language-native IP parsing libraries. Reserve regex for extracting IPv6 patterns from unstructured text like logs, where perfect accuracy is less critical. The non-strict extraction pattern `[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}` is useful for many log analysis tasks, but it is intentionally looser than a full validator.
