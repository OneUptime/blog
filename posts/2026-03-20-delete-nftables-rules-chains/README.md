# How to Delete nftables Rules and Chains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Security, Rule Management

Description: Delete specific nftables rules by handle, remove entire chains, and drop tables, understanding the dependency order required for successful deletion.

Deleting nftables rules requires knowing their handles (equivalent to line numbers). Unlike iptables, you can't match rules by their full specification - handles are mandatory for targeted deletion.

## Find Rule Handles First

```bash
# List rules with handles (-a flag)

sudo nft -a list ruleset

# or for a specific chain:
sudo nft -a list chain inet filter input

# Output:
# table inet filter { # handle 1
#     chain input { # handle 2
#         type filter hook input priority 0; policy drop;
#         iif lo accept # handle 4
#         ct state established,related accept # handle 5
#         tcp dport 22 accept # handle 6
#         tcp dport 80 accept # handle 7
#         drop # handle 8
#     }
# }
```

## Delete a Specific Rule by Handle

```bash
# Delete rule with handle 7 from input chain in inet filter table
sudo nft delete rule inet filter input handle 7

# Verify the deletion
sudo nft -a list chain inet filter input
# The rule with handle 7 (port 80) should be gone
```

## Delete a Rule from NAT Chain

```bash
# Find handles in NAT prerouting
sudo nft -a list chain inet nat prerouting

# Delete DNAT rule by handle
sudo nft delete rule inet nat prerouting handle 3
```

## Delete All Rules in a Chain (Flush Chain)

```bash
# Delete all rules in the input chain
sudo nft flush chain inet filter input

# Delete all rules in output chain
sudo nft flush chain inet filter output

# This is equivalent to iptables -F <chain>
```

## Delete an Entire Chain

Chains can only be deleted if they're empty and have no references:

```bash
# Step 1: Flush all rules from the chain
sudo nft flush chain inet filter mychain

# Step 2: Remove any rules that jump to this chain
# Find references:
sudo nft -a list ruleset | grep "jump mychain\|goto mychain"
# Delete each reference by handle

# Step 3: Delete the chain
sudo nft delete chain inet filter mychain
```

## Delete an Entire Table

Unlike chains, a table can be deleted even if it contains chains, rules, and sets - `nft delete table` removes the table along with all its contents in one atomic operation:

```bash
# Delete the table and everything in it
sudo nft delete table inet filter

# Optional: flush first if you want to clear contents but keep the table
sudo nft flush table inet filter
```

## Atomic Rule Deletion with a Script

```bash
# Create a partial ruleset file that removes specific rules
# (Better: use flush + recreate for complex changes)

sudo tee /tmp/update-rules.nft << 'EOF'
# Remove specific old rules by flushing and re-adding
flush chain inet filter input

# Re-add all rules EXCEPT the one you want to remove
add rule inet filter input iif lo accept
add rule inet filter input ct state established,related accept
add rule inet filter input tcp dport 22 accept
# (port 80 rule omitted - effectively deleted)
add rule inet filter input drop
EOF

sudo nft -f /tmp/update-rules.nft
```

## Undo an Accidental Deletion

```bash
# If you deleted the wrong rule, restore from backup
sudo nft -f /etc/nftables.conf

# Or add the specific rule back:
sudo nft add rule inet filter input tcp dport 80 accept
# Note: adds at END of chain, may need to reorder
```

## Delete All nftables Rules (Complete Reset)

```bash
# Delete EVERYTHING - all tables, chains, rules
sudo nft flush ruleset

# This is the nuclear option - all firewall rules are removed
# All traffic will flow freely until rules are re-added
```

Always get rule handles before attempting deletion - trying to delete without the correct handle will fail, and the `-a` flag to `nft list` is the only reliable way to find them.
