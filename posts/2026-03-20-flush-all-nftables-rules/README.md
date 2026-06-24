# How to Flush All nftables Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Security, Management

Description: Safely flush all nftables rules using flush ruleset, flush table, and flush chain commands, with the correct sequence to avoid losing remote access.

Flushing nftables rules removes all or selected firewall rules. For a full reset, `flush ruleset` removes the hooked base chains and their policies along with the rules. On remote servers, the safer workflow is to load a replacement ruleset atomically instead of leaving the host with an empty firewall.

## Flush Everything (Complete Reset)

```bash
# Flush the ENTIRE nftables ruleset (all tables, chains, rules)

sudo nft flush ruleset

# After this command:
# - All tables are gone
# - All chains are gone
# - All rules are gone
# - All traffic flows freely (no firewall)

# Verify it's empty
sudo nft list ruleset
# (empty output = success)
```

## Safe Flush Procedure for Remote Servers

If you're working over SSH, `flush ruleset` removes the hooked base chains entirely, so a DROP policy does not survive the flush. The safer remote workflow is to replace the ruleset atomically instead of using separate flush and add commands:

```bash
#!/bin/bash
# safe-flush-nft.sh - Replace nftables atomically without a lockout window

sudo tee /tmp/new-rules.nft << 'EOF'
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        iif lo accept
        ct state established,related accept
        tcp dport 22 accept
    }
}
EOF

sudo nft -f /tmp/new-rules.nft

echo "nftables rules replaced atomically"
sudo nft list ruleset
```

## Flush a Specific Table

Removes all chains and rules within a table, but keeps the table itself:

```bash
# Flush all chains and rules in the inet filter table
sudo nft flush table inet filter

# Flush only the NAT table
sudo nft flush table inet nat

# The table still exists but has no chains:
sudo nft list tables
# table inet filter  ← still exists, just empty
```

## Flush a Specific Chain

Removes all rules from a chain, but keeps the chain and its hook:

```bash
# Flush all rules in the input chain
sudo nft flush chain inet filter input

# Flush output chain
sudo nft flush chain inet filter output

# The chain still exists with its type/hook/policy:
sudo nft list chain inet filter input
# table inet filter {
#     chain input {
#         type filter hook input priority 0; policy drop;
#         (no rules)
#     }
# }
```

## After Flushing: Re-Apply Rules

Typical workflow after a flush:

```bash
# Apply your saved configuration
sudo nft -f /etc/nftables.conf

# Or build fresh:
sudo nft add table inet filter

sudo nft add chain inet filter input \
  '{ type filter hook input priority 0; policy drop; }'

sudo nft add rule inet filter input iif lo accept
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input tcp dport 22 accept

# Save the new ruleset
sudo nft list ruleset | sudo tee /etc/nftables.conf > /dev/null
```

## Atomic Flush and Replace

The recommended approach for making changes - apply a new config atomically:

```bash
# Create new config
sudo tee /tmp/new-rules.nft << 'EOF'
flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;
        iif lo accept
        ct state established,related accept
        tcp dport 22 accept
        tcp dport 80 accept
    }
}
EOF

# Apply atomically - flush and replace in one operation
sudo nft -f /tmp/new-rules.nft

# Benefits:
# - Atomic: either all rules apply or none do
# - No window where firewall has no rules
# - Old rules replaced atomically without gaps
```

`flush ruleset` is nftables' most powerful reset command - combine it with a carefully crafted replacement ruleset in the same file for atomic rule changes that never leave your server unprotected.
