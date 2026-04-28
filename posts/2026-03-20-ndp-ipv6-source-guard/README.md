# How to Configure IPv6 Source Guard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6 Source Guard, First Hop Security, IPv6 Security, NDP Security, Address Spoofing

Description: Configure IPv6 Source Guard on switches to prevent source address spoofing by validating IPv6 source addresses against the binding table built by IPv6 snooping.

## Introduction

IPv6 Source Guard is a switch-level feature that validates every IPv6 packet's source address against the binding table built by IPv6 Snooping (which learns addresses from NDP and DHCPv6 exchanges). If a packet arrives with a source address not in the binding table for that port, it is dropped. This prevents hosts from spoofing other hosts' IPv6 addresses or using addresses they were never assigned.

## How IPv6 Source Guard Works

The binding table is the foundation - source guard enforces it.

```text
IPv6 Source Guard Flow:

Step 1: Binding table is built (IPv6 Snooping):
  - NDP NA on port ge-0/0/1 from fe80::1 (MAC 00:11:22:33:44:55)
    → Binding: ge-0/0/1, 2001:db8::1, MAC 00:11:22:33:44:55 [ADDED]
  - DHCPv6 REPLY for 2001:db8::100 on ge-0/0/2
    → Binding: ge-0/0/2, 2001:db8::100, MAC aa:bb:cc:dd:ee:ff [ADDED]

Step 2: Data traffic validation (IPv6 Source Guard):
  - Packet arrives on ge-0/0/1 with src=2001:db8::1 ← in binding table → ALLOW
  - Packet arrives on ge-0/0/1 with src=2001:db8::999 ← NOT in table → DROP
  - Packet arrives on ge-0/0/2 with src=2001:db8::1 ← wrong port → DROP

Protection provided:
  - Host cannot use another host's IPv6 address
  - Host cannot use an address not assigned to it
  - Prevents spoofed source addresses in attack traffic
```

## Binding Table Sources

```text
How the binding table is populated:

Source 1: NDP (Neighbor Solicitation / Neighbor Advertisement)
  - NS/NA from host adds link-local address
  - Also adds global unicast addresses seen in NDP

Source 2: DHCPv6 (when IPv6 Snooping intercepts REPLY)
  - DHCPv6 REPLY containing IA_NA (assigned address)
  - Binding includes: address, DUID, IAID, lease time

Source 3: SLAAC (via ND Inspection)
  - RA Prefix Information option + DAD NS/NA
  - Switch can infer SLAAC address: prefix + interface ID

Source 4: Static entries (manually configured)
  ipv6 neighbor binding vlan 10 interface Gi0/1 2001:db8::1
    hardware-address 00:11:22:33:44:55

View binding table:
  show ipv6 neighbor binding        ← Cisco
  show nd-security binding          ← Juniper
```

## Cisco IOS IPv6 Source Guard Configuration

```text
! Prerequisites: IPv6 Snooping must be configured first

! Step 1: Enable IPv6 Snooping (builds binding table)
ipv6 snooping policy SNOOP_POLICY
 security-level guard
 tracking enable

vlan configuration 10
 ipv6 snooping attach-policy SNOOP_POLICY

! Step 2: Create IPv6 Source Guard policy
ipv6 source-guard policy SRC_GUARD
 deny global-autoconf     ← Block addresses from global autoconfiguration
                          ← (only bindings in table are allowed)

! Note: without 'deny global-autoconf', SLAAC addresses
! that don't appear in DHCPv6 exchange may be allowed

! Step 3: Apply Source Guard to host-facing ports
interface range GigabitEthernet1/0/1 - 23
 ipv6 source-guard attach-policy SRC_GUARD

! Uplink and server ports: do NOT apply source guard
! (switch itself needs to forward without source restriction)
```

## Verifying IPv6 Source Guard

```text
! Show IPv6 Source Guard policies
show ipv6 source-guard policy

! Show snooping policies attached per interface
show ipv6 snooping policies interface GigabitEthernet1/0/1

! Show binding table (validate entries exist for your hosts)
show ipv6 neighbor binding

! Example binding table output:
! Binding Table has 3 entries:
!  Interface   VLAN  IP Address        MAC Address       State    Age
!  Gi1/0/1     10    2001:db8::1       0011.2233.4455    REACHABLE 12
!  Gi1/0/1     10    fe80::211:22ff    0011.2233.4455    REACHABLE 12
!  Gi1/0/2     10    2001:db8::100     aabb.ccdd.eeff    DHCP     350

! If a host's address is NOT in the binding table:
!   All packets from that address are dropped
!   Host appears to have no connectivity
```

## Handling SLAAC with Source Guard

SLAAC addresses require special handling because they are not learned from DHCPv6.

```text
! Problem: SLAAC host generates address via RA + EUI-64
! The address doesn't appear in DHCPv6 REPLY
! Source Guard may not have a binding for it

! Solution 1: Let snooping learn from NDP DAD
! When host performs DAD (sends NS with unspecified source),
! the NA response updates the binding table
! Requires: tracking enable in snooping policy

! Solution 2: Allow global autoconfig (less restrictive)
ipv6 source-guard policy SRC_GUARD_SLAAC
 ! Remove 'deny global-autoconf' to allow SLAAC addresses

! Solution 3: Manual static bindings for known hosts
ipv6 neighbor binding vlan 10 interface GigabitEthernet1/0/1 \
  2001:db8::211:22ff:fe33:4455 hardware-address 0011.2233.4455

! Best practice: Use DHCPv6 for address assignment when using Source Guard
! DHCPv6 ensures every address appears in the binding table
```

## IPv6 Source Guard on Linux (host-level)

On Linux hosts, source validation can be approximated with ip6tables.

```bash
# On a Linux router/gateway: validate IPv6 source addresses
# using reverse path filtering (RPF)

# Note: Unlike IPv4, the Linux kernel has no rp_filter
# sysctl for IPv6. The accept_source_route knob only
# controls IPv6 routing header acceptance (RFC 5095),
# not RPF. IPv6 RPF must be enforced via the ip6tables
# rpfilter match, which is valid in the raw or mangle
# table, PREROUTING chain.

# Block packets that fail reverse path check
sudo ip6tables -t mangle -A PREROUTING -m rpfilter --invert -j DROP

# This drops packets where the source address
# is not reachable through the interface it arrived on
```

## Conclusion

IPv6 Source Guard prevents address spoofing by validating every packet's source IPv6 address against the binding table built by IPv6 Snooping. Addresses not in the binding table for the arriving port are dropped. It requires IPv6 Snooping to be deployed first. For SLAAC networks, ensure snooping captures DAD exchanges to populate the binding table. IPv6 Source Guard is the third pillar of IPv6 First Hop Security, alongside RA Guard and DHCPv6 Guard.
