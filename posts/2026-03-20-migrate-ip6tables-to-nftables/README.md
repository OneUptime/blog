# How to Migrate from ip6tables to nftables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, nftables, Migration, Linux

Description: Step-by-step guide to migrating from ip6tables to nftables, using automated conversion tools and manual review to ensure no security policy gaps during the transition.

## Overview

The xtables-based ip6tables workflow is considered legacy on modern Linux systems, and nftables is its successor. The `ip6tables-translate` and `ip6tables-restore-translate` tools can automatically convert many ip6tables rules to nftables syntax. This guide covers the conversion process, common translation issues, and how to verify the migrated rules work correctly.

## Prerequisites

```bash
# Verify nftables is available

nft --version

# Verify translation tools are installed
ip6tables-translate --version
# Part of iptables package on Debian/Ubuntu

# Install if missing
apt install nftables iptables   # nft comes from nftables; translation tools come from iptables
```

## Step 1: Export Current ip6tables Rules

```bash
# Save current IPv6 rules to file
ip6tables-save > /tmp/ip6tables-backup.rules

# Verify backup
cat /tmp/ip6tables-backup.rules
```

## Step 2: Translate to nftables Syntax

### Automatic Translation

```bash
# Translate the entire ip6tables ruleset to nftables
ip6tables-restore-translate -f /tmp/ip6tables-backup.rules > /tmp/nftables-translated.nft

# Review the translated file
cat /tmp/nftables-translated.nft
```

### Translate Individual Rules

```bash
# Translate a single ip6tables rule
ip6tables-translate -A INPUT -p tcp --dport 22 -j ACCEPT
# Output: nft 'add rule ip6 filter INPUT tcp dport 22 counter accept'

ip6tables-translate -A INPUT -s fe80::/10 -p icmpv6 --icmpv6-type 134 -j ACCEPT
# Output: nft 'add rule ip6 filter INPUT meta l4proto ipv6-icmp ip6 saddr fe80::/10 icmpv6 type nd-router-advert counter accept'
```

## Step 3: Review Translation

Common translation issues to check:

### Module-Specific Translations

```bash
# ip6tables -m state → nftables ct state
# ip6tables: -m state --state ESTABLISHED,RELATED -j ACCEPT
# nftables:  ct state established,related accept

# ip6tables -m limit → nftables limit rate
# ip6tables: -m limit --limit 10/s
# nftables:  limit rate 10/second

# ip6tables -m recent → no automatic translation
# ip6tables: -m recent --name SSH --rcheck --seconds 60 --hitcount 4
# nftables:  meters or dynamic sets can be used, but this needs a manual rewrite
```

### Things Not Automatically Converted

```bash
# Per-source SSH rate limiting (recent module)
# ip6tables:
ip6tables -A INPUT -p tcp --dport 22 -m recent --name SSH --rcheck --seconds 60 --hitcount 4 -j DROP
ip6tables -A INPUT -p tcp --dport 22 -m recent --name SSH --set -j ACCEPT

# nftables example (manual rewrite):
# table ip6 filter {
#     set SSH_TRACK {
#         type ipv6_addr
#         timeout 60s
#         flags dynamic
#     }
#     chain input {
#         type filter hook input priority 0; policy accept;
#         ct state new tcp dport 22 update @SSH_TRACK { ip6 saddr limit rate over 3/minute } drop
#         tcp dport 22 accept
#     }
# }
```

## Step 4: Convert to inet (Unified) Format

After translating ip6tables rules, consider upgrading to unified inet format:

```bash
# ip6 family (translated) → inet family (review each rule carefully)
# Replace:
#   table ip6 filter { ... }
# With:
#   table inet filter { ... }

# Example: Translated ip6-only rule
# nft add rule ip6 filter input tcp dport 22 counter accept

# In an inet table, keep an IPv6-only rule scoped to IPv6:
# nft add rule inet filter input meta nfproto ipv6 tcp dport 22 counter accept

# Omit the family qualifier only if you intentionally want one rule to match both IPv4 and IPv6:
# nft add rule inet filter input tcp dport 22 counter accept
```

## Step 5: Apply and Test

```bash
# 1. Back up current ip6tables rules
ip6tables-save > /tmp/ip6tables-backup.rules

# 2. Safety timer - auto-reverts if testing fails
at_job=$(at now + 5 minutes << 'EOF' 2>&1 | awk '/^job / { print $2 }')
nft flush ruleset
ip6tables-restore < /tmp/ip6tables-backup.rules
EOF

# 3. Stop old persistence service if present
systemctl stop netfilter-persistent 2>/dev/null
# Also remove the active legacy ruleset before testing so it does not run alongside nftables.

# 4. Apply translated nftables rules
nft -f /tmp/nftables-translated.nft

# 5. Test connectivity
ping6 -c 3 2001:4860:4860::8888
ssh user@your-server.com -p 22

# 6. If everything works, cancel the safety timer
atrm "$at_job"
```

## Step 6: Disable ip6tables, Enable nftables

```bash
# Disable old ip6tables persistence
systemctl disable netfilter-persistent 2>/dev/null || true
systemctl disable ip6tables 2>/dev/null || true

# Save new nftables ruleset
nft list ruleset > /etc/nftables.conf

# Enable nftables persistence
systemctl enable --now nftables

# Verify on reboot
systemctl is-enabled nftables
```

## Example: Before and After

### Before (ip6tables)

```bash
ip6tables -P INPUT DROP
ip6tables -A INPUT -i lo -j ACCEPT
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
ip6tables -A INPUT -s fe80::/10 -p icmpv6 --icmpv6-type neighbour-solicitation -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### After (nftables)

```bash
table ip6 filter {
    chain input {
        type filter hook input priority 0; policy drop;
        iif "lo" accept
        ct state established,related accept
        icmpv6 type packet-too-big accept
        ip6 saddr fe80::/10 icmpv6 type nd-neighbor-solicit accept
        tcp dport 443 accept
    }
}
```

## Summary

Migrate ip6tables to nftables using `ip6tables-restore-translate -f rules.file > nftables.nft` for bulk conversion, and `ip6tables-translate` for individual rules. Review the output for module-specific issues (`-m recent` needs manual rewriting). Use a safety timer (`at now + 5 minutes`) that auto-reverts if you lose access. After successful testing, disable any old ip6tables persistence service and enable `nftables` with `systemctl enable --now nftables`. Consider upgrading from `ip6` to `inet` family tables to handle both IPv4 and IPv6 in a unified ruleset, but review each rule so you do not accidentally broaden an IPv6-only rule to IPv4.
