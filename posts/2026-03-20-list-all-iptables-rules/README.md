# How to List All iptables Rules on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Linux, Firewall, Security, Diagnostic

Description: List all iptables rules across all chains and tables using various formats, including line numbers, packet counters, and verbose output for auditing and troubleshooting.

Knowing how to read and list iptables rules is fundamental to firewall management. Different listing options reveal different aspects of the rule set - from quick summaries to verbose debugging output.

## Basic Rule Listing

```bash
# List INPUT chain rules

sudo iptables -L INPUT

# List with numeric output (no DNS resolution - faster)
sudo iptables -L -n

# List all chains
sudo iptables -L

# List specific chain with numeric
sudo iptables -L INPUT -n
```

## Verbose Listing with Counters

```bash
# Verbose: shows interface, packet/byte counters
sudo iptables -L -n -v

# Output format:
# Chain INPUT (policy DROP 5 packets, 340 bytes)
# pkts bytes target  prot opt in  out source       destination
# 12   960   ACCEPT  tcp  --  *   *   0.0.0.0/0    0.0.0.0/0    tcp dpt:22
# 34   2040  ACCEPT  tcp  --  *   *   0.0.0.0/0    0.0.0.0/0    tcp dpt:80
# 0    0     DROP    all  --  *   *   1.2.3.4      0.0.0.0/0

# pkts and bytes columns show how many packets have matched each rule
# Zero counters mean the rule has not matched since the counters were last reset or the rule was added
```

## Show Line Numbers

```bash
# Line numbers are useful when deleting rules by number
sudo iptables -L INPUT -n --line-numbers

# Output:
# Chain INPUT (policy DROP)
# num  target  prot  opt  source       destination
# 1    ACCEPT  all   --   0.0.0.0/0    0.0.0.0/0    state ESTABLISHED,RELATED
# 2    ACCEPT  tcp   --   0.0.0.0/0    0.0.0.0/0    tcp dpt:22
# 3    ACCEPT  tcp   --   0.0.0.0/0    0.0.0.0/0    tcp dpt:80
# 4    DROP    all   --   0.0.0.0/0    0.0.0.0/0

# Combine all useful flags
sudo iptables -L INPUT -n -v --line-numbers
```

## List Rules from All Tables

iptables has multiple tables. Default listing only shows the `filter` table, and which tables are available depends on your kernel configuration and loaded modules:

```bash
# Filter table (default)
sudo iptables -t filter -L -n -v

# NAT table
sudo iptables -t nat -L -n -v

# Mangle table (QoS marking)
sudo iptables -t mangle -L -n -v

# Raw table (connection tracking bypass)
sudo iptables -t raw -L -n -v

# Security table (SELinux/MAC rules)
sudo iptables -t security -L -n -v

# List ALL tables at once
for table in filter nat mangle raw security; do
    echo "=== Table: $table ==="
    sudo iptables -t "$table" -L -n -v
done
```

## Export Rules in Restorable Format

```bash
# Export all rules in a format that can be restored later
sudo iptables-save

# Save to a file
sudo iptables-save -f /etc/iptables/rules.v4

# Save specific table only
sudo iptables-save -t nat -f /tmp/nat-rules.txt

# View saved rules
sudo cat /etc/iptables/rules.v4
# Output format:
# *filter
# :INPUT DROP [0:0]
# :FORWARD DROP [0:0]
# :OUTPUT ACCEPT [0:0]
# -A INPUT -i lo -j ACCEPT
# -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# -A INPUT -p tcp -m tcp --dport 22 -j ACCEPT
# COMMIT
```

## Audit Rules for Unused Rules

```bash
# Find rules with zero packet hits (possibly obsolete)
sudo iptables -L -n -v | awk '
  NR > 2 && $1 == "0" && $2 == "0" {
    print "Unused rule (0 packets): " $0
  }
'

# Reset counters (useful for fresh audit)
sudo iptables -Z INPUT
sudo iptables -Z OUTPUT
sudo iptables -Z FORWARD
```

Reading iptables rules correctly - especially understanding the packet counters and chain policies - is essential for verifying your firewall is actually working as intended.
