# How to Configure IPv6 Firewall Rules on macOS pf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Pf, Firewall, BSD

Description: Learn how to configure IPv6 firewall rules on macOS using pf (Packet Filter), including configuration file syntax, IPv6 address filtering, ICMPv6 rules, and persistent configuration.

## Overview

macOS uses pf (Packet Filter), the same BSD firewall as OpenBSD and FreeBSD. IPv6 is supported natively alongside IPv4. pf configuration lives in `/etc/pf.conf`, and `pass` rules are stateful by default. macOS includes a simple firewall GUI, but pf provides much more control. IPv6 rules in pf use the same syntax as IPv4 with `inet6` keyword.

## Checking pf Status

```bash
# Check if pf is enabled

sudo pfctl -s info | grep Status

# Enable pf (disabled by default on macOS)
sudo pfctl -e

# Load configuration
sudo pfctl -f /etc/pf.conf

# Show current rules
sudo pfctl -s rules

# Show IPv6 rules specifically
sudo pfctl -s rules | grep inet6
```

## Basic pf.conf Configuration

```bash
# /etc/pf.conf - macOS IPv6 firewall configuration

# Define interfaces
ext_if = "en0"    # External/WAN interface
int_if = "en1"    # Internal/LAN interface

# Define address groups
mgmt_ipv6 = "{ 2001:db8:100::10 }"
internal_ipv6 = "{ 2001:db8:200::/48 }"

# ==== Normalization ====
# Scrub IPv6 packets (normalize and reassemble fragments)
scrub in on $ext_if inet6 all fragment reassemble

# ==== Stateful Tables ====
# Block bogon sources
table <bogon_ipv6> const { \
    ::/128, ::1/128, ::ffff:0:0/96, \
    fc00::/7, fe80::/10 }

# ==== Default Policy ====
block in inet6 all

# Allow loopback
pass quick on lo0

# ==== ICMPv6 Rules ====
# Packet Too Big - NEVER block (required for PMTUD)
pass in quick inet6 proto icmp6 icmp6-type 2

# Essential error reporting
pass in quick inet6 proto icmp6 icmp6-type 1
pass in quick inet6 proto icmp6 icmp6-type 3
pass in quick inet6 proto icmp6 icmp6-type 4

# Router discovery from link-local only
pass quick inet6 proto icmp6 from fe80::/10 icmp6-type 133
pass quick inet6 proto icmp6 from fe80::/10 icmp6-type 134

# Neighbor discovery
pass quick inet6 proto icmp6 icmp6-type 135
pass quick inet6 proto icmp6 icmp6-type 136

# Echo request
pass in inet6 proto icmp6 icmp6-type 128

# ==== Bogon Filtering ====
block in quick inet6 from <bogon_ipv6>

# ==== Stateful Rules ====
# Allow outbound - keep state for return traffic
pass out on $ext_if inet6 keep state

# Return traffic for outbound connections is handled automatically by the state table

# ==== Services ====
# SSH from management
pass in on $ext_if inet6 proto tcp from $mgmt_ipv6 to any port 22

# HTTPS from anywhere
pass in on $ext_if inet6 proto tcp from any to any port 443
```

## Apply the Configuration

```bash
# Test configuration syntax
sudo pfctl -n -f /etc/pf.conf

# Load new configuration
sudo pfctl -f /etc/pf.conf

# Load and enable
sudo pfctl -ef /etc/pf.conf
```

## Making pf Rules Persistent

To ensure your custom `pfctl` invocation runs at startup, use a launch daemon:

```bash
# Create launch daemon plist
sudo cat > /Library/LaunchDaemons/com.custom.pf.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.custom.pf</string>
    <key>ProgramArguments</key>
    <array>
        <string>/sbin/pfctl</string>
        <string>-ef</string>
        <string>/etc/pf.conf</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
EOF

sudo launchctl load /Library/LaunchDaemons/com.custom.pf.plist
```

## Viewing Active State Table

```bash
# Show current state table (like conntrack)
sudo pfctl -s states

# Count states
sudo pfctl -s states | wc -l

# Show info
sudo pfctl -s info

# Show active rules with statistics
sudo pfctl -s rules -v
```

## pf Tables (Dynamic Blocklists)

```bash
# Define dynamic table in pf.conf
table <blocklist6> persist

# Add to table at runtime
sudo pfctl -t blocklist6 -T add 2001:db8:bad::/48

# Remove from table
sudo pfctl -t blocklist6 -T delete 2001:db8:bad::/48

# List table contents
sudo pfctl -t blocklist6 -T show

# Block table in rules:
block in quick inet6 from <blocklist6>
```

## Summary

macOS pf IPv6 rules use `inet6` keyword to target IPv6 traffic. Key rules: `block in inet6 all` as the default inbound IPv6 policy, then `pass quick on lo0` for loopback, ICMPv6 Packet Too Big (type 2) allowed first (PMTUD), Router Solicitation/Advertisement from `fe80::/10`, Neighbor Solicitation/Advertisement allowed for NDP, and `pass out keep state` for stateful outbound. Tables (`<name>`) provide dynamic blocklists. Make rules persistent with a LaunchDaemon that runs `pfctl -ef /etc/pf.conf` at startup. Test configuration syntax with `pfctl -n -f /etc/pf.conf` before loading. Use `pfctl -s rules -v` to see rules with hit counters.
