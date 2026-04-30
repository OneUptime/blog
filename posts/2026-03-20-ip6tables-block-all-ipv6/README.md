# How to Configure ip6tables to Block All IPv6 Traffic Except Allowed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, Firewall, Linux, Security

Description: Learn how to configure a strict ip6tables policy that blocks all IPv6 traffic by default and explicitly allows only the minimum required traffic for a secure server.

## Overview

A "block all except allowed" (default-deny) policy is the most secure firewall posture. For IPv6 this means setting DROP as the default policy for INPUT and FORWARD chains, then explicitly allowing only the traffic that your specific server requires. This guide provides complete default-deny templates for different server types.

## Core Principle

```text
Default policy: DROP everything
Then: ACCEPT specific, well-defined traffic
```

This is the opposite of "allow all except blocked" (default-allow), which fails when you forget to block something.

## Reset and Apply Default-Deny

```bash
#!/bin/bash
# Complete reset and apply default-deny

# Flush filter-table rules and delete custom chains

ip6tables -F
ip6tables -X
ip6tables -Z   # Zero counters

# Set default DROP for incoming and forwarding
ip6tables -P INPUT   DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT  ACCEPT   # Usually allow all outbound

echo "All IPv6 INPUT and FORWARD traffic is now BLOCKED"
```

## Minimum Required Rules (Any Server)

Every server needs at least these core rules to function; if it relies on Router Advertisements for addressing or a default route, keep the RA rule shown below:

```bash
# 1. Loopback (required for local processes)
ip6tables -A INPUT -i lo -j ACCEPT

# 2. Established connections (required for replies and ICMP error handling)
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 3. Drop invalid packets
ip6tables -A INPUT -m conntrack --ctstate INVALID -j DROP

# 4. Packet Too Big - NEVER block (breaks PMTUD for all large transfers)
ip6tables -A INPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT

# 5. Other essential ICMPv6 error handling
ip6tables -A INPUT -p icmpv6 --icmpv6-type 1 -j ACCEPT  # Destination Unreachable
ip6tables -A INPUT -p icmpv6 --icmpv6-type 3 -j ACCEPT  # Time Exceeded
ip6tables -A INPUT -p icmpv6 --icmpv6-type 4 -j ACCEPT  # Parameter Problem

# 6. Router Advertisements (if used) and Neighbor Discovery
ip6tables -A INPUT -s fe80::/10 -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 134 -j ACCEPT
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 135 -j ACCEPT
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 136 -j ACCEPT
```

## Template: Web Server

```bash
#!/bin/bash
# Web server: Allow HTTP/HTTPS + SSH from management

ip6tables -F && ip6tables -X
ip6tables -P INPUT DROP && ip6tables -P FORWARD DROP && ip6tables -P OUTPUT ACCEPT

# Minimum required
ip6tables -A INPUT -i lo -j ACCEPT
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A INPUT -m conntrack --ctstate INVALID -j DROP
ip6tables -A INPUT -p icmpv6 --icmpv6-type 1 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type 3 -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type 4 -j ACCEPT
ip6tables -A INPUT -s fe80::/10 -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 134 -j ACCEPT
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 135 -j ACCEPT
ip6tables -A INPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 136 -j ACCEPT

# Web traffic
ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# SSH from management only
ip6tables -A INPUT -p tcp --dport 22 -s fd00:1234:5678::/48 -j ACCEPT

# Log and final drop
ip6tables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "WEB-SRV-DROP: "
```

## Template: Database Server

```bash
#!/bin/bash
# Database server: Very restrictive - only app servers can connect

ip6tables -F && ip6tables -X
ip6tables -P INPUT DROP && ip6tables -P FORWARD DROP && ip6tables -P OUTPUT DROP

# Minimum required (same as above, plus outbound NDP because OUTPUT is DROP)
ip6tables -A INPUT  -i lo -j ACCEPT
ip6tables -A OUTPUT -o lo -j ACCEPT
ip6tables -A INPUT  -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A INPUT  -m conntrack --ctstate INVALID -j DROP
ip6tables -A INPUT  -p icmpv6 --icmpv6-type 1 -j ACCEPT
ip6tables -A INPUT  -p icmpv6 --icmpv6-type 2 -j ACCEPT
ip6tables -A INPUT  -p icmpv6 --icmpv6-type 3 -j ACCEPT
ip6tables -A INPUT  -p icmpv6 --icmpv6-type 4 -j ACCEPT
ip6tables -A INPUT  -s fe80::/10 -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 134 -j ACCEPT
ip6tables -A INPUT  -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 135 -j ACCEPT
ip6tables -A INPUT  -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 136 -j ACCEPT

# Database access - app servers only
ip6tables -A INPUT -p tcp --dport 5432 -s 2001:db8:100::/64 -j ACCEPT

# SSH from management only
ip6tables -A INPUT -p tcp --dport 22 -s fd00:1234:5678::/48 -j ACCEPT

# Outbound: DNS, NTP, and the ICMPv6 needed for router/neighbor discovery
ip6tables -A OUTPUT -p udp --dport 53 -j ACCEPT
ip6tables -A OUTPUT -p udp --dport 123 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 133 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 135 -j ACCEPT
ip6tables -A OUTPUT -p icmpv6 -m hl --hl-eq 255 --icmpv6-type 136 -j ACCEPT

# Log all drops
ip6tables -A INPUT  -m limit --limit 5/min -j LOG --log-prefix "DB-IN-DROP: "
ip6tables -A OUTPUT -m limit --limit 5/min -j LOG --log-prefix "DB-OUT-DROP: "
```

## Testing Without Locking Yourself Out

```bash
# ALWAYS test with a timer that reverts changes if you lose access:
# Schedule revert 5 minutes from now
REVERT_JOB=$(
at now + 5 minutes 2>&1 << 'EOF' | awk '/^job / {print $2}'
ip6tables -F
ip6tables -P INPUT ACCEPT
ip6tables -P FORWARD ACCEPT
ip6tables -P OUTPUT ACCEPT
EOF
)

# Apply your new rules
./apply-new-rules.sh

# Test access - if successful, cancel the revert
atrm "$REVERT_JOB"
```

## Summary

A default-deny IPv6 firewall uses `ip6tables -P INPUT DROP` and explicitly allows: loopback (`-i lo`), established connections (`--ctstate ESTABLISHED,RELATED`), the essential ICMPv6 error messages, Router Advertisements if the host uses them, Neighbor Solicitation/Advertisement with hop limit 255, and specific service ports. If the system forwards IPv6 traffic, include Packet Too Big (type 2) in the FORWARD path as well - its absence causes mysterious large-transfer failures. Use the at-based safety timer when testing new policies to avoid permanent lockout. Save working rules with `ip6tables-save`.
