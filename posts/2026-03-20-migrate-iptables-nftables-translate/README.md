# How to Migrate iptables Rules to nftables Using iptables-translate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, iptables, Linux, Migration, Firewall, Translation

Description: Use iptables-translate and iptables-restore-translate to convert existing iptables rules to nftables syntax, enabling a smooth migration to the modern firewall framework.

The `iptables-translate` tool converts iptables rule syntax to equivalent nftables syntax. This makes migration feasible even with complex rulesets - you don't need to rewrite rules from scratch.

## Install Translation Tools

```bash
# iptables-translate is part of the iptables userspace package

which iptables-translate
# Example output: /usr/sbin/iptables-translate

# Install if missing on Debian/Ubuntu
sudo apt install iptables -y
```

## Translate Individual Rules

```bash
# Translate an iptables rule to nftables
iptables-translate -A INPUT -p tcp --dport 22 -j ACCEPT
# Output: nft 'add rule ip filter INPUT tcp dport 22 counter accept'

iptables-translate -A INPUT -s 192.168.1.0/24 -j ACCEPT
# Output: nft 'add rule ip filter INPUT ip saddr 192.168.1.0/24 counter accept'

iptables-translate -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# Output: nft 'add rule ip filter INPUT ct state related,established counter accept'

iptables-translate -A INPUT -j DROP
# Output: nft 'add rule ip filter INPUT counter drop'
```

## Translate a Saved Ruleset

For existing rules saved with iptables-save:

```bash
# Save current iptables rules
sudo iptables-save > /tmp/iptables-backup.txt

# Translate entire saved ruleset to nftables
sudo iptables-restore-translate -f /tmp/iptables-backup.txt

# Output (nftables syntax):
# # Translated by iptables-restore-translate
# add table ip filter
# add chain ip filter INPUT { type filter hook input priority 0; policy accept; }
# add chain ip filter FORWARD { type filter hook forward priority 0; policy accept; }
# add chain ip filter OUTPUT { type filter hook output priority 0; policy accept; }
# add rule ip filter INPUT iifname "lo" counter accept
# add rule ip filter INPUT ct state related,established counter accept
# add rule ip filter INPUT tcp dport 22 counter accept
```

## Save Translated Output to File

```bash
# Translate and save to nftables config
sudo iptables-restore-translate -f /tmp/iptables-backup.txt \
  > /tmp/nftables-translated.conf

# Review the output
cat /tmp/nftables-translated.conf

# Test without applying
sudo nft -c -f /tmp/nftables-translated.conf
# -c = check without applying changes

# Apply if test passes
sudo nft -f /tmp/nftables-translated.conf
```

## Common Translation Patterns

```bash
# iptables → nftables translation reference

# Block an IP
iptables-translate -A INPUT -s 1.2.3.4 -j DROP
# → nft 'add rule ip filter INPUT ip saddr 1.2.3.4 counter drop'

# Rate limiting
iptables-translate -A INPUT -p tcp --dport 22 -m limit --limit 4/min -j ACCEPT
# → nft 'add rule ip filter INPUT tcp dport 22 limit rate 4/minute burst 5 packets counter accept'

# Conntrack state
iptables-translate -A INPUT -m conntrack --ctstate NEW -j ACCEPT
# → nft 'add rule ip filter INPUT ct state new counter accept'

# MASQUERADE
iptables-translate -t nat -A POSTROUTING -o eth0 -j MASQUERADE
# → nft 'add rule ip nat POSTROUTING oifname "eth0" counter masquerade'

# LOG
iptables-translate -A INPUT -p tcp --dport 22 -j LOG --log-prefix "SSH: "
# → nft 'add rule ip filter INPUT tcp dport 22 counter log prefix "SSH: "'
```

## Migration Strategy

```bash
#!/bin/bash
# migrate-to-nftables.sh - Phased migration

# Step 1: Save current iptables rules
sudo iptables-save > /tmp/iptables-backup.txt

# Step 2: Translate
sudo iptables-restore-translate -f /tmp/iptables-backup.txt \
  > /etc/nftables-migrated.conf

# Step 3: Review and clean up translation
# (Remove 'counter' from rules if not needed, clean up comments)
cat /etc/nftables-migrated.conf

# Step 4: Test in isolation
sudo nft -c -f /etc/nftables-migrated.conf  # Syntax and validity check

# Step 5: Apply nftables
sudo nft -f /etc/nftables-migrated.conf
sudo nft list ruleset  # Verify

# Step 6: Persist nftables using your distro's mechanism
# Example for systems that load /etc/nftables.conf via nftables.service:
sudo cp /etc/nftables-migrated.conf /etc/nftables.conf
sudo systemctl enable nftables
```

Note that `iptables-translate` doesn't always produce optimal nftables syntax - review the output and refactor using nftables-native features like sets and verdict maps where appropriate.
