# How to List All nftables Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Security, Diagnostic

Description: List nftables rules at different scopes - entire ruleset, specific tables, specific chains, and individual rules with handles for identification and management.

Viewing nftables rules is the starting point for auditing, troubleshooting, and managing your firewall. nftables provides several listing granularities from a complete dump to a single table or chain.

## List the Complete Ruleset

```bash
# Show all tables, chains, and rules

sudo nft list ruleset

# Example output:
# table inet filter {
#     chain input {
#         type filter hook input priority 0; policy drop;
#         iif lo accept
#         ct state established,related accept
#         tcp dport 22 accept
#     }
#
#     chain output {
#         type filter hook output priority 0; policy accept;
#     }
# }
```

## List a Specific Table

```bash
# List everything in the inet filter table
sudo nft list table inet filter

# List IPv4-only table
sudo nft list table ip filter

# List NAT table
sudo nft list table inet nat
```

## List a Specific Chain

```bash
# List all rules in the input chain
sudo nft list chain inet filter input

# List output chain
sudo nft list chain inet filter output

# List NAT prerouting chain
sudo nft list chain inet nat prerouting
```

## List with Handles (Required for Deletion)

Handles are numeric identifiers for nftables objects and rules - you need the rule handle to delete a specific rule:

```bash
# List rules with handles
sudo nft -a list ruleset

# or for a specific chain:
sudo nft -a list chain inet filter input

# Output with handles:
# table inet filter { # handle 1
#     chain input { # handle 2
#         type filter hook input priority 0; policy drop;
#         iif lo accept # handle 4
#         ct state established,related accept # handle 5
#         tcp dport 22 accept # handle 6
#     }
# }

# The number after # handle is what you use to delete
```

## Show All Tables

```bash
# List all table names
sudo nft list tables

# Output:
# table inet filter
# table inet nat
```

## Export Ruleset for Backup

```bash
# Export complete ruleset in restorable format
{
    echo "flush ruleset"
    sudo nft list ruleset
} | sudo tee /etc/nftables.conf > /dev/null

# Restore the saved ruleset with:
# sudo nft -f /etc/nftables.conf

# Verify the export is complete
sudo wc -l /etc/nftables.conf
```

## Show Counters and Byte Statistics

```bash
# Rules show packet/byte counts if they include a counter statement
sudo nft list ruleset

# List named counters separately
sudo nft list counters

# Or add counters explicitly to rules:
# tcp dport 22 counter accept
# Then list shows: tcp dport 22 counter packets 45 bytes 2340 accept
```

## JSON Output for Parsing

```bash
# Output in JSON format (useful for scripts and monitoring)
sudo nft -j list ruleset

# Parse with jq
sudo nft -j list ruleset | jq '.nftables[] | select(.rule) | .rule | {family, table, chain, expr}'
```

## Filter Output

```bash
# Find rules mentioning a specific port
sudo nft list ruleset | grep "dport 22"

# Find lines mentioning drop or reject
sudo nft list ruleset | grep -E "drop|reject"

# Find lines mentioning accept
sudo nft list ruleset | grep "accept"

# Count total rules across all chains
sudo nft -j list ruleset | jq '[.nftables[] | select(.rule)] | length'
```

Reading nftables output is significantly cleaner than iptables - the hierarchical table→chain→rule structure makes it easy to understand the overall policy at a glance.
