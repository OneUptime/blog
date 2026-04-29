# How to Audit IPv6 Security Posture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Audit, Compliance, Assessment

Description: Learn how to conduct a structured audit of your IPv6 security posture, covering network discovery, firewall rule review, first-hop security, and monitoring gaps.

## Overview

An IPv6 security audit systematically validates that all IPv6-specific security controls are in place and functioning. Many organizations discover during audits that IPv6 is active on their networks but has no security policy - a common and dangerous gap that exists even in well-managed environments.

## Audit Scope and Preparation

Before beginning the audit, define scope:

```text
In scope:
- All routers and switches with IPv6 enabled
- All servers with AAAA DNS records or global IPv6 addresses
- Firewall rules for IPv6
- First-hop security configuration
- Monitoring and logging for IPv6

Out of scope (document separately):
- IPv6 tunneling infrastructure
- IPv6 VPN endpoints
```

## Step 1: Discover Active IPv6 Devices

```bash
# Passive discovery - capture NDP traffic

tcpdump -i eth0 'icmp6 and (ip6[40] == 135 or ip6[40] == 136)' -l -n \
  | awk '{print $3, $5}' | sort -u | tee /tmp/ipv6-hosts.txt

# Check router NDP tables
ssh router "show ipv6 neighbors"

# FRRouting
vtysh -c "show ipv6 neighbor"

# Check DNS for AAAA records
dig @internal-dns example.internal AAAA
# Compare with expected inventory
```

## Step 2: Review Firewall Rules

```bash
# List all IPv6 firewall rules
ip6tables -L -n -v --line-numbers
# Look for:
# - Rules that are too permissive (e.g., ACCEPT all)
# - Missing ICMPv6 required rules (Packet Too Big must be allowed)
# - Rules that allow all from ::/0 without restriction

# Check for IPv4 rules that have no IPv6 equivalent
iptables -L -n | grep ACCEPT > /tmp/ipv4-accepts.txt
ip6tables -L -n | grep ACCEPT > /tmp/ipv6-accepts.txt
diff /tmp/ipv4-accepts.txt /tmp/ipv6-accepts.txt
# Any IPv4 rule with no IPv6 counterpart = potential gap
```

## Step 3: First-Hop Security Audit

```bash
# Check if RA Guard is configured on switches
# Cisco:
show ipv6 nd raguard policy
show run | include raguard

# Verify RA Guard is attached to access interfaces
show run interface GigabitEthernet0/1 | include raguard

# Test RA Guard (from test host):
# If you can send an RA and it's received by another host - RA Guard is NOT working
```

## Step 4: Check for Rogue IPv6 Routers

```bash
# Listen for Router Advertisements and verify sources
tcpdump -i eth0 'icmp6 and ip6[40] == 134' -e -n

# Expected: Only your authorized routers' link-local addresses
# Unexpected: Any other source = rogue RA

# Use radvdump for readable output
radvdump 2>/dev/null | head -50
```

## Step 5: Validate ICMPv6 Policy

```bash
# Test Packet Too Big (must not be blocked - breaks PMTUD)
# From external host, send an oversized probe and check that PTB is received

# Test essential ICMPv6 behavior
ping -6 -c 2 <target>             # Echo request/reply
ping -6 -s 2000 -M do <target>    # Oversized probe to exercise PMTUD

# Capture Packet Too Big while testing
tcpdump -i eth0 'icmp6 and ip6[40] == 2' -n

# Verify these are logged in firewall logs
grep -Ei 'ICMPv6|icmp6|ip6tables' /var/log/syslog | head -20
# Exact log pattern depends on your logging format
```

## Step 6: Check Extension Header Filtering

```bash
# Verify Type 0 Routing Header is blocked
# Use scapy to send a packet with RH0
python3 -c "
from scapy.all import *
pkt = IPv6(dst='target')/IPv6ExtHdrRouting(type=0)/TCP(dport=80)
send(pkt)
"
# Should be dropped by firewall
```

## Step 7: Logging and Monitoring

```bash
# Check that IPv6 drops are being logged
ip6tables -L INPUT -n | grep LOG
# Should see LOG rules before DROP for auditing

# Check recent IPv6-related log entries locally
grep -Ei 'ICMPv6|icmp6|ip6tables' /var/log/syslog | head -20
# Exact log pattern depends on your logging format; verify the same events appear in SIEM

# Verify NetFlow includes IPv6
# On router (classic NetFlow):
show ipv6 flow export
# Flexible NetFlow platforms:
show flow exporter <exporter-name>
```

## Audit Checklist

```text
Network Discovery:
[ ] All IPv6 devices inventoried
[ ] No unexpected hosts with global addresses
[ ] All prefixes match IPAM records

Firewall:
[ ] Bogon prefixes blocked at ingress
[ ] Required ICMPv6 types permitted
[ ] Packet Too Big (type 2) allowed through
[ ] No IPv4 security rules without IPv6 equivalent
[ ] IPv6 rules reviewed in last 90 days

First-Hop Security:
[ ] RA Guard on all access ports
[ ] DHCPv6 Guard on all access ports
[ ] Only authorized routers sending RAs

Protocols:
[ ] RH0 (Routing Header Type 0) blocked
[ ] Hop-by-Hop headers rate-limited
[ ] Fragment policy defined

Monitoring:
[ ] IPv6 firewall drops logged
[ ] SIEM receiving IPv6 events
[ ] Alerts for new routers/prefixes
[ ] Rogue RA detection active
```

## Summary

An IPv6 security audit covers device discovery, firewall rule review (with parity check against IPv4 rules), first-hop security validation, rogue RA detection, ICMPv6 policy verification, and logging validation. The most common findings are: (1) IPv6 active with no firewall policy, (2) required ICMPv6 blocked, breaking PMTUD, (3) no first-hop security, allowing rogue RAs. Address these with the audit checklist and schedule quarterly re-audits.
