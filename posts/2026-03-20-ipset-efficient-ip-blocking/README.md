# How to Use ipset for Efficient IP Address Blocking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ipset, iptables, Linux, Security, Firewall, DDoS

Description: Use ipset to create high-performance IP blocklists and allowlists that iptables can match against in O(1) time, far outperforming individual iptables rules.

Blocking thousands of IPs with individual iptables rules creates a linear lookup chain that degrades performance. Hash-based ipset types such as hash:ip keep lookups fast even when the set grows large.

## Install ipset

```bash
# Debian/Ubuntu

sudo apt install ipset -y

# RHEL/CentOS
sudo yum install ipset -y
```

## Create an IP Blocklist Set

```bash
# Create a set named "blocklist" for IPv4 addresses
sudo ipset create blocklist hash:ip family inet

# Add IPs to the blocklist
sudo ipset add blocklist 1.2.3.4
sudo ipset add blocklist 5.6.7.8
sudo ipset add blocklist 10.10.10.0/24

# List set contents
sudo ipset list blocklist
```

## Use the Set in iptables

```bash
# Drop all traffic from IPs in the blocklist set
sudo iptables -A INPUT -m set --match-set blocklist src -j DROP

# Log and drop
sudo iptables -A INPUT -m set --match-set blocklist src \
  -j LOG --log-prefix "BLOCKED-SET: "
sudo iptables -A INPUT -m set --match-set blocklist src -j DROP
```

## Create a Network/Subnet Set

```bash
# Create a set for CIDR ranges
sudo ipset create badnets hash:net family inet

sudo ipset add badnets 192.168.100.0/24
sudo ipset add badnets 172.20.0.0/16

# Match in iptables
sudo iptables -A INPUT -m set --match-set badnets src -j DROP
```

## Create an Allowlist (Whitelist)

```bash
# Create allowlist
sudo ipset create allowlist hash:ip family inet

sudo ipset add allowlist 203.0.113.10  # Your office IP
sudo ipset add allowlist 198.51.100.5  # Monitoring server

# Allow SSH only for allowlisted IPs
sudo iptables -A INPUT -p tcp --dport 22 \
  -m set --match-set allowlist src -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j DROP
```

## Time-Based Entries (with timeout)

Entries can auto-expire, useful for temporary blocks:

```bash
# Create a set with a default timeout of 3600 seconds (1 hour)
sudo ipset create temp-block hash:ip timeout 3600

# Add an IP that will be auto-removed after 1 hour
sudo ipset add temp-block 1.2.3.4

# Override timeout for a specific IP (block for 24 hours)
sudo ipset add temp-block 5.6.7.8 timeout 86400

# Add to iptables
sudo iptables -A INPUT -m set --match-set temp-block src -j DROP
```

## Auto-Populate from a Threat Feed

```bash
#!/bin/bash
# update-blocklist.sh - Pull threat feed and update ipset

BLOCKLIST_URL="https://www.spamhaus.org/drop/drop.txt"

# Create set if it doesn't exist
sudo ipset -exist create blocklist hash:net family inet

# Download and parse threat feed
curl -s "$BLOCKLIST_URL" | grep -v '^;' | awk '{print $1}' | while read cidr; do
    sudo ipset -exist add blocklist "$cidr"
done

echo "Blocklist updated: $(sudo ipset list blocklist | grep 'Number of entries')"
```

## Save and Restore ipset State

ipset state is lost on reboot unless saved:

```bash
# Save current ipset state
sudo ipset -file /etc/ipset.conf save

# Restore at boot (add to rc.local or systemd service)
sudo ipset -file /etc/ipset.conf restore

# Create a systemd service for persistence
# /etc/systemd/system/ipset-restore.service
# [Unit]
# Description=Restore ipset rules
# Before=iptables.service
# [Service]
# ExecStart=/sbin/ipset -file /etc/ipset.conf restore
# [Install]
# WantedBy=multi-user.target
```

## Performance Comparison

```bash
# Add 10,000 IPs to test performance difference
for i in $(seq 1 10000); do
    sudo ipset add blocklist "10.$((i/256)).$((i%256)).1" 2>/dev/null
done

# hash:ip lookups are hash-based, avoiding a 10,000-rule linear chain
# vs 10,000 individual iptables rules, which are checked in order

# Check set statistics
sudo ipset list blocklist | grep "Number of entries"
```

ipset is essential when blocking more than a few hundred IPs - it avoids long iptables rule chains and keeps lookups fast even with very large blocklists.
