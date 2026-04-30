# How to Control IPv6 Destination Address Selection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Destination Address Selection, RFC 6724, DNS, Dual-Stack, Networking

Description: Understand how RFC 6724 destination address selection sorts DNS results and controls which address a dual-stack host connects to, with configuration and debugging techniques.

## Destination Address Selection Overview

When `getaddrinfo()` returns multiple addresses (e.g., both AAAA and A records), the system sorts them using its address selection policy. The sorted list is what `getaddrinfo()` returns to the application, and many applications try the first address first.

This controls:
- Whether IPv6 or IPv4 is preferred on dual-stack hosts
- Which of multiple IPv6 addresses is tried first
- Whether Teredo or 6to4 addresses are preferred

## The 10 Destination Selection Rules

```text
Rule 1:  Avoid unusable - skip if no valid source exists
Rule 2:  Prefer matching scope - src and dst same scope wins
Rule 3:  Avoid deprecated source - skip if src is deprecated
Rule 4:  Prefer home address - Mobile IPv6 (rarely used)
Rule 5:  Prefer matching label - src label == dst label
Rule 6:  Prefer higher precedence - from policy table
Rule 7:  Prefer native - native IPv6 over 6to4/Teredo
Rule 8:  Prefer smaller scope - link-local before global
Rule 9:  Longest matching prefix - most common bits wins
Rule 10: Keep order unchanged - stable sort, first DNS result stays
```

## Policy Table Precedence (Rule 6)

```bash
# On Linux/glibc, getaddrinfo() precedence is configured in /etc/gai.conf.
# ip addrlabel manages kernel labels, not precedence values.

# Higher = preferred destination

# Default glibc precedence values
# ::1/128         → precedence 50  (loopback, always first)
# ::/0            → precedence 40  (global IPv6)
# 2002::/16       → precedence 30  (6to4)
# ::/96           → precedence 20
# ::ffff:0:0/96   → precedence 10  (IPv4-mapped = IPv4)

# Result: global IPv6 (40) > 6to4 (30) > IPv4 (10)
# IPv6 is preferred over IPv4 on dual-stack hosts by default

grep -E '^[[:space:]]*#?(label|precedence)' /etc/gai.conf
```

## Observing Destination Selection

```bash
# Python: show sorted address list (what getaddrinfo returns)
python3 << 'EOF'
import socket

hostname = "example.com"
results = socket.getaddrinfo(hostname, 80, type=socket.SOCK_STREAM)

print(f"getaddrinfo results for {hostname} (sorted by system policy):")
for i, r in enumerate(results):
    af = "IPv6" if r[0] == socket.AF_INET6 else "IPv4"
    print(f"  {i+1}. [{af}] {r[4][0]}")
EOF

# Many applications try the first result first
# With the default policy, IPv6 often appears before IPv4 when both are usable
```

## Rule 5: Label Matching in Practice

```bash
# Check the userspace label policy used by getaddrinfo() on Linux/glibc
grep -E '^[[:space:]]*#?label' /etc/gai.conf
# label ::/0             1       ← default IPv6
# label fc00::/7         6       ← ULA

# Connecting to a ULA destination (fd00::1):
# - ULA destination has the ULA label
# - ULA source has the same label  → MATCH (Rule 5 prefers this)
# - Global source has the default label → NO MATCH

# Connecting to a global destination (2001:db8::1):
# - Global destination has the default label
# - ULA source label does not match → NO MATCH
# - Global source label matches     → preferred

# This helps keep ULA traffic on ULA paths when matching ULA destinations exist
```

## Rule 7: Prefer Native IPv6 Over Tunnels

```bash
# If DNS returns both a native IPv6 destination and a 6to4 destination,
# Rule 7 prefers the native path when both are otherwise usable

# A working 6to4 setup requires a SIT/6to4 tunnel;
# adding a 2002:: address alone is not enough

# Check if a 6to4 tunnel is active
ip tunnel show | grep sit
ip -6 addr show | grep "2002:"
```

## Rule 9: Longest Prefix Match for Destinations

```bash
# When two IPv6 destinations exist and one shares more prefix bits
# with the selected source, it is preferred

python3 << 'EOF'
import ipaddress

# Source address selected by Rule 5/6/7
source = ipaddress.IPv6Address('2001:db8:1::10')

# Two destinations returned by DNS
destinations = [
    ipaddress.IPv6Address('2001:db8:1::100'),  # same /64
    ipaddress.IPv6Address('2001:db8:2::100'),  # different third hextet
]

src_int = int(source)
for d in destinations:
    d_int = int(d)
    xor = src_int ^ d_int
    matching = 128 - xor.bit_length() if xor != 0 else 128
    print(f"Destination {d}: {matching} bits match source")
# 2001:db8:1::100 → 119 bits match (preferred, Rule 9)
# 2001:db8:2::100 → 46 bits match
EOF
```

## Influencing Selection with Policy Table

```bash
# Force prefer IPv4 over IPv6 (override Rule 6 in getaddrinfo())
# On Linux/glibc, do this in /etc/gai.conf.
# If any precedence line is present, keep the full precedence table.

# /etc/gai.conf - getaddrinfo() policy table for userspace
sudo tee /etc/gai.conf > /dev/null << 'EOF'
label       ::1/128          0
label       ::/0             1
label       2002::/16        2
label       ::/96            3
label       ::ffff:0:0/96    4
label       fec0::/10        5
label       fc00::/7         6
label       2001:0::/32      7
precedence  ::1/128         50
precedence  ::/0            40
precedence  2002::/16       30
precedence  ::/96           20
precedence  ::ffff:0:0/96  100
EOF
```

## Debugging with getaddrinfo

```bash
# C program to print raw getaddrinfo results
cat > /tmp/gai_debug.c << 'EOF'
#define _POSIX_C_SOURCE 200112L
#include <stdio.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <arpa/inet.h>

int main(int argc, char **argv) {
    if (argc < 2) { puts("Usage: gai_debug <hostname>"); return 1; }
    struct addrinfo hints = {0}, *res, *p;
    hints.ai_socktype = SOCK_STREAM;
    if (getaddrinfo(argv[1], "80", &hints, &res) != 0) return 1;
    int i = 0;
    for (p = res; p; p = p->ai_next, i++) {
        char buf[INET6_ADDRSTRLEN];
        void *addr = p->ai_family == AF_INET6
            ? (void*)&((struct sockaddr_in6*)p->ai_addr)->sin6_addr
            : (void*)&((struct sockaddr_in*)p->ai_addr)->sin_addr;
        inet_ntop(p->ai_family, addr, buf, sizeof(buf));
        printf("%d. [%s] %s\n", i+1,
               p->ai_family == AF_INET6 ? "IPv6" : "IPv4", buf);
    }
    freeaddrinfo(res);
    return 0;
}
EOF
gcc -o /tmp/gai_debug /tmp/gai_debug.c
/tmp/gai_debug example.com
```

## Conclusion

RFC 6724 defines the destination selection rules that influence the order `getaddrinfo()` returns. On Linux/glibc, `/etc/gai.conf` controls the userspace precedence table, so dual-stack hosts often prefer IPv6 when both families are equally usable. Label matching (Rule 5) helps pair ULA destinations with ULA sources, and Rule 7 prefers native transport over tunneled paths. Modify `/etc/gai.conf` on Linux/glibc to adjust precedence - for example, to temporarily prefer IPv4 while debugging IPv6 issues.
