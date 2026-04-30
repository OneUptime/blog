# How to Understand IPv6 Multicast Forwarding Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, Forwarding, PIM, Network Routing

Description: An explanation of IPv6 multicast forwarding table structure, how entries are created and used by PIM, and how to read and interpret multicast route entries.

## What Is the Multicast Forwarding Table?

The multicast forwarding table (also called the mroute table or multicast forwarding information base - MFIB) is separate from the multicast routing information base (MRIB). The forwarding table is used to forward multicast packets, while the MRIB is used for RPF lookups. Unlike unicast routing, multicast routing is state-based - active multicast routes create entries in the forwarding table.

## Entry Types in the Multicast Forwarding Table

PIM-SM multicast routing state commonly uses two types of entries:

**(*,G) entries** (star-G): Wildcard source entries for any-source multicast groups. Used by PIM-SM for the shared tree (through RP).
```text
(*, ff1e::1234) - Forward this group from any source via the RP
```

**(S,G) entries** (source-G): Source-specific entries for known sources. Used after PIM switches to the source tree.
```text
(2001:db8::10, ff1e::1234) - Forward this group from this specific source
```

## Reading the Linux Multicast Forwarding Table

```bash
# View the IPv6 multicast forwarding table

ip -6 mroute show

# Example output:
# (2001:db8::10,ff1e::1234)    Iif: eth1    Oifs: eth0

# Detailed output
ip -6 mroute show table all

# Check /proc for multicast routing cache
cat /proc/net/ip6_mr_cache
# Columns: Group Origin Iif Pkts Bytes Wrong Oifs
```

## Reading the FRR Multicast Routing Table

```bash
# View multicast routing table in FRR
vtysh -c "show ipv6 mroute"

# Example output:
# Source           Group            Proto  Input      Output     TTL   Uptime
# 2001:db8::10     ff1e::1234       PIM    eth1       eth0       1     0:00:15

# Show a specific entry
vtysh -c "show ipv6 mroute ff1e::1234"

# Show PIM state (more detailed)
vtysh -c "show ipv6 pim state"
```

## Entry State Machine

PIM-SM creates multicast forwarding entries through these states:

```mermaid
flowchart TD
    A[No State] -->|MLD Report at DR| B[(*,G) entry created<br/>Join sent toward RP]
    B -->|Traffic arrives at RP| C[Shared tree active<br/>(*,G) forwarding]
    C -->|Last-hop router switches to source tree| D[(S,G) Join sent<br/>toward source]
    D -->|Source tree active| E[(S,G) forwarding<br/>(S,G,rpt) prune toward RP]
    E -->|Last receiver leaves| F[Prune sent<br/>Entry removed]
```

## RPF (Reverse Path Forwarding) Check

IPv6 multicast routing uses RPF checks to prevent routing loops. The RPF check verifies that a multicast packet arrives on the interface toward the source:

```bash
# Check the MRIB lookup for a specific source
vtysh -c "show ipv6 rpf 2001:db8::10"
# Expected output:
# Routing entry for 2001:db8::/64 using Multicast RIB
#   * 2001:db8::1, via eth1

# Check the PIM nexthop decision for a specific (S,G)
vtysh -c "show ipv6 pim nexthop-lookup 2001:db8::10 ff1e::1234"

# If RPF check fails, packets are dropped
# Check routing table for the source
ip -6 route get 2001:db8::10
```

## Understanding (*,G) vs (S,G) in Forwarding Tables

```bash
# In Cisco IOS: show detailed mroute entry
# Cisco output:
# IPv6 Multicast Routing Table
# (*,ff1e::1234), uptime 00:05:00, pim
#   Incoming interface: Tunnel0, RPF neighbor 2001:db8::20
#   Outgoing interface list:
#     GigabitEthernet0/0, Forward/Sparse 00:05:00
#
# (2001:db8::10,ff1e::1234), uptime 00:02:00, pim
#   Incoming interface: GigabitEthernet0/1, RPF neighbor 2001:db8::30
#   Outgoing interface list:
#     GigabitEthernet0/0, Forward/Sparse 00:02:00
```

## Forwarding Table Statistics

```bash
# Check packet/byte counters in the kernel multicast cache (Linux)
cat /proc/net/ip6_mr_cache

# FRR: check packet/byte counts
vtysh -c "show ipv6 mroute count"
# Columns: Group Origin Iif Pkts Bytes Wrong Oifs

# Monitor multicast traffic rate
watch -n 1 'cat /proc/net/ip6_mr_cache'
```

## Clearing the Forwarding Table

```bash
# Clear all multicast routes (forces them to be re-established)
# Use carefully - causes temporary traffic interruption

# FRR
vtysh -c "clear ipv6 mroute"

# Linux kernel cache
# ip mroute is display-only; clear multicast routes from the mrouting daemon
# Or restart the PIM daemon
systemctl restart frr
```

## Summary

The IPv6 multicast forwarding table contains (*,G) entries for shared trees and (S,G) entries for source trees. Each entry specifies an incoming interface (RPF result) and outgoing interfaces (active receivers). RPF checks prevent loops. Use `ip -6 mroute show` or `/proc/net/ip6_mr_cache` on Linux, `show ipv6 mroute` and `show ipv6 pim state` in FRR, `show ipv6 mroute` in Cisco, and `show multicast route inet6` in Juniper to inspect forwarding tables and related multicast state. Monitor packet and byte counters to verify active forwarding.
