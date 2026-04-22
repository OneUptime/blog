# How SLAAC Handles Multiple Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, Multiple Prefixes, IPv6, Address Selection, Multihoming

Description: Understand how SLAAC handles multiple prefix advertisements, how hosts generate multiple addresses, and how source address selection works when multiple SLAAC addresses exist.

## Introduction

When a router advertises multiple prefixes in its Router Advertisements, SLAAC-capable hosts generate one or more addresses for each advertised prefix that has the Autonomous flag set. Multiple prefixes arise in GUA + ULA deployments, ISP prefix delegation scenarios, IPv6 renumbering, and multihomed environments. Understanding how hosts manage multiple SLAAC addresses and which address is chosen for outbound connections is essential for troubleshooting IPv6 connectivity.

## How Multiple Prefixes Arise

```nginx
Scenarios with Multiple IPv6 Prefixes:

1. Renumbering (old + new prefix):
   Old prefix: 2001:db8:0:1::/64 (being phased out)
   New prefix: 2001:db8:0:2::/64 (being introduced)
   → Both advertised simultaneously during transition
   → Hosts have two global addresses

2. Multiple upstream ISPs (multihoming):
   ISP A prefix: 2001:db8:a::/64
   ISP B prefix: 2001:db8:b::/64
   → Both prefixes advertised via separate RAs
   → Hosts have two global addresses

3. GUA + ULA (common enterprise pattern):
   Global prefix: 2001:db8::/64 (documentation GUA example; use your routed prefix)
   ULA prefix:    fd12:3456:789a::/64 (private, local use only)
   → Both advertised in RA
   → Hosts have one GUA + one ULA address

4. Multiple /64s from prefix delegation:
   ISP assigns /48, router sub-delegates:
   Prefix A: 2001:db8:1::/64 (VLAN 10)
   Prefix B: 2001:db8:2::/64 (VLAN 20)
   (Each VLAN gets its own prefix, not multiple prefixes per host)
```

## SLAAC with Multiple Prefixes

```bash
# Router advertising two prefixes (radvd config):

# interface eth1 {
#     AdvSendAdvert on;
#     prefix 2001:db8:a::/64 {
#         AdvOnLink on; AdvAutonomous on;
#         AdvValidLifetime 2592000; AdvPreferredLifetime 604800;
#     };
#     prefix 2001:db8:b::/64 {
#         AdvOnLink on; AdvAutonomous on;
#         AdvValidLifetime 2592000; AdvPreferredLifetime 604800;
#     };
# };

# On a SLAAC host receiving both prefixes:
ip -6 addr show eth0
# inet6 2001:db8:a::211:22ff:fe33:4455/64 scope global dynamic
#    valid_lft 2591900sec preferred_lft 604700sec
# inet6 2001:db8:b::211:22ff:fe33:4455/64 scope global dynamic
#    valid_lft 2591900sec preferred_lft 604700sec
# inet6 fe80::211:22ff:fe33:4455/64 scope link
#    valid_lft forever preferred_lft forever

# Both global addresses can exist simultaneously
# With classic EUI-64 IID generation: same interface identifier for both
# With RFC 7217 stable privacy IIDs: stable opaque IID usually differs per prefix
# With RFC 8981 temporary addresses: additional per-prefix temporary addresses may exist and rotate over time
```

## Source Address Selection with Multiple Prefixes

```text
RFC 6724 Source Address Selection Rules:

When multiple source addresses exist for an outbound connection,
the kernel applies these rules in order:

Rule 1: Prefer same address as destination
Rule 2: Prefer appropriate scope
        (link-local for link-local dst, global for global dst)
Rule 3: Avoid deprecated addresses
Rule 4: Prefer home address (Mobile IPv6)
Rule 5: Prefer outgoing interface
Rule 5.5: Prefer addresses in a prefix advertised by the next-hop
        (when the implementation tracks that relationship)
Rule 6: Prefer matching label
        (uses Policy Table to match src prefix to dst prefix)
Rule 7: Prefer temporary addresses (privacy extensions)
Rule 8: Use longest matching prefix

For multiple GUA prefixes without specific policy:
  - Rule 8 (longest match) often determines selection
  - If the rules still tie: implementation-specific
  - Usually a stable ordering or another implementation-specific tiebreaker
```

## Policy Table for Source Address Selection

```bash
# View current kernel address label table used for IPv6 source selection
ip addrlabel list
# (Note: ip rule and ip -6 rule show routing policy, not address selection)

# RFC 6724 source/destination address selection policy table (actual Linux addrlabel defaults can vary by release)
# Source selection uses the Label column; destination sorting uses Precedence.
# Linux exposes kernel labels with ip addrlabel; user-space precedence is commonly configured via /etc/gai.conf.
# Prefix        Precedence  Label
# ::1/128       50          0      (loopback)
# ::/0          40          1      (global)
# ::ffff:0:0/96 35          4      (IPv4-mapped)
# 2002::/16     30          2      (6to4)
# 2001::/32     5           5      (Teredo)
# fc00::/7      3           13     (ULA)
# ::/96         1           3      (IPv4 compatible, deprecated)
# fec0::/10     1           11     (site-local, deprecated)
# 3ffe::/16     1           12     (6bone, deprecated)

# The "label" is used in Rule 6:
# Source and destination in same label = preferred match

# ULA (fc00::/7, label 13) prefers ULA destinations
# Global (label 1) prefers global destinations
# This helps a host with both addresses prefer a GUA source for GUA destinations instead of a ULA source
```

## Testing Multiple Address Source Selection

```bash
# Force a specific source address for testing
# Replace the documentation address below with an address assigned to your host
curl -6 --interface 2001:db8:a::211:22ff:fe33:4455 https://example.com

# Or run a source address selection test:
# Create a connection and check source
python3 -c "
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('2001:4860:4860::8888', 53))
print('Source address:', s.getsockname()[0])
s.close()
"

# Use ip to inspect the selected route and source
ip -6 route get 2001:4860:4860::8888

# Add a preferred source address for a specific destination route
sudo ip -6 route add 2001:4860:4860::8888/128 via fe80::1 dev eth0 src 2001:db8:a::211:22ff:fe33:4455
# The route src attribute is the preferred source for destinations covered by that route
```

## ULA + GUA Coexistence

```bash
# Common pattern: ULA for internal traffic, GUA for internet
# Router advertises:
#   Global: 2001:db8::/64 (documentation GUA example; use your routed prefix)
#   ULA:    fd12:3456:789a::/64 (internal only)

# Host addresses:
ip -6 addr show eth0
# inet6 2001:db8::211:22ff:fe33:4455/64 scope global  ← GUA
# inet6 fd12:3456:789a::211:22ff:fe33:4455/64 scope global  ← ULA

# Source address selection:
# For destination on internet (2001:...):
#   ULA source: would usually fail without translation because ULA is not globally routed
#   GUA source: preferred (internet-routable)
#   → RFC 6724 treats ULA as global scope, so Rule 2 ties; Rule 6 label matching prefers GUA for GUA destinations

# For destination on local network (fd12:3456:789a::...):
#   ULA source: preferred (same label in policy table = label 13)
#   GUA source: different label → less preferred for ULA dest
#   → RFC 6724 Rule 6 (label matching) → prefers ULA for ULA dest

# Verify which source is used for internal vs external
python3 -c "
import socket
# Test internet destination
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('2001:4860:4860::8888', 53))
print('Internet source:', s.getsockname()[0])
s.close()
# Test internal destination
s = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
s.connect(('fd12:3456:789a::1', 53))
print('Internal source:', s.getsockname()[0])
s.close()
"
```

## Conclusion

SLAAC hosts generate one or more addresses per autonomous advertised prefix, resulting in multiple IPv6 addresses when multiple prefixes are advertised. Source address selection (RFC 6724) uses ordered comparison rules to choose among available source addresses. Key rules are: avoid deprecated addresses (Rule 3), prefer temporary addresses (Rule 7), and match the policy label (Rule 6). The ULA + GUA pattern relies on label matching (Rule 6) to normally prefer ULA sources for internal ULA destinations and GUA sources for internet destinations. Understanding multiple-prefix behavior is essential for troubleshooting connectivity in multihomed or renumbering scenarios.
