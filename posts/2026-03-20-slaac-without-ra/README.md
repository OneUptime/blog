# How IPv6 Link-Local Addresses Work Without Router Advertisements

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Link-Local, IPv6, SLAAC, Fe80, Address Generation, No Router

Description: Understand how IPv6 hosts automatically generate link-local addresses independently of SLAAC and Router Advertisements, and when link-local-only communication is sufficient.

---

## Introduction

IPv6 hosts generate link-local addresses (fe80::/10 prefix) automatically when an interface is enabled, before any Router Advertisement is received. This process is part of SLAAC but is independent of router prefix delegation. Link-local addresses enable communication within a single link (subnet) without a router. They are used for NDP, routing protocols between directly connected routers, and as the source/destination for many control-plane functions.

## Link-Local Address Generation

```text
Link-Local Address Generation Process:

Step 1: Interface enabled (UP)
  - Host immediately creates a TENTATIVE link-local address
  - Format: fe80::<interface-identifier>/10
  - Interface identifier: EUI-64 (from MAC) or random (privacy)

Step 2: DAD for link-local address
  - Host sends NS (Neighbor Solicitation) to solicited-node multicast
  - Source: :: (unspecified, because address is tentative)
  - Target: fe80::<IID>
  - Waits for 1 second (default RetransTimer = 1000ms)

Step 3: If no NA received (no conflict):
  - Address transitions to PREFERRED
  - Link-local address is ready to use

Step 4: Host sends Router Solicitation (RS)
  - Source: fe80::<link-local>
  - Destination: ff02::2 (all routers)
  - Waits for RA to get global prefix

Link-local is ALWAYS assigned (even if no router exists)
Global SLAAC address requires RA with prefix
```

## Link-Local Address Properties

```text
Link-Local Address Properties:

Prefix: fe80::/10
  In practice: always starts with fe80::
  (bits 10-63 are set to 0 per RFC 4291)

Scope: Link-local
  Cannot be routed beyond the current link
  Every interface that has this address is isolated

Lifetime: Infinite (permanent)
  Never expires (unlike global SLAAC addresses)
  Removed only when interface goes down or is deleted

Uniqueness:
  Must be unique on the link (guaranteed by DAD)
  Different on each interface (each interface has its own IID)
  Can be the same address on different interfaces (scope includes interface)

Usage:
  NDP: RS, RA, NS, NA use link-local as source
  Routing protocols: OSPFv3, RIPng peer over link-local
  Default gateway: RA router is specified by link-local address
  DHCPv6: relay agents use link-local as source
```

## Link-Local Without a Router

```bash
# In a network segment with no router:

# Hosts can still communicate via link-local addresses

# Host A (eth0): fe80::1
# Host B (eth0): fe80::2
# No router present

# Host A can ping Host B:
ping6 fe80::2%eth0   # Must specify interface (%eth0)
# Note: % syntax specifies the link (interface) for link-local addresses

# SSH over link-local
ssh admin@fe80::2%eth0

# File transfer over link-local
scp file.txt admin@[fe80::2%eth0]:/tmp/

# Use cases for link-local-only communication:
# - Initial router configuration via console + link-local
# - Isolated test labs
# - Direct router-to-router connections
# - Emergency/out-of-band management
```

## When No Global Prefix is Available

```bash
# Hosts with only link-local addresses cannot reach the internet
# But they can still do:
# 1. Communicate with directly connected hosts (link-local)
# 2. Perform NDP (neighbor discovery, DAD)
# 3. Run routing protocols with adjacent routers

# View link-local address
ip -6 addr show eth0 | grep fe80
# inet6 fe80::211:22ff:fe33:4455/64 scope link
#    valid_lft forever preferred_lft forever

# Identify the interface for link-local
ip -6 addr show | grep fe80
# The number after "fe80" address: "%eth0" (interface scope)

# When using link-local: MUST specify the interface
ping6 fe80::1%eth0    # CORRECT: specify interface scope
ping6 fe80::1         # WRONG: ambiguous without interface

# Multiple interfaces may all have fe80:: addresses
# The scope (interface) disambiguates them
```

## Forcing/Modifying the Link-Local Address

```bash
# Disable automatic link-local generation (unusual)
sudo sysctl -w net.ipv6.conf.eth0.addr_gen_mode=1  # random, not EUI-64
sudo sysctl -w net.ipv6.conf.eth0.addr_gen_mode=0  # EUI-64 (default)

# Manually set a specific link-local address
# (useful for routers that need predictable link-local addresses)
sudo ip -6 addr add fe80::1/10 dev eth0
# Note: adds as additional link-local, kernel keeps auto-generated one

# Remove auto-generated link-local and use manual only
sudo ip -6 addr del fe80::211:22ff:fe33:4455/64 dev eth0
sudo ip -6 addr add fe80::1/64 dev eth0

# On Cisco IOS: set specific link-local on interface
# interface GigabitEthernet0/1
#  ipv6 address fe80::1 link-local

# On Juniper: set specific link-local
# set interfaces ge-0/0/0 unit 0 family inet6 address fe80::1/64
```

## Link-Local in Routing

```text
Link-Local in Routing Protocols:

OSPFv3:
  - Neighbors form adjacency using link-local addresses
  - Link-local as source for hello packets
  - Next-hop in OSPFv3 LSAs is link-local address
  - Command: show ipv6 ospf neighbor (shows link-local of neighbor)

RIPng:
  - Router advertisements use link-local as next-hop
  - Peers use link-local addresses

BGP over IPv6:
  - Can use link-local as BGP peer address
  - Requires specifying interface
  - Used in unnumbered BGP (RFC 5549)
  - Common in data center fabrics

Default gateway from RA:
  - RA always specifies router link-local as gateway
  - Hosts add "default via fe80::1 dev eth0"
  - Not routable but sufficient for link-local next-hop lookup
```

## Conclusion

IPv6 link-local addresses (fe80::/10) are generated automatically by every IPv6-capable host when an interface is enabled, before any Router Advertisement arrives. They enable link-local communication, NDP, and routing protocol peering without a global prefix. Link-local addresses are permanent, never expire, and must include the interface scope when used in commands (`fe80::1%eth0`). While link-local alone is insufficient for internet access, it is the foundation of IPv6 networking and enables initial bootstrapping of the network, including receiving the Router Advertisements that trigger SLAAC global address generation.
