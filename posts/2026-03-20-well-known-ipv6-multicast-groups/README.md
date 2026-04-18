# How to Understand Well-Known IPv6 Multicast Groups (ff02::1, ff02::2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, NDP, Routing Protocols, Network Fundamentals

Description: A reference guide to the most important well-known IPv6 multicast groups, explaining what each group is used for and which protocols depend on them.

## What Are Well-Known Multicast Groups?

Well-known multicast groups are permanently assigned IPv6 multicast addresses registered with IANA. They use the flag bits T=0 (not transient), meaning they are fixed and not dynamically assigned. Every IPv6-capable device understands and uses these groups.

## The Essential Well-Known Groups

### ff02::1 - All Nodes (Link-Local)

Every IPv6-capable interface automatically joins this group. Packets sent to `ff02::1` reach all IPv6 nodes on the link.

```bash
# ping all nodes on the link (equivalent to IPv4 broadcast ping)

ping6 -c 3 ff02::1%eth0

# Verify your interface has joined ff02::1
ip -6 maddr show dev eth0 | grep 'ff02::1'
```

Used by: Neighbor Discovery (NDP) - Router Advertisement sent to ff02::1 to announce routes and prefixes.

### ff02::2 - All Routers (Link-Local)

Only routers (devices with IPv6 forwarding enabled) join this group. Hosts send Router Solicitations to `ff02::2`.

```bash
# Check if a router is present: send Router Solicitation to ff02::2
# This is done automatically by the kernel, but you can trigger it:
rdisc6 -1 eth0  # Sends RS to ff02::2 and waits for RA

# Check if this node has joined ff02::2 (only if it's a router)
ip -6 maddr show dev eth0 | grep 'ff02::2'
sysctl net.ipv6.conf.eth0.forwarding  # 1 = router, joins ff02::2
```

### ff02::5 and ff02::6 - OSPFv3

OSPFv3 (IPv6 version of OSPF) uses two multicast groups:

```text
ff02::5 - OSPFv3 all SPF routers (all OSPFv3 neighbors)
ff02::6 - OSPFv3 all DR/BDR (Designated Routers)
```

```bash
# Verify OSPFv3 has joined these groups on a router
ip -6 maddr show | grep -E 'ff02::5|ff02::6'
```

### ff02::9 - RIPng Routers

RIPng (Routing Information Protocol for IPv6) uses `ff02::9` for routing updates:

```bash
# RIPng uses ff02::9 for updates
# Verify with tcpdump
tcpdump -i eth0 -n 'ip6 dst ff02::9'
```

### ff02::a - EIGRP Routers

Cisco's EIGRP for IPv6 uses `ff02::a` for hello and update packets.

### ff02::d - PIM Routers

Protocol Independent Multicast (PIM) uses `ff02::d` for hello messages between PIM routers.

### ff02::fb - mDNS (Multicast DNS)

Multicast DNS uses `ff02::fb` for service discovery on the local link. This is used by Apple's Bonjour/Zeroconf and Avahi on Linux.

```bash
# Query mDNS over IPv6
avahi-browse _http._tcp
# Or using dns-sd
dns-sd -B _http._tcp local

# Capture mDNS traffic
tcpdump -i eth0 -n 'ip6 dst ff02::fb and port 5353'
```

### ff02::1:2 - DHCPv6 Relay Agents and Servers

DHCPv6 clients send to `ff02::1:2` (all relay agents and servers) for address requests:

```bash
# DHCPv6 clients use this group for discovery
# Capture DHCPv6 discovery packets
tcpdump -i eth0 -n 'ip6 dst ff02::1:2 and port 546'
```

### ff02::1:3 - LLMNR (Link-Local Multicast Name Resolution)

Defined in RFC 4795, LLMNR uses `ff02::1:3` for name resolution on the local link when DNS is unavailable. Note: the DHCPv6 "All Servers" group is actually `ff05::1:3` (site-local scope), not link-local.

## Complete Reference Table

```text
ff02::1    All nodes (every IPv6 node)
ff02::2    All routers
ff02::3    Unassigned
ff02::4    DVMRP routers
ff02::5    OSPFv3 all SPF routers
ff02::6    OSPFv3 all DR routers
ff02::7    ST routers
ff02::8    ST hosts
ff02::9    RIPng routers
ff02::a    EIGRP routers
ff02::b    Mobile IPv6 agents
ff02::c    SSDP (Simple Service Discovery Protocol)
ff02::d    PIM routers
ff02::e    RSVP encapsulation
ff02::f    UPnP
ff02::12   VRRP (Virtual Router Redundancy Protocol)
ff02::fb   mDNS
ff02::1:2  DHCPv6 relay agents and servers
ff02::1:3  LLMNR (Link-Local Multicast Name Resolution)
ff02::1:ff00:0/104  Solicited-node prefix (ff02::1:ffXX:XXXX)
```

## Monitoring Multicast Group Membership

```bash
# See all multicast groups on all interfaces
ip -6 maddr show

# See groups on a specific interface
ip -6 maddr show dev eth0

# Count groups per interface
ip -6 maddr show | grep 'link' | wc -l
```

## Summary

Well-known IPv6 multicast groups are foundational to IPv6 networking. Every IPv6 interface joins `ff02::1` (all nodes) and devices with forwarding join `ff02::2` (all routers). Routing protocols use specific groups: OSPFv3 uses `ff02::5/6`, RIPng uses `ff02::9`. Services like mDNS (`ff02::fb`) and DHCPv6 (`ff02::1:2`) depend on these groups for discovery. These groups operate at link-local scope and are automatically managed by the OS.
