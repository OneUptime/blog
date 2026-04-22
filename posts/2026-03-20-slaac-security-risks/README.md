# How to Understand SLAAC Security Risks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLAAC, IPv6 Security, Rogue RA, Address Spoofing, Privacy

Description: Understand the security risks associated with SLAAC including rogue RA attacks, address prediction from EUI-64, privacy leakage, and how to mitigate each risk.

## Introduction

SLAAC's stateless design creates several security risks that IPv4 DHCP does not have. The lack of a central authority means any device that can send accepted Router Advertisements can advertise itself as a default router to hosts on the segment. Modified EUI-64 addresses can expose MAC addresses. The absence of address tracking makes forensic investigation harder. Understanding these risks enables appropriate countermeasures.

## Risk 1: Rogue Router Advertisement (RA) Attacks

The most critical SLAAC security risk is an unauthorized RA.

```text
Rogue RA Attack Impact:

Attack type: Default gateway hijacking
  Attacker sends RA from its link-local address with RouterLifetime=1800
  Accepting hosts add attacker to default router list
  Off-link traffic may flow through attacker (MITM)

Attack type: Prefix hijacking
  Attacker sends RA with wrong Prefix Information option (A flag set)
  Hosts generate addresses in attacker's prefix
  If attacker is also a default router → off-link traffic routes through attacker

Attack type: DoS via RA Lifetime=0
  Attacker spoofs legitimate router's RA with RouterLifetime=0
  Hosts remove legitimate router from default router list
  Hosts lose connectivity (DoS)

Attack type: Prefix flooding
  Attacker sends many RAs with different prefixes
  Hosts generate addresses for each prefix
  Interface becomes overloaded with addresses

Mitigation:
  Primary: RA Guard on all access switches
  Secondary: Monitor for rogue RA sources
  Detection: NDPMon or tcpdump monitoring
```

## Risk 2: Modified EUI-64 Address Prediction

Modified EUI-64 SLAAC addresses are deterministic from MAC addresses.

```text
Modified EUI-64 Predictability:

From MAC address 00:11:22:33:44:55:
  → IPv6 address 2001:db8::211:22ff:fe33:4455

Attack implications:
  1. Device tracking across networks:
     Same MAC → same IID on every network where that MAC is used
     Attacker knows device moved between networks

  2. Targeted scanning:
     OUI (first 3 bytes of MAC): 00:11:22 = [manufacturer]
     Known device makes (e.g., iPhone, Dell): predictable MAC ranges
     Attacker can scan /64 for specific device types efficiently

  3. Physical-world correlation:
     IPv6 address appears in web server logs
     Attacker extracts MAC from address
     MAC vendor lookup reveals device type

Mitigation:
  On Linux, enable privacy extensions: use_tempaddr=2
  On other clients, enable equivalent temporary/private IPv6 addressing
  Or use RFC 7217 stable privacy addresses
  Both prevent MAC from appearing in IPv6 address
```

## Risk 3: No Address Tracking

SLAAC provides no central record of address assignments.

```text
Forensic Limitations with SLAAC:

DHCPv4:
  DHCP server log: "2024-01-15 10:23:45 LEASE 192.168.1.100 to MAC aa:bb:cc:dd:ee:ff"
  → Can trace an IP to a MAC/device at a point in time

SLAAC:
  No central log of which host used which address
  → Cannot trace "who had 2001:db8::211:22ff:fe33:4455 at 10:23am?"
  → Privacy advantages for users, disadvantages for security teams

With privacy extensions (random IIDs):
  No MAC in address + changes periodically (often daily by default)
  → Even harder to correlate with physical device

Mitigations for tracking:
  1. Deploy IPv6 ND Inspection / IPv6 snooping:
     Switch binding table maps address to port
     Correlate port to physical machine
  2. Use stateful DHCPv6 for enterprise:
     Central lease records for address-to-client tracking
  3. RADIUS/802.1X:
     Authenticate users at network level
     Correlate user identity to port → to IPv6 address
```

## Risk 4: SLAAC with Router Flags Attack

Manipulating RA flags to steer clients toward DHCPv6.

```text
Flag Manipulation Attack:

Attacker sends RA with M=1 (Managed Address Configuration):
  Effect: Hosts that honor the flag send DHCPv6 SOLICIT to ff02::1:2
  Attacker runs rogue DHCPv6 server on link
  Attacker supplies: address + DNS=attacker's_DNS
  Default gateway still comes from Router Advertisements

Combined attack (M=1 + rogue DHCPv6 + rogue router):
  - M=1 in rogue RA triggers DHCPv6 on hosts that honor the flag
  - Rogue DHCPv6 provides address and DNS
  - Rogue router provides default gateway
  - Full MITM without any host interaction

Mitigation:
  RA Guard (blocks rogue RA) prevents M=1 attack
  DHCPv6 Guard (blocks rogue DHCPv6) prevents second stage
  Both must be deployed together
```

## Risk 5: Neighbor Discovery Spoofing Against Predictable Addresses

```text
ND/NA Spoofing Against Predictable SLAAC Addresses:

If SLAAC generates addresses predictably (EUI-64):
  Attacker can infer a victim's IPv6 address
  Attacker can send targeted spoofed NA/NS messages involving that address
  → Poison other hosts' neighbor caches for traffic to the victim, or poison the victim's cache for known peers

If SLAAC generates random addresses (privacy extensions):
  Attacker must first discover the address
  → Harder to target specific devices

Mitigation:
  ND Inspection validates NA messages against binding table
  Source Guard validates source addresses in data packets
```

## Security Hardening Checklist

```text
SLAAC Security Hardening:

Switch Level:
  ☑ Deploy RA Guard on all host-facing ports
  ☑ Deploy DHCPv6 Guard on all host-facing ports
  ☑ Enable ND Inspection with binding table
  ☑ Enable IPv6 Source Guard (after binding table populated)

Host Level:
  ☑ Enable privacy/private addressing on all clients (Linux: use_tempaddr=2)
  ☑ Restrict RA acceptance to known router sources (nftables/ip6tables)
  ☑ Monitor RA sources with NDPMon or similar

Router Level:
  ☑ Use correct RA parameters (Router Lifetime, flags, prefix lifetimes)
  ☑ Disable SLAAC on server-facing interfaces if needed
  ☑ Configure appropriate prefix lifetimes

Monitoring:
  ☑ Alert on new RA sources (rogue RA detection)
  ☑ Monitor binding table size (NDP exhaustion detection)
  ☑ Audit IPv6 address assignments via switch binding tables
```

## Conclusion

SLAAC security risks include rogue RA attacks (mitigated by RA Guard), Modified EUI-64 address prediction and tracking (mitigated by privacy extensions or RFC 7217), and lack of address tracking (mitigated by ND Inspection binding tables or stateful DHCPv6). The combination of RA Guard at the switch, privacy extensions on clients, and ND Inspection for binding records provides a comprehensive SLAAC security posture. For environments requiring strict address control and tracking, stateful DHCPv6 should supplement or replace SLAAC.
