# How to Create Your First nftables Table and Chain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Table, Chain, Security

Description: Create nftables tables and chains from scratch, understanding the address family options, hook types, chain priorities, and default policies.

Understanding nftables tables and chains is fundamental to writing any nftables rule. Unlike iptables with predefined tables, nftables requires you to explicitly create both tables and chains before adding rules.

## Tables: The Top-Level Container

Tables hold chains and are bound to a specific address family:

```bash
# Create an IPv4-only table

sudo nft add table ip myfilter

# Create an IPv6-only table
sudo nft add table ip6 myfilter6

# Create a table for BOTH IPv4 and IPv6 (recommended)
sudo nft add table inet myfilter

# Create a table for ARP filtering
sudo nft add table arp myfilter

# Create a table for bridge filtering
sudo nft add table bridge myfilter

# List all tables
sudo nft list tables
```

## Chains: Rule Containers with Hooks

Chains contain the actual rules. There are two types:

```bash
# Base chain: attaches to a netfilter hook (processes network traffic)
# Regular chain: called from other chains (like custom chains in iptables)

# Create a base chain for incoming traffic
sudo nft add chain inet myfilter input \
  '{ type filter hook input priority 0; policy drop; }'

# Create a base chain for forwarding
sudo nft add chain inet myfilter forward \
  '{ type filter hook forward priority 0; policy drop; }'

# Create a base chain for outgoing traffic
sudo nft add chain inet myfilter output \
  '{ type filter hook output priority 0; policy accept; }'
```

## Understanding Chain Parameters

```text
type filter:     Packet filtering (accept/drop)
type nat:        Network address translation
type route:      Policy routing

hook input:      Incoming packets for this host
hook output:     Outgoing packets from this host
hook forward:    Packets being forwarded through
hook prerouting: Before routing decision (DNAT here)
hook postrouting: After routing decision (SNAT/masquerade here)

priority 0:      Order of processing (lower runs first)
                 Standard priorities: -200 (conntrack), -150 (mangle), 0 (filter), 100 (srcnat)

policy drop:     Default action if no rule matches
policy accept:   Default action if no rule matches (permissive)
```

## Complete Table + Chain Setup

```bash
# Create table with all necessary chains
sudo nft add table inet firewall

# Input chain (default drop)
sudo nft add chain inet firewall input \
  '{ type filter hook input priority 0; policy drop; }'

# Forward chain (default drop)
sudo nft add chain inet firewall forward \
  '{ type filter hook forward priority 0; policy drop; }'

# Output chain (default accept)
sudo nft add chain inet firewall output \
  '{ type filter hook output priority 0; policy accept; }'

# NAT table
sudo nft add table inet nat

# Prerouting chain (for DNAT)
sudo nft add chain inet nat prerouting \
  '{ type nat hook prerouting priority -100; }'

# Postrouting chain (for SNAT/masquerade)
sudo nft add chain inet nat postrouting \
  '{ type nat hook postrouting priority 100; }'
```

## Create a Regular (Non-Hook) Chain

Regular chains are like custom chains in iptables - called with `jump` or `goto`:

```bash
# Create regular chain (no hook or policy)
sudo nft add chain inet firewall allowed-ports

# Add rules to it
sudo nft add rule inet firewall allowed-ports tcp dport 22 accept
sudo nft add rule inet firewall allowed-ports tcp dport 80 accept

# Jump to it from input chain
sudo nft add rule inet firewall input jump allowed-ports
```

## List Tables and Chains

```bash
# List all tables
sudo nft list tables

# List chains in a table
sudo nft list table inet firewall

# View complete ruleset
sudo nft list ruleset
```

Tables and chains are nftables' building blocks - once you understand them, writing, organizing, and managing firewall rules becomes straightforward.
