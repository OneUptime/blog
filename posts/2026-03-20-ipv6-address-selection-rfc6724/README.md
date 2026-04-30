# How to Understand IPv6 Address Selection (RFC 6724)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RFC 6724, Address Selection, Networking, Linux

Description: Understand how RFC 6724 governs IPv6 source and destination address selection, including the default policy table, selection rules, and how hosts choose among multiple addresses.

## What Is RFC 6724?

RFC 6724 defines the default behavior for selecting source and destination IPv6 addresses when a host has multiple addresses available. Compliant hosts and libraries typically use these rules by default, subject to OS-specific policy overrides.

Two selection algorithms work together:
- **Source address selection**: which local address to use as the packet source
- **Destination address selection**: which remote address to contact when DNS returns multiple results

## Address Scopes

RFC 6724 compares addresses by scope, from narrowest to broadest:

| Scope | Value | Example |
|---|---|---|
| Interface-local | 1 | ff01::1 |
| Link-local | 2 | fe80::/10 |
| Site-local (deprecated) | 5 | fec0::/10 |
| Global | 14 | 2001:db8::/32 |

The source address needs a scope appropriate for the destination; for example, link-local sources are not used for global destinations.

## The Default Policy Table

RFC 6724 defines a default policy table with label and precedence values:

```text
Prefix             Precedence  Label
::1/128            50          0      # Loopback
::/0               40          1      # Default (IPv6)
::ffff:0:0/96      35          4      # IPv4-mapped
2002::/16          30          2      # 6to4
2001::/32          5           5      # Teredo
fc00::/7           3           13     # ULA
::/96              1           3      # IPv4-compatible (obsolete)
fec0::/10          1           11     # Site-local (obsolete)
3ffe::/16          1           12     # 6bone (obsolete)
```

Higher precedence = preferred destination. Labels are used to match source and destination - same label is preferred.

## Viewing the Policy Table on Linux

```bash
# Show the current address selection policy table

ip addrlabel list

# Output shows prefix/label pairs in the kernel's address-label table.
# Exact default rows vary by kernel and distribution.
```

On Linux, `ip addrlabel` shows and manages the kernel's address labels. Precedence for destination sorting is handled in userspace resolver policy on glibc systems (for example, `/etc/gai.conf`), while `net.ipv6.conf.*.use_tempaddr` controls privacy-address preference, not precedence.

## Source Address Selection Rules

RFC 6724 source address selection evaluates candidates using ordered pair-wise rules. Later rules act as tiebreakers when earlier rules tie:

```text
Rule 1: Prefer same address (if source == destination, done)
Rule 2: Prefer appropriate scope
Rule 3: Avoid deprecated addresses
Rule 4: Prefer home addresses (Mobile IPv6)
Rule 5: Prefer outgoing interface address
Rule 5.5: Prefer addresses in a prefix advertised by the next-hop (if tracked)
Rule 6: Prefer matching label (source label == destination label)
Rule 7: Prefer temporary addresses (privacy extensions)
Rule 8: Use longest matching prefix
```

## Destination Address Selection: 10 Rules

When DNS returns multiple addresses, the destination list is sorted:

```text
Rule 1: Avoid unusable destinations
Rule 2: Prefer matching scope
Rule 3: Avoid deprecated source
Rule 4: Prefer home address
Rule 5: Prefer matching label
Rule 6: Prefer higher precedence
Rule 7: Prefer native transport (over encapsulated/tunneled)
Rule 8: Prefer smaller scope
Rule 9: Use longest matching prefix
Rule 10: Leave order unchanged (stable sort)
```

## Practical Example: Dual-Stack Host

```bash
# A dual-stack host has these addresses:
ip addr show eth0
# 2: eth0
#    inet  192.168.1.10/24
#    inet6 2001:db8::10/64
#    inet6 fe80::1/64

# DNS may return both A and AAAA records:
host example.com
# The exact addresses depend on current DNS, but dual-stack names can return
# both IPv4 and IPv6 answers.

# With the RFC 6724 default policy table, native IPv6 usually sorts ahead of
# IPv4 on dual-stack hosts because ::/0 has higher precedence than
# ::ffff:0:0/96 when both destinations are equally suitable.

# Confirm with getaddrinfo:
python3 -c "
import socket
results = socket.getaddrinfo('example.com', 80, type=socket.SOCK_STREAM)
for r in results:
    print(socket.AddressFamily(r[0]).name, r[4])
"
# On many Linux systems, AF_INET6 results appear before AF_INET results.
# Exact addresses and ordering can vary by resolver, OS, and local policy.
```

## ULA vs Global Address Selection

```bash
# When a host has both ULA (fc00::/7) and global addresses,
# label matching - not scope - usually drives source selection,
# because both ULA and global unicast have global scope.

# ULA destination → ULA source preferred (matching ULA label)
# Global destination → Global source preferred (matching default IPv6 label)

# Test the selected source address for a specific destination:
ip -6 route get fd00::1
ip -6 route get 2001:db8::1
# Look for the "src" field in the output.
```

## Privacy Extensions and Rule 7

Temporary address extensions (RFC 8981, which obsoletes RFC 4941) generate temporary addresses with random interface IDs. RFC 6724 Rule 7 prefers temporary addresses for outgoing connections to enhance privacy:

```bash
# Check privacy extension settings
sysctl net.ipv6.conf.eth0.use_tempaddr
# <= 0 = disable privacy extensions
# 1 = enable them, but prefer public addresses
# > 1 = enable them and prefer temporary addresses

# Verify which public IPv6 address is used for outgoing connections
curl -6 https://ifconfig.co
# If temporary addresses are preferred, this typically shows a temporary source address.
```

## Conclusion

RFC 6724 address selection is automatic but configurable. The policy table assigns labels and precedence to prefixes - same-label source/destination pairs are preferred, and higher precedence destinations are tried first. The source selection rules and 10-rule destination sorting algorithm work together to choose the best path. Key practical outcomes: IPv6 is preferred over IPv4 on dual-stack hosts when both are equally suitable (default precedence), temporary addresses are often preferred for privacy (Rule 7), and ULA sources are preferred for ULA destinations because the labels match. On Linux, adjust kernel labels with `ip addrlabel`; on glibc systems, destination precedence can also be overridden via `/etc/gai.conf`.
