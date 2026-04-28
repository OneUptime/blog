# How to Write nftables Rules from Scratch on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nftables, Linux, Firewall, IPv4, Security, Networking

Description: Build an nftables firewall configuration from scratch using tables, chains, and rules for IPv4 traffic filtering on a Linux server.

nftables uses a clean, unified syntax that replaces iptables, ip6tables, and arptables. Understanding the hierarchy of tables, chains, and rules makes writing nftables configs straightforward.

## nftables Architecture

```text
Table (ip = IPv4, ip6 = IPv6, inet = both)
  └── Chain (input, output, forward, or custom)
        └── Rules (match conditions + actions)
```

## Basic Commands

```bash
# List all rules

sudo nft list ruleset

# Flush all rules (careful in production!)
sudo nft flush ruleset

# Add rules interactively or from a file
sudo nft -f /etc/nftables.conf
```

## Writing a Complete Firewall from Scratch

```text
# /etc/nftables.conf - Complete firewall configuration

# Flush existing ruleset first (idempotent)
flush ruleset

# Create the main firewall table for IPv4
table ip firewall {

    # Define a set for blocked IPs (populated dynamically)
    set blocklist {
        type ipv4_addr
        flags dynamic, timeout
        timeout 1h
    }

    chain inbound {
        # Hook: intercept all inbound packets
        # Priority: 0 (normal)
        # Policy: drop by default
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iifname "lo" accept

        # Allow established and related connections (stateful)
        ct state established,related accept

        # Drop invalid connections
        ct state invalid drop

        # Drop connections from blocked IPs
        ip saddr @blocklist drop

        # Allow ICMP (ping)
        icmp type echo-request accept

        # Allow SSH from management network only
        ip saddr 10.10.10.0/24 tcp dport 22 accept

        # Allow web traffic from anywhere
        tcp dport { 80, 443 } accept

        # Log and drop everything else
        log prefix "nft-drop: " drop
    }

    chain outbound {
        type filter hook output priority 0; policy accept;

        # Allow DNS, HTTP/HTTPS outbound
        udp dport 53 accept
        tcp dport { 53, 80, 443 } accept

        # Allow NTP
        udp dport 123 accept
    }

    chain forward {
        # Block all forwarding by default
        type filter hook forward priority 0; policy drop;
    }
}
```

## Adding Rules Interactively

```bash
# Add a rule to allow a new port
sudo nft add rule ip firewall inbound tcp dport 8080 accept

# Add a rule to the beginning of a chain
sudo nft insert rule ip firewall inbound tcp dport 9090 accept

# Add a rule with a comment
sudo nft add rule ip firewall inbound tcp dport 3000 accept comment "NodeJS app"
```

## NAT with nftables

```bash
# Enable IP forwarding first
sudo sysctl -w net.ipv4.ip_forward=1

# nftables NAT configuration
sudo nft add table ip nat
sudo nft add chain ip nat prerouting { type nat hook prerouting priority -100 \; }
sudo nft add chain ip nat postrouting { type nat hook postrouting priority 100 \; }

# Masquerade outbound traffic (for VPN or router)
sudo nft add rule ip nat postrouting ip saddr 10.0.0.0/8 oif "eth0" masquerade

# DNAT - port forwarding
sudo nft add rule ip nat prerouting tcp dport 80 dnat to 192.168.1.10:8080
```

## Sets and Dictionaries for Efficiency

```bash
# Create a set for allowed IPs
sudo nft add set ip firewall allowed_ips { type ipv4_addr \; }
sudo nft add element ip firewall allowed_ips { 10.10.10.5, 10.10.10.6 }

# Use the set in a rule
sudo nft add rule ip firewall inbound ip saddr @allowed_ips tcp dport 22 accept
```

## Saving and Loading Rules

```bash
# Save current ruleset (prepend "flush ruleset" so it reloads cleanly)
sudo sh -c '{ echo "flush ruleset"; nft list ruleset; } > /etc/nftables.conf'

# Load at boot
sudo systemctl enable nftables
sudo systemctl start nftables

# Or manually load
sudo nft -f /etc/nftables.conf
```

nftables' set-based matching and clean syntax make complex firewall policies much more maintainable than equivalent iptables configurations.
