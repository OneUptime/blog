# How to Delete a Specific iptables Rule by Line Number

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Linux, Firewall, Security, Rule Management

Description: Delete specific iptables rules by line number or by exact rule specification, without flushing the entire chain or disrupting other firewall rules.

Deleting the wrong rule - or all rules - can lock you out of a server. Targeting deletions by line number or exact specification lets you remove specific rules safely.

## Find the Line Number First

```bash
# Always check line numbers before deleting

sudo iptables -L INPUT -n --line-numbers

# Output:
# Chain INPUT (policy DROP)
# num  target  prot  opt  source       destination
# 1    ACCEPT  all   --   0.0.0.0/0    0.0.0.0/0    state ESTABLISHED,RELATED
# 2    ACCEPT  tcp   --   0.0.0.0/0    0.0.0.0/0    tcp dpt:22
# 3    ACCEPT  tcp   --   0.0.0.0/0    0.0.0.0/0    tcp dpt:80
# 4    DROP    all   --   192.168.1.50 0.0.0.0/0
```

## Delete by Line Number

```bash
# Delete rule number 4 from INPUT chain
sudo iptables -D INPUT 4

# Verify the deletion
sudo iptables -L INPUT -n --line-numbers

# Delete from other chains
sudo iptables -D OUTPUT 2
sudo iptables -D FORWARD 1

# WARNING: After deletion, remaining rules renumber!
# Rule 5 becomes rule 4 after deleting rule 4
# Always re-check line numbers before deleting multiple rules
```

## Delete Multiple Rules Safely

When deleting multiple rules, delete from highest to lowest number to avoid renumbering issues:

```bash
# Delete rules 5, 4, and 3 (from highest to lowest)
sudo iptables -D INPUT 5
sudo iptables -D INPUT 4
sudo iptables -D INPUT 3

# NOT: 3, 4, 5 (renumbering would cause wrong deletions)
```

## Delete by Exact Specification

Instead of line numbers, specify the exact rule to delete:

```bash
# Delete the rule that allows port 80
sudo iptables -D INPUT -p tcp --dport 80 -j ACCEPT

# Delete a specific IP block rule
sudo iptables -D INPUT -s 1.2.3.4 -j DROP

# Delete the DROP all rule (the final catch-all)
sudo iptables -D INPUT -j DROP

# The rule specification must EXACTLY match what's listed
# (same flags, same values)
```

## Delete from NAT Table

```bash
# List NAT rules first
sudo iptables -t nat -L PREROUTING -n --line-numbers

# Delete by line number from NAT
sudo iptables -t nat -D PREROUTING 2

# Delete by specification from NAT
sudo iptables -t nat -D PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.100:80
```

## Verify After Deletion

```bash
# Always verify the chain after deletion
sudo iptables -L INPUT -n -v --line-numbers

# Check packet counts to ensure remaining rules are still working
# A rule that was blocking traffic should no longer appear
# Rules that allow traffic should show incrementing packet counts
```

## Undo a Deletion (Restore from Backup)

```bash
# If you deleted the wrong rule, restore from saved rules
sudo iptables-restore < /etc/iptables/rules.v4

# Or add the specific rule back manually
# Check what the rule was from your backup
grep "dport 80" /etc/iptables/rules.v4

# Add it back (use -I to insert at correct position, not -A to append)
sudo iptables -I INPUT 3 -p tcp --dport 80 -j ACCEPT
```

Always save your iptables rules before making changes - `sudo iptables-save > /tmp/iptables-backup.txt` takes seconds and gives you a safety net if something goes wrong.
