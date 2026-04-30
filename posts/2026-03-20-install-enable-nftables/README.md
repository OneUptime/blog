# How to Install and Enable nftables on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, Security, Installation, Networking

Description: Install nftables on Linux, understand how it replaces iptables, and set up the nftables service with a basic ruleset to get started with modern Linux firewalling.

nftables is the modern replacement for iptables, ip6tables, arptables, and ebtables. It unifies all protocol filtering in a single tool with better performance, atomic rule updates, and cleaner syntax.

## Install nftables

```bash
# Debian/Ubuntu

sudo apt install nftables -y

# RHEL/CentOS 7
sudo yum install nftables -y

# RHEL/CentOS 8/9
sudo dnf install nftables -y

# Verify version
nft --version
# Example: nftables v1.x.x
```

## Enable the nftables Service

```bash
# Debian/Ubuntu loads /etc/nftables.conf
# RHEL/CentOS loads scripts referenced from /etc/sysconfig/nftables.conf

# Enable nftables to start at boot
sudo systemctl enable nftables

# Start the service
sudo systemctl start nftables

# Check status
sudo systemctl status nftables
```

## Check Current Rules

```bash
# List all nftables rules
sudo nft list ruleset

# If empty on a fresh install, no rules are currently loaded.

# Check if iptables is also active
sudo iptables -L

# Check which backend iptables uses
sudo iptables --version
# Example: iptables v1.8.x (nf_tables)
```

## nftables vs iptables Conceptual Mapping

```text
iptables Concept       nftables Equivalent
--------------------   -----------------------------------------
Table (filter, nat)    table inet/ip/ip6 <name>
Builtin chain (INPUT)  base chain with hook (e.g. chain input { type filter hook input ... })
Rule (-A INPUT ...)    add rule <table> <chain> <expression>
ipset                  nftables sets (built-in, no separate tool)
Multiple tables        Unified: inet handles both IPv4 and IPv6
```

## Basic nftables Configuration

```bash
# Debian/Ubuntu
NFT_CONF=/etc/nftables.conf

# RHEL/CentOS
# NFT_CONF=/etc/nftables/main.nft

sudo tee "$NFT_CONF" << 'EOF'
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif lo accept

        # Allow established and related connections
        ct state established,related accept

        # Drop invalid connections
        ct state invalid drop

        # Allow IPv4 ICMP (ping)
        icmp type echo-request accept

        # Allow ICMPv6 neighbor discovery and ping
        icmpv6 type { nd-neighbor-solicit, nd-router-advert, nd-neighbor-advert, echo-request } accept

        # Allow SSH
        tcp dport 22 accept

        # Allow HTTP and HTTPS
        tcp dport { 80, 443 } accept
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
EOF

# RHEL/CentOS only, make sure /etc/sysconfig/nftables.conf includes:
# include "/etc/nftables/main.nft"

# Apply the config
sudo nft -f "$NFT_CONF"

# Verify rules loaded
sudo nft list ruleset
```

## Test Before Enabling at Boot

```bash
# Debian/Ubuntu
NFT_CONF=/etc/nftables.conf

# RHEL/CentOS
# NFT_CONF=/etc/nftables/main.nft

# Test syntax without applying
sudo nft -c -f "$NFT_CONF"
# -c = check only (dry run)

# Apply manually and verify connectivity
sudo nft -f "$NFT_CONF"
ping -c 1 8.8.8.8    # Test outbound
ssh user@server       # Test SSH (from another window)

# If everything works, save and enable
sudo systemctl enable nftables
sudo systemctl start nftables
```

## Relationship with iptables

```bash
# On many modern distributions, iptables may use the nf_tables backend
# Avoid managing the same ruleset with both iptables and nft directly

# Check which backend iptables uses
sudo iptables --version
sudo nft list ruleset

# If migrating from iptables, translate existing rules first:
iptables-translate -A INPUT -p tcp --dport 22 -j ACCEPT
# Output: nft 'add rule ip filter INPUT tcp dport 22 counter accept'
```

nftables is the future of Linux packet filtering - it is already the default packet-filtering framework on Debian 10+ and RHEL 8+, and the default `iptables` backend on Ubuntu since 20.10, making it the right tool to learn for any new deployment.
