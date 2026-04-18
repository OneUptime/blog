# How to Validate IPv4 Addresses Using Regex in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Regex, IPv4, Validation, Re module, Networking

Description: Learn how to validate IPv4 address strings using regular expressions in Python, with progressively stricter patterns and best practices.

## Simple Pattern (Not Sufficient for Production)

```python
import re

# Naive pattern: 4 groups of 1-3 digits separated by dots

# Does NOT validate octet range (0-255)
NAIVE_IPV4 = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")

def is_ipv4_naive(s: str) -> bool:
    return bool(NAIVE_IPV4.match(s))

print(is_ipv4_naive("192.168.1.1"))   # True
print(is_ipv4_naive("999.999.999.999"))  # True! (wrong - doesn't check range)
```

## Strict Pattern (Validates 0-255)

```python
import re

# Pattern that validates each octet is in the range 0-255
# Breakdown:
# (25[0-5])   matches 250-255
# (2[0-4]\d)  matches 200-249
# (1\d{2})    matches 100-199
# ([1-9]\d)   matches 10-99
# (\d)        matches 0-9
OCTET = r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)"
STRICT_IPV4 = re.compile(rf"^{OCTET}\.{OCTET}\.{OCTET}\.{OCTET}$")

def is_valid_ipv4_regex(s: str) -> bool:
    return bool(STRICT_IPV4.match(s))

test_cases = [
    ("192.168.1.1", True),
    ("10.0.0.0", True),
    ("255.255.255.255", True),
    ("0.0.0.0", True),
    ("256.0.0.1", False),      # Invalid octet
    ("192.168.1", False),      # Missing octet
    ("192.168.1.1.1", False),  # Extra octet
    ("192.168.01.1", False),   # Leading zero (strict)
    ("::1", False),            # IPv6
    ("", False),               # Empty
]

for ip, expected in test_cases:
    result = is_valid_ipv4_regex(ip)
    status = "PASS" if result == expected else "FAIL"
    print(f"[{status}] {ip!r:<25} -> {result}")
```

## Extracting IPv4 Addresses from Text

```python
import re

OCTET = r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)"
IPV4_FINDER = re.compile(rf"\b{OCTET}\.{OCTET}\.{OCTET}\.{OCTET}\b")

def extract_ips(text: str) -> list[str]:
    return IPV4_FINDER.findall(text)

log_line = "2026-03-20 10:00:00 Connection from 192.168.1.50 to 10.0.0.1 failed"
ips = extract_ips(log_line)
print(f"Found IPs: {ips}")  # ['192.168.1.50', '10.0.0.1']
```

## Why Use ipaddress Instead of Regex

```python
import ipaddress

def is_valid_ipv4(s: str) -> bool:
    """More reliable than regex - handles all edge cases correctly."""
    try:
        ipaddress.IPv4Address(s)
        return True
    except ipaddress.AddressValueError:
        return False

# ipaddress correctly rejects leading zeros, ranges, and malformed strings
print(is_valid_ipv4("192.168.01.1"))   # False (leading zero)
print(is_valid_ipv4("256.0.0.1"))      # False (out of range)
print(is_valid_ipv4("192.168.1.1"))    # True
```

## Performance Comparison

```python
import re, ipaddress, timeit

ip = "192.168.1.100"
OCTET = r"(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)"
compiled = re.compile(rf"^{OCTET}\.{OCTET}\.{OCTET}\.{OCTET}$")

# Compiled regex is faster for bulk validation
regex_time = timeit.timeit(lambda: bool(compiled.match(ip)), number=100_000)
ipaddress_time = timeit.timeit(
    lambda: bool(ipaddress.IPv4Address(ip)),
    number=100_000
)

print(f"Regex:      {regex_time:.3f}s")
print(f"ipaddress:  {ipaddress_time:.3f}s")
```

## Conclusion

For simple IP validation in Python, a strict regex validates the 0-255 octet range. However, `ipaddress.IPv4Address` is the preferred production approach-it's correct, handles all edge cases, and is a standard library function. Use regex when you need to extract IPs from text (log files, emails, HTML) where `ipaddress` can't be used directly on substrings.
