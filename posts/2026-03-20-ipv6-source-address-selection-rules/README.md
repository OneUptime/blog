# How to Apply IPv6 Source Address Selection Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Source Address Selection, RFC 6724, Linux, Networking

Description: Deep dive into RFC 6724 source address selection rules with practical examples showing how Linux chooses among multiple IPv6 source addresses for outgoing connections.

## Why Source Address Selection Matters

A host with multiple IPv6 addresses (global, ULA, link-local, temporary) must pick one source address per outgoing connection. The wrong choice causes:
- Packets routed through unexpected paths
- Asymmetric routing and dropped replies
- Privacy leaks (using permanent address instead of temporary)
- Connectivity failures (using deprecated address)

## The RFC 6724 Rules in Detail

RFC 6724 evaluates candidate source addresses against the destination using these rules in order:

```text
Rule 1: Prefer same address
        If candidate == destination, it wins immediately

Rule 2: Prefer appropriate scope
        Prefer the smallest source scope that is still >= destination scope
        Link-local source cannot reach global destination

Rule 3: Avoid deprecated addresses
        Preferred lifetime > 0 wins over lifetime = 0

Rule 4: Prefer home address (Mobile IPv6)
        Rarely applicable in fixed networks

Rule 5: Prefer outgoing interface
        Prefer address assigned to the interface used to reach destination

Rule 5.5: Prefer prefixes advertised by the selected next-hop
          Only applies on implementations that track which router
          advertised which prefix

Rule 6: Prefer matching label
        Prefer source whose policy-table label matches the destination label

Rule 7: Prefer temporary address (privacy extensions)
        Temporary address preferred over public/stable address

Rule 8: Longest matching prefix
        Longest common prefix with destination wins
```

## Setting Up a Test Environment

```bash
# Add multiple IPv6 addresses to test selection

ip addr add 2001:db8:1::10/64 dev eth0 mngtmpaddr   # Global static template for temporary addresses
ip addr add fd00::10/64 dev eth0                    # ULA
ip -6 addr show dev eth0 scope link                 # Link-local (already present)

# Enable privacy extensions (temporary addresses)
sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# View all addresses with lifetimes
ip -6 addr show dev eth0
```

## Rule 2: Scope Matching Examples

```bash
# Rule 2: link-local source CANNOT be used for global destination

# Verify: route lookup to a global destination uses a global source
ip -6 route get 2001:db8::1
# Output includes: src 2001:db8:1::10 or a temporary address - NOT fe80::...

# Link-local destination requires link context and uses a link-local source
ip -6 route get fe80::1 oif eth0
# Output includes: src <eth0's link-local address>
```

## Rule 6: Label Matching

```bash
# Show current policy table labels
ip addrlabel list

# A source whose label matches the destination label wins Rule 6
# Inspect your current table first; default labels vary by system

# Add custom labels to make this ULA prefix and destination prefix match
ip addrlabel add prefix fd00::/64 label 42
ip addrlabel add prefix 2001:db8::/32 label 42

# Now destinations in 2001:db8::/32 can prefer fd00::/64 sources
# because the labels match
```

## Rule 7: Temporary Address Preference

```bash
# With use_tempaddr=2, temporary addresses are preferred for outgoing

# Check current temporary addresses
ip -6 addr show dev eth0 | grep "scope global temporary"
# inet6 2001:db8:1:0:a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic

# Verify outgoing connections use temporary address
curl -6 https://ifconfig.co
# Returns: 2001:db8:1:0:a1b2:c3d4:... (temporary)

# Force use of specific source address (override selection)
curl -6 --interface 2001:db8:1::10 https://ifconfig.co
# Returns: 2001:db8:1::10 (static)
```

## Rule 8: Longest Prefix Match

```bash
# When connecting to 2001:db8:1:1::200, which source is preferred?
# Candidate A: 2001:db8:1:1:8000::10   (64 matching bits)
# Candidate B: 2001:db8:1:8000::10     (48 matching bits)

# Rule 8 picks Candidate A (64 bits match > 48 bits match)

# Python script to visualize prefix matching
python3 << 'EOF'
import ipaddress

destination = ipaddress.IPv6Address('2001:db8:1:1::200')
candidates = [
    ipaddress.IPv6Address('2001:db8:1:1:8000::10'),   # 64 matching bits
    ipaddress.IPv6Address('2001:db8:1:8000::10'),     # 48 matching bits
    ipaddress.IPv6Address('fd00::10'),                # 0 matching bits
]

dest_int = int(destination)
for c in candidates:
    c_int = int(c)
    xor = dest_int ^ c_int
    # Count leading zeros = matching prefix bits
    matching = 128 - xor.bit_length() if xor != 0 else 128
    print(f"{c}: {matching} matching bits")
EOF
```

## Rule 3: Deprecated Address Handling

```bash
# Deprecate an address (set preferred lifetime to 0)
ip addr change 2001:db8:1::10/64 dev eth0 preferred_lft 0

# Verify - address shows as "deprecated"
ip -6 addr show dev eth0
# inet6 2001:db8:1::10/64 scope global deprecated

# New connections will NOT use this address (Rule 3)
# Existing connections using it continue to work

# Restore
ip addr change 2001:db8:1::10/64 dev eth0 preferred_lft forever
```

## Debugging Source Address Selection

```bash
#!/bin/bash
# debug-source-selection.sh - Show which source address would be chosen

DESTINATION=${1:-"2001:db8::1"}

echo "Destination: ${DESTINATION}"
echo ""
echo "Available source candidates:"
ip -6 addr show scope global | grep "inet6" | awk '{print $2}'
echo ""

# Ask the kernel to choose a route and capture the selected source
python3 << PYEOF
import socket
dest = "${DESTINATION}"
try:
    s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
    s.connect((dest, 80))
    src = s.getsockname()[0]
    print(f"RFC 6724 selected source: {src}")
    s.close()
except Exception as e:
    print(f"Error: {e}")
PYEOF
```

## Application Override

Applications can bypass RFC 6724 by binding explicitly:

```bash
# Python: bind to specific source address
python3 << 'EOF'
import socket

# Create IPv6 UDP socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)

# Bind to specific source (overrides RFC 6724)
s.bind(('2001:db8:1::10', 0))  # explicit source
s.connect(('2001:db8::1', 80))

src = s.getsockname()
print(f"Source: {src[0]}:{src[1]}")
s.close()
EOF
```

## Conclusion

RFC 6724 source address selection follows Rules 1-8, with an additional Rule 5.5 for implementations that track which next-hop advertised which prefix. The most commonly triggered rules in practice are: Rule 2 (scope - link-local cannot reach global), Rule 5 (prefer interface address), Rule 6 (label matching), Rule 7 (prefer temporary for privacy), and Rule 8 (longest prefix match). Use `ip addrlabel` to modify label assignments and influence which source prefixes win label matching. Debug selection with Python's UDP `socket.connect()` trick - it reveals the OS-chosen source without sending actual traffic.
