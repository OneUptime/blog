# How to Use rdisc6 for Router Discovery Diagnostics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Rdisc6, Router Discovery, Router Advertisement, IPv6

Description: Use rdisc6 to send Router Solicitations and display Router Advertisements, decode RA contents, and diagnose router discovery problems.

## Introduction

`rdisc6` sends an ICMPv6 Router Solicitation and waits for Router Advertisement responses. It displays the complete contents of any RA received, including flags, prefix information, MTU options, and DNS server information. It is the IPv6 equivalent of a manual "what routers are on this link?" query and is invaluable for diagnosing SLAAC and router discovery issues.

## Basic rdisc6 Usage

```bash
# Send Router Solicitation and show any RA received

# Format: rdisc6 <interface>
sudo rdisc6 eth0

# Example output:
# Soliciting ff02::2 (ff02::2) on eth0...
#
# Hop limit                 :           64 (  0x40)
# Stateful address conf.    :           No
# Stateful other conf.      :           No
# Mobile home agent         :           No
# Router preference         :       medium
# Neighbor discovery proxy  :           No
# Router lifetime           :         1800 (0x00000708) seconds
# Reachable time            :  unspecified
# Retransmit time           :  unspecified
#  Source link-layer address: 00:11:22:33:44:55
#  Prefix                   : 2001:db8::/64
#    On-link                :          Yes
#    Autonomous address conf.:         Yes
#    Valid time             :30 days, (0x00278D00 seconds)
#    Pref. time             :7 days, (0x000927C0 seconds)
#  MTU                      :         1500 bytes
#  from fe80::1 on eth0

# Show multiple RS/RA exchanges (3 solicitations)
sudo rdisc6 -r 3 eth0

# Quiet mode: show only advertised IPv6 prefixes (useful in scripts)
sudo rdisc6 -q eth0
```

## Interpreting rdisc6 Output

```bash
# Checking M/O flags
sudo rdisc6 eth0 2>&1 | grep -E "Stateful"
# "Stateful address conf.: No"   → M=0 (SLAAC for addresses)
# "Stateful address conf.: Yes"  → M=1 (use DHCPv6 for addresses)
# "Stateful other conf.: No"     → O=0 (no stateless DHCPv6)
# "Stateful other conf.: Yes"    → O=1 (use DHCPv6 for DNS/NTP)

# Check prefix information
sudo rdisc6 eth0 2>&1 | grep -A 4 "Prefix"
# Shows each prefix, on-link status, autonomous (SLAAC) status, lifetimes

# Check router lifetime (critical: if 0, router is not a default GW)
sudo rdisc6 eth0 2>&1 | grep "Router lifetime"
# If 0 seconds: router won't be added to default router list!
# If > 0: router will be default gateway for this duration

# Check DNS server from RDNSS option
sudo rdisc6 eth0 2>&1 | grep -A 2 "DNS server"
# Shows DNS servers advertised via RFC 8106 RDNSS option

# Check MTU option
sudo rdisc6 eth0 2>&1 | grep "MTU"
# Shows link MTU as advertised by router
```

## Diagnosing Router Discovery Issues

```bash
# Issue 1: No RA received (router not advertising)
sudo timeout 10 rdisc6 eth0
# If no output: check if router is sending RAs
# On the router: verify radvd is running
# systemctl status radvd

# Issue 2: RA received but wrong flags
sudo rdisc6 eth0 | grep -E "Stateful|Autonomous"
# If M=1 and A=1 (autonomous): hosts will have both SLAAC and DHCPv6 addresses
# Fix: set A=0 in radvd.conf prefix block

# Issue 3: Router Lifetime = 0
sudo rdisc6 eth0 | grep "Router lifetime"
# If 0: router is explicitly not a default gateway
# Fix: set AdvDefaultLifetime > 0 in radvd.conf

# Issue 4: Wrong prefix being advertised
sudo rdisc6 eth0 | grep "Prefix"
# Verify prefix matches expected network

# Issue 5: RA not reaching hosts (firewall blocking)
sudo tcpdump -i eth0 "icmp6 and ip6[40] == 134" -c 1 -v
# If no RA captured: blocked at firewall or switch
```

## Comparing with tcpdump

```bash
# rdisc6 is higher-level; for raw bytes use tcpdump
# They complement each other

# rdisc6: shows decoded RA content (easy to read)
sudo rdisc6 eth0

# tcpdump: shows all RAs including periodic ones
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134"

# Combined: use rdisc6 for quick check, tcpdump for ongoing monitoring
# Watch for periodic RAs (every MaxRtrAdvInterval seconds)
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 134" | \
    awk '{print "RA received at " $1}'
```

## Conclusion

`rdisc6` is the quickest way to check what Router Advertisements a segment is receiving. Its decoded output immediately shows M/O flags, prefix information with lifetimes, MTU, and DNS servers. For diagnosing SLAAC issues, `rdisc6` output confirms whether the correct prefix is being advertised with the correct flags. For ongoing monitoring, use tcpdump to capture periodic RAs. When `rdisc6` receives no response, check for RA-blocking firewalls or a misconfigured/non-running radvd.
