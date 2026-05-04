# How to Configure IPv6 Firewall Rules with pf on FreeBSD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, FreeBSD, Pf, Firewall, Network Security

Description: Learn how to configure IPv6 firewall rules using pf (Packet Filter) on FreeBSD, including allowing essential ICMPv6 traffic and creating rules for IPv6 services.

## Enable pf on FreeBSD

```bash
# Enable pf in /etc/rc.conf

cat >> /etc/rc.conf << 'EOF'
pf_enable="YES"
pf_rules="/etc/pf.conf"
EOF

service pf start
```

## Basic pf IPv6 Structure

```bash
# /etc/pf.conf - basic template with IPv6 support

# Macros
ext_if="em0"
int_if="em1"
ipv6_gw="2001:db8::1"

# Scrub
match in all scrub (no-df max-mss 1440)

# Default policy
block all

# Allow loopback
pass quick on lo0

# ===== IPv6 Rules =====

# Allow essential ICMPv6 (MUST NOT block these)
# Neighbor Discovery Protocol (NDP) - equivalent of ARP for IPv6
pass quick inet6 proto icmp6 icmp6-type {
    echoreq echorep    # ping6
    routeradv routersol  # RA/RS
    neighbradv neighbrsol  # NDP (NA/NS)
    redir              # ICMPv6 redirect
}

# Allow inbound established/related
pass in quick inet6 proto tcp flags S/SA modulate state
pass in quick inet6 proto udp keep state

# Allow SSH over IPv6
pass in on $ext_if inet6 proto tcp to port 22

# Allow HTTPS over IPv6
pass in on $ext_if inet6 proto tcp to port 443
```

## Allow/Block Specific IPv6 Addresses

```bash
# Allow traffic from a specific IPv6 address
pass in inet6 from 2001:db8::1

# Block an IPv6 address
block in quick inet6 from 2001:db8::bad:1

# Allow from a subnet
pass in inet6 from 2001:db8::/32

# Block an entire subnet
block in quick inet6 from 2001:db8:dead::/48
```

## IPv6 NAT (Not Typical)

```bash
# IPv6 generally doesn't use NAT, but pf supports it for NPTv6 (prefix translation)
# RFC 6296 - Network Prefix Translation

# NPTv6: translate an internal prefix to an external prefix
match out on $ext_if inet6 from fd00:db8::/48 binat-to 2001:db8::/48
```

## ICMPv6 Rules in Detail

```bash
# ICMPv6 types that MUST be allowed for IPv6 to work:
# 1   = Destination Unreachable
# 2   = Packet Too Big (PMTUD - critical!)
# 3   = Time Exceeded
# 4   = Parameter Problem
# 133 = Router Solicitation
# 134 = Router Advertisement
# 135 = Neighbor Solicitation
# 136 = Neighbor Advertisement
# 137 = Redirect

# Comprehensive ICMPv6 allow rule
pass quick inet6 proto icmp6 icmp6-type {
    unreach toobig timex paramprob
    echoreq echorep
    routersol routeradv
    neighbrsol neighbradv
    redir
}
```

## Apply and Test pf Rules

```bash
# Check pf.conf syntax
pfctl -nf /etc/pf.conf

# Load rules (without enabling)
pfctl -f /etc/pf.conf

# Enable pf
pfctl -e

# Disable pf
pfctl -d

# Show current rules
pfctl -sr

# Show state table
pfctl -ss | grep inet6

# Show statistics
pfctl -s info
```

## Summary

Configure IPv6 firewall rules in pf with `inet6` keyword in rules. Always allow essential ICMPv6 types (unreach, toobig, timex, neighbrsol, neighbradv, routersol, routeradv) - blocking them breaks IPv6 NDP and PMTUD. Block specific hosts with `block in quick inet6 from <address>`, allow subnets with `pass in inet6 from <prefix>`. Check syntax with `pfctl -nf /etc/pf.conf` before loading rules.
