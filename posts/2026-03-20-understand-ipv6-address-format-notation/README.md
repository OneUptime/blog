# How to Understand IPv6 Address Format and Notation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Networking, Addressing, Address Format, Fundamentals

Description: Learn the IPv6 address format, 128-bit hexadecimal notation, colon-separated groups, and the rules for writing and reading IPv6 addresses correctly.

## Introduction

IPv6 addresses are 128 bits long, written as eight groups of four hexadecimal digits separated by colons. Understanding the notation rules is essential before working with any IPv6 configuration.

## IPv6 Address Structure

```text
Full notation:
2001:0db8:0000:0000:0000:0000:0000:0001

Groups:   [2001] [0db8] [0000] [0000] [0000] [0000] [0000] [0001]
Bits:       16    16     16     16     16     16     16     16  = 128 bits
```

## Hexadecimal Groups

Each group is 4 hex digits = 16 bits:
```text
0000 to ffff per group
Total: 8 × 16 = 128 bits
```

## Rule 1: Remove Leading Zeros in Each Group

```text
Full:       2001:0db8:0000:0042:0000:8a2e:0370:7334
Compressed: 2001:db8:0:42:0:8a2e:370:7334
             ^^^   ^^^^  ^^    ^^^

Leading zeros dropped: 0db8 → db8, 0042 → 42, 0370 → 370
```

## Rule 2: Replace Consecutive All-Zero Groups with ::

```text
Full:       2001:0db8:0000:0000:0000:0000:0000:0001
Step 1:     2001:db8:0:0:0:0:0:1
Step 2:     2001:db8::1          (:: replaces five all-zero groups)

The :: can only appear ONCE in an address.
```

## More Examples

```text
Loopback:           ::1
                    (full: 0000:0000:0000:0000:0000:0000:0000:0001)

Unspecified:        ::
                    (full: 0000:0000:0000:0000:0000:0000:0000:0000)

Link-local:         fe80::1
                    (full: fe80:0000:0000:0000:0000:0000:0000:0001)

Global unicast:     2001:db8:1:2::100
                    (full: 2001:0db8:0001:0002:0000:0000:0000:0100)
```

## IPv6 with Port Number

```text
# IPv6 addresses in URLs must be enclosed in brackets

http://[2001:db8::1]:8080/api

# In configuration files:
listen [::]:80;       # Nginx - listen on all IPv6 addresses port 80
listen [2001:db8::1]:443;
```

## CIDR Notation

```text
IPv6 uses prefix length like IPv4:
2001:db8::/32    - 32-bit prefix (like a /32 route)
fe80::/10        - Link-local prefix
::1/128          - Single address (loopback)
```

## Verify IPv6 Address

```python
import ipaddress

examples = [
    "2001:db8::1",
    "fe80::1%eth0",
    "::1",
    "::",
]

for addr in examples:
    try:
        a = ipaddress.IPv6Address(addr.split('%')[0])
        print(f"{addr:30s} valid={True}  compressed={a.compressed}")
    except ValueError as e:
        print(f"{addr:30s} invalid: {e}")
```

## Conclusion

IPv6 addresses are 128-bit values written as eight 4-hex-digit groups separated by colons. Apply two simplification rules: drop leading zeros in each group, and use `::` once to replace the longest run of consecutive all-zero groups. Always enclose IPv6 addresses in square brackets when used in URLs or alongside port numbers.
