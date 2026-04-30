# How to Block Dangerous ICMPv6 While Allowing Essential Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Security, Firewall, IPv6, NDP Guard

Description: Identify dangerous ICMPv6 message types, implement firewall rules to block rogue RA and NDP attacks, and protect the network while keeping essential ICMPv6 functional.

## Introduction

While essential ICMPv6 must not be blocked indiscriminately, some ICMPv6 messages can be weaponized for attacks. Rogue Router Advertisements can redirect traffic or assign attacker-controlled addresses. Rogue Neighbor Advertisements can poison the neighbor cache. The challenge is to block illegitimate ICMPv6 from untrusted sources while allowing legitimate messages from trusted routers.

## Dangerous ICMPv6 Attack Vectors

```text
ICMPv6-based attacks:

1. Rogue Router Advertisement (Type 134) attack:
   Attacker sends RA with:
   - Attacker's link-local as default gateway
   - Short prefix lifetime (forcing re-SLAAC)
   - M/O flags set (redirecting to rogue DHCPv6)
   Impact: Traffic hijacking, MITM, denial of service

2. Rogue Neighbor Advertisement (Type 136) attack:
   Attacker sends NA claiming to own a neighbor's IPv6 address
   Impact: Neighbor cache poisoning (IPv6 equivalent of ARP poisoning)

3. Neighbor Solicitation flooding (Type 135):
   Flood of NS packets, or traffic that triggers address resolution for non-existent addresses
   Forces hosts or first-hop routers to maintain large amounts of neighbor discovery state
   Impact: CPU exhaustion, neighbor cache overflow

4. ICMPv6 redirect attack (Type 137):
   Attacker sends Redirect to change a host's path to a destination
   Impact: Traffic hijacking, route manipulation

5. MLD query spoofing (Type 130):
   Forged MLD queries to manipulate listener timers and multicast control traffic
   Impact: Multicast disruption
```

## Blocking Rogue Router Advertisements

```bash
# Only allow RA from specific trusted routers on the local LAN interface
LAN_IF=eth0

# Allow RA from your legitimate router's link-local address
sudo ip6tables -A INPUT -i "$LAN_IF" -p icmpv6 \
    --icmpv6-type router-advertisement -m hl --hl-eq 255 \
    -s fe80::1 -j ACCEPT

# Block all other Router Advertisements
sudo ip6tables -A INPUT -i "$LAN_IF" -p icmpv6 \
    --icmpv6-type router-advertisement \
    -j DROP

# This is a best-effort host-side allowlist
# Switch-level RA Guard is still stronger because it blocks rogue RA before the host sees it

# For multiple routers:
sudo ip6tables -A INPUT -i "$LAN_IF" -p icmpv6 \
    --icmpv6-type router-advertisement -m hl --hl-eq 255 \
    -s fe80::1 -j ACCEPT
sudo ip6tables -A INPUT -i "$LAN_IF" -p icmpv6 \
    --icmpv6-type router-advertisement -m hl --hl-eq 255 \
    -s fe80::2 -j ACCEPT
sudo ip6tables -A INPUT -i "$LAN_IF" -p icmpv6 \
    --icmpv6-type router-advertisement \
    -j DROP
```

## Using RA Guard (Switchport Feature)

RA Guard is the preferred solution for blocking rogue RAs at the switch layer:

```bash
# Cisco switch: RA Guard configuration (blocks RA on access ports)
# interface GigabitEthernet0/1
#   ipv6 nd raguard attach-policy HOST_POLICY

# On Linux (for a bridge/router acting as switch):
# Use bridge filtering such as ebtables to block RA on untrusted ports

# ebtables: block RA on a specific bridge port (untrusted)
# ebtables -A FORWARD -p IPv6 --ip6-protocol ipv6-icmp \
#     --ip6-icmp-type router-advertisement \
#     -i eth1 -j DROP

# Alternative: host-side filtering with ip6tables + source constraints
# Allow only RA from a trusted router MAC on the LAN interface
sudo ip6tables -A INPUT -i eth0 -p icmpv6 --icmpv6-type 134 \
    -m hl --hl-eq 255 -m mac --mac-source 00:11:22:33:44:55 -j ACCEPT
sudo ip6tables -A INPUT -i eth0 -p icmpv6 --icmpv6-type 134 -j DROP
```

## Protecting Against Neighbor Cache Poisoning

```bash
# Do not blanket-drop Neighbor Advertisement or Neighbor Solicitation on a host firewall.
# They are required for IPv6 neighbor discovery, so use switch-layer protections
# such as SAVI / IPv6 Source Guard or SEND for on-link NA spoofing.

# Block Redirect from untrusted sources
# Only allow Redirect from the current first-hop router on the LAN interface
ROUTER_LL=fe80::1
sudo ip6tables -A INPUT -i eth0 -p icmpv6 --icmpv6-type redirect \
    -m hl --hl-eq 255 -s "$ROUTER_LL" -j ACCEPT
sudo ip6tables -A INPUT -i eth0 -p icmpv6 --icmpv6-type redirect -j DROP
```

## SEND (Secure Neighbor Discovery)

```text
SEND (RFC 3971) provides cryptographic authentication for NDP:

- Uses RSA keys to sign NS/NA/RS/RA messages
- Routers and hosts have cryptographically generated addresses (CGA)
- Prevents rogue RA and NA attacks at the protocol level
- Requires: PKI infrastructure, all NDP-speaking devices support SEND
- Practical limitation: rarely deployed (complex; vendor support limited)
- Alternative: RA Guard + SAVI / IPv6 Source Guard at switch layer (more practical)
```

## Conclusion

The most dangerous ICMPv6 messages are Rogue Router Advertisements (Type 134) and Rogue Neighbor Advertisements (Type 136). The defense strategy: restrict RA acceptance to known router link-local addresses on the correct interface, use RA Guard or SAVI / IPv6 Source Guard for on-link spoofing, and block Redirect messages from untrusted sources. RA Guard at the switch layer is the most operationally practical solution for rogue RA prevention. Host-level `ip6tables` rules provide a best-effort fallback when switch-level controls are not available, but blanket NS/NA drops can break legitimate neighbor discovery. All these measures must be applied without blocking legitimate ICMPv6 from trusted sources.
