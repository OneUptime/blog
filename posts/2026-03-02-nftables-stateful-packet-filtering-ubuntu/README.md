# How to Configure nftables for Stateful Packet Filtering on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, nftables, Firewall, Security, Networking

Description: Configure nftables on Ubuntu for stateful packet filtering, including table and chain setup, connection tracking, rate limiting, and practical production rulesets.

---

nftables is the successor to iptables, introduced in Linux kernel 3.13 and now the default packet filtering framework on modern Linux systems. Ubuntu 20.04 and later use nftables under the hood even when you use UFW - but nftables directly gives you more power and a cleaner rule syntax than the old iptables interface.

Stateful packet filtering means the firewall tracks connection state (NEW, ESTABLISHED, RELATED, INVALID) and makes filtering decisions based on that context rather than treating each packet independently. This is the foundation of modern host firewalls.

## nftables vs iptables

Key differences:
- Single tool (`nft`) handles IPv4, IPv6, ARP, and bridge filtering
- Cleaner rule syntax with sets and maps
- Better performance for large rulesets
- No separate `iptables`, `ip6tables`, `arptables` commands
- Rules are organized in tables > chains > rules

## Installing and Verifying nftables

```bash
# nftables is typically pre-installed on Ubuntu 20.04+
sudo apt install -y nftables

# Enable and start the service
sudo systemctl enable --now nftables

# Check version
nft --version

# Check current ruleset (empty on fresh install)
sudo nft list ruleset
```

## nftables Concepts

Before writing rules, understand the hierarchy:

- **Table**: top-level container, has a family (ip, ip6, inet, arp, bridge)
- **Chain**: contains rules, has a type (filter, nat, mangle), hook, and priority
- **Rule**: individual filtering rule within a chain

The `inet` family handles both IPv4 and IPv6 in one set of rules, which is usually what you want.

## Creating a Basic Stateful Firewall

```bash
# Create a complete ruleset configuration file
sudo nano /etc/nftables.conf
```

```nftables
#!/usr/sbin/nft -f
# /etc/nftables.conf - stateful firewall configuration

# Flush existing ruleset
flush ruleset

# Define the main firewall table (inet handles both IPv4 and IPv6)
table inet filter {

    # Define a set for trusted subnets (easier to manage)
    set trusted_subnets {
        type ipv4_addr
        flags interval
        elements = {
            10.0.0.0/8,
            192.168.0.0/16
        }
    }

    # INPUT chain - handles incoming packets
    chain input {
        # Default: drop all input
        type filter hook input priority filter; policy drop;

        # Connection tracking - allow established and related connections
        # This is the core of stateful filtering
        ct state established,related accept
        ct state invalid drop

        # Always allow loopback traffic
        iif "lo" accept

        # ICMP - allow ping and important control messages
        ip protocol icmp accept
        ip6 nexthdr icmpv6 accept

        # SSH from trusted subnets only
        tcp dport 22 ip saddr @trusted_subnets accept

        # Web services - allow from anywhere
        tcp dport { 80, 443 } accept

        # Drop everything else (already the default policy)
    }

    # FORWARD chain - handles traffic being routed through this system
    chain forward {
        type filter hook forward priority filter; policy drop;
    }

    # OUTPUT chain - handles outgoing packets
    chain output {
        type filter hook output priority filter; policy accept;

        # Allow established connections (responses)
        ct state established,related accept
    }
}
```

Apply it:

```bash
# Apply the ruleset
sudo nft -f /etc/nftables.conf

# Verify it loaded correctly
sudo nft list ruleset

# Check the specific table
sudo nft list table inet filter
```

## Understanding Connection Tracking States

The `ct state` (connection tracking state) keyword is central to stateful filtering:

```nftables
ct state established,related accept   # most important - allows response traffic
ct state new accept                    # allow new connections (be selective)
ct state invalid drop                  # drop malformed/untracked packets
ct state untracked accept              # packets not tracked by conntrack
```

Without `ct state established,related accept`, your server cannot receive responses to connections it initiates (DNS queries, software updates, etc.).

## Rate Limiting with nftables

Protect against brute force attacks:

```nftables
table inet filter {
    chain input {
        type filter hook input priority filter; policy drop;

        # Allow established
        ct state established,related accept
        ct state invalid drop
        iif "lo" accept

        # Rate limit SSH connections
        tcp dport 22 ct state new \
            limit rate 5/minute burst 10 packets accept
        tcp dport 22 ct state new drop   # drop excess above rate limit

        # Rate limit new HTTP connections per source IP
        tcp dport 80 ct state new \
            meter flood { ip saddr limit rate 50/second } accept

        # ICMP rate limiting
        ip protocol icmp limit rate 10/second accept
        ip protocol icmp drop
    }
}
```

## Sets for Managing Multiple IPs

Sets let you define groups of IPs or ports that rules apply to:

```nftables
table inet filter {

    # Named set for admin IPs (can be modified at runtime)
    set admin_ips {
        type ipv4_addr
        flags interval
        elements = {
            10.0.10.0/24,    # management subnet
            203.0.113.50,    # admin's home IP
            203.0.113.51
        }
    }

    # Named set of restricted ports
    set restricted_ports {
        type inet_service
        elements = { 22, 5432, 6379, 9090 }
    }

    chain input {
        type filter hook input priority filter; policy drop;

        ct state established,related accept
        iif "lo" accept

        # Allow restricted ports only from admin IPs
        tcp dport @restricted_ports ip saddr @admin_ips accept

        # Public services
        tcp dport { 80, 443 } accept
    }
}
```

Modify sets at runtime without reloading the entire ruleset:

```bash
# Add an IP to the admin set
sudo nft add element inet filter admin_ips { 198.51.100.100 }

# Remove an IP
sudo nft delete element inet filter admin_ips { 198.51.100.100 }

# List set contents
sudo nft list set inet filter admin_ips
```

## Logging Rules

Add logging to track what the firewall is blocking:

```nftables
chain input {
    type filter hook input priority filter; policy drop;

    ct state established,related accept
    iif "lo" accept
    tcp dport { 80, 443 } accept

    # Log before dropping - useful for debugging
    log prefix "nft-drop: " level warn

    # The default drop policy applies after logging
}
```

View the logged packets:

```bash
# In syslog
sudo journalctl -k | grep "nft-drop"
sudo grep "nft-drop" /var/log/kern.log
```

## Saving and Restoring Rules

```bash
# Save current ruleset to file
sudo nft list ruleset > /etc/nftables.conf

# Or explicitly backup:
sudo nft list ruleset | sudo tee /etc/nftables-backup-$(date +%Y%m%d).conf

# Restore from file
sudo nft -f /etc/nftables.conf

# Flush (clear) all rules
sudo nft flush ruleset
```

The nftables service loads `/etc/nftables.conf` automatically at boot:

```bash
# Verify the service will load your config
sudo systemctl cat nftables | grep ExecStart
# Should show: ExecStart=/sbin/nft -f /etc/nftables.conf
```

## Production-Ready Ruleset

A complete ruleset for a web server:

```nftables
#!/usr/sbin/nft -f
# /etc/nftables.conf - production web server firewall
# Updated: 2026-03-02

flush ruleset

table inet filter {

    set management_nets {
        type ipv4_addr
        flags interval
        elements = {
            10.0.10.0/24,     # management network
            192.168.100.0/24  # ops team VPN
        }
    }

    chain input {
        type filter hook input priority filter; policy drop;

        # Connection tracking - stateful rules
        ct state vmap {
            established: accept,
            related: accept,
            invalid: drop
        }

        # Loopback
        iif "lo" accept

        # ICMP
        ip protocol icmp icmp type {
            echo-request,
            destination-unreachable,
            time-exceeded
        } limit rate 10/second accept

        ip6 nexthdr icmpv6 icmpv6 type {
            echo-request,
            nd-neighbor-solicit,
            nd-neighbor-advert,
            nd-router-advert
        } accept

        # SSH - management only, rate limited
        tcp dport 22 ip saddr @management_nets \
            ct state new limit rate 10/minute accept

        # Web traffic
        tcp dport { 80, 443 } ct state new accept

        # Log and drop everything else
        limit rate 5/second log prefix "nft-blocked: " level info

        # Implicit drop (policy)
    }

    chain forward {
        type filter hook forward priority filter; policy drop;
    }

    chain output {
        type filter hook output priority filter; policy accept;
    }
}
```

## Monitoring nftables

```bash
# Show rule hit counts (useful for verifying rules are matching)
sudo nft list ruleset -a

# Show with byte/packet counts
sudo nft list chain inet filter input

# Monitor matched rules in real time (requires kernel support)
sudo nft monitor trace

# Check connection tracking table
sudo conntrack -L 2>/dev/null | head -20
sudo apt install -y conntrack  # if not installed
```

nftables provides a modern, unified approach to packet filtering that is worth learning even if you currently use UFW. The connection tracking and set features make it practical to write clean, efficient rulesets for complex scenarios that would be cumbersome in iptables or UFW.
