# How to Write nftables Rules from Scratch on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, nftables, Firewall, Networking, Security

Description: Write nftables firewall rules from scratch on Ubuntu, covering tables, chains, rule syntax, sets, and migrating from iptables to the modern nftables framework.

---

nftables is the modern replacement for iptables, arptables, and ebtables, combining their functionality into a single unified framework. Ubuntu 20.04 and later use nftables as the backend for nft while still supporting iptables through a compatibility layer. Learning nftables directly gives you access to cleaner syntax, better performance through set-based matching, and a consistent framework for both IPv4 and IPv6.

## nftables vs iptables

The main architectural differences:

- nftables uses a single tool (`nft`) instead of `iptables`, `ip6tables`, `arptables`, etc.
- IPv4 and IPv6 rules can be in the same table using the `inet` family
- nftables uses maps and sets for efficient multi-value matching
- Rule syntax is more readable and consistent
- nftables supports atomic rule loading (replace entire ruleset atomically)

## Checking nftables Status

```bash
# Check if nftables is installed
which nft

# Check version
nft --version

# View current ruleset
sudo nft list ruleset

# Check service status
sudo systemctl status nftables
```

On a fresh Ubuntu server, you'll see minimal or no rules.

## nftables Concepts

Before writing rules, understand the hierarchy:

- **Table**: A container for chains. Must specify a family (ip, ip6, inet, arp, bridge)
- **Chain**: A sequence of rules. Has type, hook, and priority.
- **Rule**: The actual filtering logic
- **Set**: A collection of values (IPs, ports, etc.) for efficient matching

### Chain Types and Hooks

Chains can be:
- `filter`: For packet filtering
- `nat`: For NAT operations
- `route`: For routing marks

Chains attach to netfilter hooks:
- `prerouting`: Before routing decision
- `input`: For packets destined for this machine
- `forward`: For packets being forwarded
- `output`: For locally generated packets
- `postrouting`: After routing decision

## Creating Your First Table and Chain

```bash
# Create a table for inet (handles both IPv4 and IPv6)
sudo nft add table inet filter

# Add an input chain with default drop policy
sudo nft add chain inet filter input \
    '{ type filter hook input priority 0; policy drop; }'

# Add a forward chain (drop by default)
sudo nft add chain inet filter forward \
    '{ type filter hook forward priority 0; policy drop; }'

# Add an output chain (allow by default)
sudo nft add chain inet filter output \
    '{ type filter hook output priority 0; policy accept; }'
```

## Adding Basic Rules

```bash
# Allow loopback interface
sudo nft add rule inet filter input iif lo accept

# Allow established and related connections
sudo nft add rule inet filter input ct state established,related accept

# Allow ICMP (ping)
sudo nft add rule inet filter input ip protocol icmp accept
sudo nft add rule inet filter input ip6 nexthdr icmpv6 accept

# Allow SSH
sudo nft add rule inet filter input tcp dport 22 accept

# Allow HTTP and HTTPS
sudo nft add rule inet filter input tcp dport { 80, 443 } accept

# Log and drop everything else (already handled by policy drop)
# But add explicit log rule before the implicit drop:
sudo nft add rule inet filter input log prefix '"INPUT DROP: "' limit rate 5/minute drop
```

## Using Configuration Files

The cleaner approach is to write rules in a configuration file. The nftables service reads `/etc/nftables.conf` on startup:

```bash
sudo nano /etc/nftables.conf
```

```
#!/usr/sbin/nft -f
# nftables configuration
# Ubuntu server baseline rules

# Flush existing ruleset
flush ruleset

# Main filter table for IPv4 and IPv6
table inet filter {

    # Set of trusted admin IPs for SSH
    set admin_ips {
        type ipv4_addr
        flags interval
        elements = {
            192.168.1.10,
            192.168.1.15,
            10.100.0.5
        }
    }

    # Input chain - default drop
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif lo accept

        # Allow established connections
        ct state established,related accept

        # Drop invalid connections
        ct state invalid drop

        # Allow ICMP (ping)
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept

        # Allow SSH from trusted IPs only
        tcp dport 22 ip saddr @admin_ips accept

        # Allow HTTP and HTTPS from anywhere
        tcp dport { 80, 443 } accept

        # Log dropped packets (rate limited)
        log prefix "nftables INPUT DROP: " limit rate 5/minute
    }

    # Forward chain - default drop
    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    # Output chain - allow all
    chain output {
        type filter hook output priority 0; policy accept;
    }
}
```

Apply the configuration:

```bash
# Test the configuration syntax first
sudo nft -c -f /etc/nftables.conf

# Apply the configuration
sudo nft -f /etc/nftables.conf

# Verify the rules loaded
sudo nft list ruleset
```

## Enabling nftables at Boot

```bash
sudo systemctl enable nftables
sudo systemctl start nftables
sudo systemctl status nftables
```

When the service starts, it loads `/etc/nftables.conf`.

## Working with Sets and Maps

Sets are one of nftables' most powerful features, allowing you to match multiple values efficiently:

```bash
# Create a set for blocked IPs
sudo nft add set inet filter blocked_ips \
    '{ type ipv4_addr; flags interval; }'

# Add IPs to the set
sudo nft add element inet filter blocked_ips \
    '{ 203.0.113.100, 198.51.100.0/24 }'

# Add a rule to drop traffic from the set
sudo nft add rule inet filter input \
    ip saddr @blocked_ips drop

# List set contents
sudo nft list set inet filter blocked_ips

# Add an element to a set (without reloading all rules)
sudo nft add element inet filter blocked_ips \{ 192.0.2.100 \}

# Delete an element from a set
sudo nft delete element inet filter blocked_ips \{ 203.0.113.100 \}
```

### Named Sets in Config File

```
table inet filter {

    # Blocked IP ranges (automatically matched by rules)
    set blocked_ranges {
        type ipv4_addr
        flags interval, timeout
        # Entries expire after 24 hours
        timeout 24h
        elements = {
            203.0.113.0/24,
            198.51.100.0/24
        }
    }

    # Port set for allowed services
    set allowed_services {
        type inet_service
        flags interval
        elements = { 80, 443, 8080, 8443 }
    }

    chain input {
        type filter hook input priority 0; policy drop;

        # Drop blocked ranges
        ip saddr @blocked_ranges drop

        # Allow services
        tcp dport @allowed_services accept
    }
}
```

## Rate Limiting with nftables

nftables handles rate limiting natively:

```bash
# Rate limit SSH connections - drop if more than 3 new connections per 30 seconds per IP
sudo nft add rule inet filter input \
    tcp dport 22 \
    ct state new \
    limit rate over 3/minute \
    drop

# Allow SSH within the rate limit
sudo nft add rule inet filter input \
    tcp dport 22 \
    ct state new \
    accept
```

In a config file:

```
chain input {
    type filter hook input priority 0; policy drop;

    # SSH rate limiting - drop if exceeding 3 new connections per 30 seconds
    tcp dport 22 ct state new meter ssh-rate-limit { ip saddr limit rate 3/minute } accept
    tcp dport 22 ct state new drop
}
```

## NAT with nftables

For servers acting as NAT gateways:

```bash
# Create a NAT table
sudo nft add table ip nat

# Add prerouting and postrouting chains
sudo nft add chain ip nat prerouting \
    '{ type nat hook prerouting priority -100; }'

sudo nft add chain ip nat postrouting \
    '{ type nat hook postrouting priority 100; }'

# Masquerade outbound traffic (SNAT for internet sharing)
sudo nft add rule ip nat postrouting \
    oif eth0 masquerade

# Port forwarding (DNAT) - forward external port 8080 to internal host
sudo nft add rule ip nat prerouting \
    tcp dport 8080 \
    dnat to 192.168.1.100:80
```

## Migrating from iptables

nftables provides translation tools:

```bash
# Install translation tools
sudo apt install -y iptables-nftables-compat

# Translate iptables rules to nftables syntax
sudo iptables-save | iptables-restore-translate

# Translate and apply directly
sudo iptables-save | iptables-restore-translate | sudo nft -f -

# Save translated rules to a file
sudo iptables-save | iptables-restore-translate > /etc/nftables-migrated.conf
```

The translated rules work but often aren't as clean as hand-written nftables rules. Use the translation as a starting point.

## Viewing and Debugging Rules

```bash
# List all rules
sudo nft list ruleset

# List a specific table
sudo nft list table inet filter

# List a specific chain
sudo nft list chain inet filter input

# Add rule handles to identify rules (for deletion)
sudo nft -a list ruleset

# Add a counter to a rule for debugging
sudo nft add rule inet filter input tcp dport 80 counter accept

# View counter values
sudo nft list ruleset | grep counter
```

## Atomic Rule Replacement

One of nftables' advantages is atomic ruleset replacement:

```bash
# Prepare a new ruleset file
sudo nano /etc/nftables.conf.new

# Test it
sudo nft -c -f /etc/nftables.conf.new

# Atomically replace the current ruleset
# The 'flush ruleset' at the top of the file handles cleanup
sudo nft -f /etc/nftables.conf.new

# If successful, rename to the active config
sudo cp /etc/nftables.conf.new /etc/nftables.conf
```

The `flush ruleset` at the beginning of the config file removes all existing rules before loading new ones, ensuring no stale rules remain.

nftables has a steeper initial learning curve than iptables, but the unified syntax, better performance with sets, and atomic rule replacement make it the better choice for new deployments. Ubuntu 22.04 and later use nftables as the default backend even when you're using iptables commands, so understanding nftables directly makes troubleshooting more straightforward.
