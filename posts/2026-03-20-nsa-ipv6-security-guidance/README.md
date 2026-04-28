# How to Follow NSA IPv6 Security Guidance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, NSA, Guidance, Best Practice

Description: Learn the key security recommendations from NSA's IPv6 security guidance covering risks from accidental activation, tunneling threats, and required security controls.

## Overview

The NSA (National Security Agency) has published IPv6 security guidance addressing the security challenges of IPv6 adoption, with particular focus on risks from automatic tunneling mechanisms, unintended IPv6 activation, and the difficulty of achieving security parity with IPv4 during transition. The guidance is aimed at DoD and federal networks but applies broadly.

## Core NSA Recommendations

### 1. Address Inadvertent IPv6 Activation

The NSA notes that IPv6 is enabled by default on all modern operating systems and network devices, creating an unmanaged attack surface on "IPv4-only" networks:

```bash
# Check for active IPv6 on supposedly IPv4-only hosts

ip -6 addr show | grep -v 'scope link'
# Any output here means IPv6 is active

# Check for IPv6 routing
ip -6 route show | grep -v 'fe80'
# Any global route = IPv6 is being used
```

**Mitigation:** Explicitly decide whether IPv6 is needed. If not, disable it at the OS and network level.

### 2. Prioritize Native IPv6 Over Tunneling

The NSA strongly prefers native dual-stack over automatic tunneling mechanisms:

| Approach | NSA Stance |
|----------|-----------|
| Native dual-stack | Preferred - visibility and control |
| Manual 6in4 tunnels | Acceptable with proper controls |
| 6to4 (RFC 3056) | Avoid - deprecated, uncontrolled |
| Teredo | Avoid - bypasses firewalls via UDP/NAT |
| ISATAP | Avoid in external networks |

### 3. Block Tunneling at Network Boundary

```bash
# NSA-recommended blocking at perimeter
# Block IPv6-in-IPv4 (protocol 41)
iptables -A FORWARD -p 41 -j DROP
iptables -A INPUT -p 41 -j DROP

# Block Teredo
iptables -A FORWARD -p udp --dport 3544 -j DROP
iptables -A FORWARD -p udp --sport 3544 -j DROP

# Block 6to4 relay
iptables -A FORWARD -d 192.88.99.0/24 -j DROP
iptables -A FORWARD -s 192.88.99.0/24 -j DROP

# Block GRE
iptables -A FORWARD -p 47 -j DROP
```

### 4. Deploy First-Hop Security

The NSA recommends full deployment of first-hop security mechanisms on all network segments:

```text
Priority 1: RA Guard on all access ports
Priority 2: DHCPv6 Guard on all access ports
Priority 3: SAVI (Source Address Validation) on access ports
Priority 4: Port-security for NDP (limit neighbor table entries)
```

```text
! Cisco: Full first-hop security on access port
ipv6 nd raguard policy HOST
  device-role host
ipv6 dhcp guard policy DHCP-GUARD
  device-role client

interface GigabitEthernet0/1
  ipv6 nd raguard attach-policy HOST
  ipv6 dhcp guard attach-policy DHCP-GUARD
  ipv6 nd inspection attach-policy DEFAULT
```

### 5. Firewall Must Inspect IPv6

The NSA warns that many organizations have IPv4 firewalls with no IPv6 capability, creating a gap:

```bash
# Test: Is your firewall inspecting IPv6?
# Send IPv6 traffic that should be blocked and verify it's dropped
ping6 -c 3 2001:4860:4860::8888   # Google's IPv6 DNS

# If ping succeeds but you have no IPv6 policy - you have a gap
# Check firewall logs for IPv6 entries
```

### 6. IPv6 in the Security Stack

NSA recommends validating that your entire security stack supports IPv6:

```text
[ ] Firewall - supports stateful IPv6 inspection
[ ] IDS/IPS - can decode IPv6 extension headers
[ ] SIEM - ingests IPv6 log data
[ ] Vulnerability Scanner - scans IPv6 addresses
[ ] NetFlow/IPFIX - exports IPv6 flow records
[ ] DNS - DNSSEC-enabled for AAAA records
[ ] NTP - can sync over IPv6
[ ] Syslog - can send/receive over IPv6
```

### 7. Router and Switch Hardening

NSA recommends hardening network infrastructure for IPv6:

```bash
# Cisco: Restrict management access to IPv6
line vty 0 4
 ipv6 access-class IPv6-MGMT-ACL in

! Create ACL allowing only management network
ipv6 access-list IPv6-MGMT-ACL
  permit ipv6 fd00:dead:beef::/48 any
  deny   ipv6 any any log

! Disable unused IPv6 features
no ipv6 multicast-routing    ! Unless needed
no ipv6 mobile home-agent    ! Disable mobile IPv6
```

### 8. Monitor for IPv6-Based Attacks

```bash
# Monitor for rogue RA (ICMPv6 type 134 from unexpected sources)
tcpdump -i eth0 'icmp6 and ip6[40] == 134' -l | while read line; do
  echo "$(date): $line" >> /var/log/ipv6-ra-alerts.log
done

# Monitor for NDP exhaustion attempts
ip -6 neigh show | wc -l
# Alert if > threshold
```

## NSA IPv6 Security Checklist

```text
Infrastructure:
[ ] All routers and firewalls have explicit IPv6 policies
[ ] IPv6 traffic is logged and monitored
[ ] Tunneling mechanisms blocked at perimeter (protocol 41, UDP 3544, GRE)
[ ] Routing protocols use authentication for IPv6

Hosts:
[ ] IPv6 disabled on hosts that don't need it
[ ] Teredo/ISATAP disabled on Windows workstations
[ ] IPv6 firewall rules mirror IPv4 rules

Network:
[ ] RA Guard on all access ports
[ ] DHCPv6 Guard on all access ports
[ ] Bogon prefix filtering at ingress

Monitoring:
[ ] SIEM captures IPv6 events
[ ] Alerts for rogue RA activity
[ ] Vulnerability scans include IPv6 addresses
```

## Summary

NSA IPv6 security guidance emphasizes that IPv6 is already present in most networks whether intended or not, and that organizations must actively manage it. Key actions: disable IPv6 where not needed, block all tunneling mechanisms, deploy first-hop security (RA Guard, DHCPv6 Guard), ensure the full security stack supports IPv6 inspection and logging, and monitor for unauthorized IPv6 activity including rogue Router Advertisements.
