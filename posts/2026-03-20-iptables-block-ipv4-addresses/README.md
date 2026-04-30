# How to Write iptables Rules to Block Specific IPv4 Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, IPv4, Firewall, Linux, Security, IP Blocking

Description: Use iptables to block inbound and outbound traffic from specific IPv4 addresses and subnets, including persistent rules and bulk blocking with ipset.

Blocking specific IPv4 addresses with iptables is a fundamental security control for mitigating attacks, blocking known malicious sources, or enforcing access policies.

## Blocking a Single IP Address

```bash
# Block all inbound traffic from a specific IP

sudo iptables -A INPUT -s 203.0.113.50 -j DROP

# Block all outbound traffic to a specific IP
sudo iptables -A OUTPUT -d 203.0.113.50 -j DROP

# Block both directions
sudo iptables -A INPUT -s 203.0.113.50 -j DROP
sudo iptables -A OUTPUT -d 203.0.113.50 -j DROP
sudo iptables -A FORWARD -s 203.0.113.50 -j DROP
sudo iptables -A FORWARD -d 203.0.113.50 -j DROP
```

## Blocking a Subnet

```bash
# Block an entire /24 subnet
sudo iptables -A INPUT -s 203.0.113.0/24 -j DROP

# Block a /16 range
sudo iptables -A INPUT -s 203.0.0.0/16 -j DROP
```

## Using REJECT Instead of DROP

```bash
# REJECT sends an ICMP error back to the sender (faster connection failure for sender)
# DROP silently discards (harder to detect by attacker, but slower timeout for sender)

# Reject with host-prohibited
sudo iptables -A INPUT -s 203.0.113.50 -j REJECT --reject-with icmp-host-prohibited

# Reject TCP with RST
sudo iptables -A INPUT -s 203.0.113.50 -p tcp -j REJECT --reject-with tcp-reset
```

## Blocking with Logging

```bash
# Log before blocking (for auditing)
sudo iptables -A INPUT -s 203.0.113.50 -j LOG --log-prefix "BLOCKED_IP: " --log-level 4
sudo iptables -A INPUT -s 203.0.113.50 -j DROP

# View blocked connection logs
sudo dmesg | grep BLOCKED_IP
sudo journalctl -k | grep BLOCKED_IP
```

## Inserting Rules at Position 1 (Priority)

```bash
# Insert at the beginning to override other rules
sudo iptables -I INPUT 1 -s 203.0.113.50 -j DROP
```

## Blocking Multiple IPs Efficiently with ipset

```bash
# Install ipset
sudo apt install ipset -y

# Create a hash set of IPv4 addresses
sudo ipset create blocklist hash:ip

# Add IPs to the set
sudo ipset add blocklist 203.0.113.50
sudo ipset add blocklist 198.51.100.20
sudo ipset add blocklist 192.0.2.15

# Block all IPs in the set with a single rule
sudo iptables -A INPUT -m set --match-set blocklist src -j DROP

# Add IPs from a file
while read ip; do sudo ipset add blocklist "$ip"; done < bad-ips.txt
```

## Saving Rules Permanently

```bash
# Ubuntu/Debian
sudo apt install iptables-persistent -y
sudo netfilter-persistent save

# RHEL/CentOS with iptables-services installed
sudo service iptables save

# Manual save to the Debian/Ubuntu IPv4 rules file
sudo iptables-save -f /etc/iptables/rules.v4
```

## Removing a Block

```bash
# Remove block on a specific IP
sudo iptables -D INPUT -s 203.0.113.50 -j DROP

# Or delete by rule number
sudo iptables -L INPUT --line-numbers -n
# Rule 5: DROP  0  -- 203.0.113.50 anywhere
sudo iptables -D INPUT 5
```

## Checking Active Blocks

```bash
# List INPUT chain rules with packet/byte counters
sudo iptables -L INPUT -n -v

# Show only DROP rules
sudo iptables -L INPUT -n | grep DROP
```

For blocking hundreds of IPs, prefer ipset - IP sets are indexed for very fast matching even when the sets are large, and they avoid long lists of individual iptables rules.
