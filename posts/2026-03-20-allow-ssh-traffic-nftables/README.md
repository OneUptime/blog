# How to Allow SSH Traffic with nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, SSH, Networking, Security

Description: Configure nftables rules to allow inbound SSH traffic on port 22 while keeping your firewall ruleset clean and maintainable.

## Introduction

nftables is the modern Linux firewall framework replacing iptables. One of the first rules you need on any server is allowing SSH traffic so you can manage it remotely. This guide shows how to add SSH rules safely without locking yourself out.

## Prerequisites

- Linux system with nftables installed (kernel 3.13+)
- Root or sudo access
- nftables service running (`systemctl status nftables`)

## Basic nftables Table and Chain Setup

Before adding rules, you need a table and an input chain. If you are starting fresh, create them first, but keep the input chain policy at `accept` until your allow rules are in place.

```bash
# Create an inet table (handles both IPv4 and IPv6)

nft add table inet filter

# Create an input chain first. Keep policy accept while building rules
nft add chain inet filter input { type filter hook input priority 0 \; policy accept \; }

# Create forward and output chains
nft add chain inet filter forward { type filter hook forward priority 0 \; policy drop \; }
nft add chain inet filter output { type filter hook output priority 0 \; policy accept \; }
```

## Allow SSH Traffic on Port 22

If you are building rules interactively, add the allow rules first and only switch the input chain to a drop policy after the ruleset is complete. Always allow established/related connections before enabling a drop policy so existing sessions are not interrupted.

```bash
# Allow already-established connections before enabling a drop policy
nft add rule inet filter input ct state established,related accept

# Allow loopback interface traffic
nft add rule inet filter input iif lo accept

# Allow SSH on port 22 from any source
nft add rule inet filter input tcp dport 22 accept
```

## Restrict SSH to Specific Source IPs

Limiting SSH access to known management IPs significantly reduces attack surface.

In an `inet` table, `ip saddr` matches IPv4 sources only. Use `ip6 saddr` for IPv6 source restrictions.

```bash
# Allow SSH only from a specific IPv4 address
nft add rule inet filter input ip saddr 203.0.113.10 tcp dport 22 accept

# Allow SSH from an IPv4 CIDR range (e.g., office subnet)
nft add rule inet filter input ip saddr 10.0.0.0/8 tcp dport 22 accept
```

## Allow SSH on a Non-Standard Port

If you run SSH on a custom port to reduce noise from automated scans:

```bash
# Allow SSH on port 2222
nft add rule inet filter input tcp dport 2222 accept
```

## Verify the Ruleset

After adding rules, verify they appear correctly.

```bash
# List all rules in the inet filter table
nft list table inet filter

# Show rules with handle numbers (needed to delete specific rules)
nft -a list table inet filter
```

## Save Rules Persistently

Rules added with `nft add` are not persistent across reboots. Save the current ruleset to the configuration file used by your distribution's `nftables` service.

```bash
# Save ruleset to a configuration file commonly loaded by nftables
echo "flush ruleset" > /etc/nftables.conf
nft list ruleset >> /etc/nftables.conf

# Enable nftables to load the ruleset on boot
systemctl enable nftables
```

## Full Example Ruleset

A complete, minimal nftables configuration file allowing SSH:

```bash
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif lo accept

        # Allow established and related connections
        ct state established,related accept

        # Drop invalid packets
        ct state invalid drop

        # Allow ICMPv6 neighbor discovery so IPv6 connectivity works
        icmpv6 type { nd-neighbor-solicit, nd-router-advert, nd-neighbor-advert } accept

        # Allow SSH from anywhere
        tcp dport 22 accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

Load this file with:

```bash
nft -f /etc/nftables.conf
```

## Conclusion

Allowing SSH with nftables requires creating the right table, chain, and rule ordering. Always allow established connections before applying a drop policy to avoid disrupting active sessions. Restrict SSH by source IP when possible, and persist your rules so they survive reboots.
