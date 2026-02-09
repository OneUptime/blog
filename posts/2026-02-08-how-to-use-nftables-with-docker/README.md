# How to Use nftables with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, nftables, Firewall, Networking, Linux, Security, iptables

Description: Configure Docker to work with nftables, the modern Linux firewall framework that replaces iptables.

---

Linux distributions are moving from iptables to nftables. Debian 10+, Ubuntu 20.04+, RHEL 8+, and Fedora have all made nftables the default firewall backend. Docker, however, was built around iptables. This creates friction: Docker inserts iptables rules, but the system expects nftables. The two frameworks can coexist through a compatibility layer, but understanding how they interact prevents subtle networking bugs.

This guide covers how to run Docker alongside nftables, configure nftables rules for Docker containers, and handle the transition from iptables cleanly.

## The iptables-nft Compatibility Layer

Modern Linux systems provide `iptables-nft`, a tool that translates iptables commands into nftables rules behind the scenes. Check which backend your system uses:

```bash
# Check if your system uses iptables-nft or legacy iptables
iptables --version
# iptables v1.8.7 (nf_tables)  <- nftables backend
# iptables v1.8.7 (legacy)     <- legacy iptables backend
```

If you see `(nf_tables)`, your system already translates Docker's iptables commands into nftables rules automatically. This means Docker works, but the rules show up in nftables as a special compatibility table.

```bash
# View the nftables ruleset including iptables-nft translated rules
sudo nft list ruleset
```

You will see tables like `ip filter` and `ip nat` containing Docker's rules, translated from iptables syntax.

## Checking for Conflicts

The most common problem is having both legacy iptables and nftables rules active. This causes unpredictable behavior:

```bash
# Check for legacy iptables rules that might conflict
sudo iptables-legacy -L -n 2>/dev/null
sudo iptables-legacy -t nat -L -n 2>/dev/null

# Check current nftables rules
sudo nft list ruleset
```

If both have rules, you need to consolidate. Flush one or the other:

```bash
# Flush legacy iptables if you are standardizing on nftables
sudo iptables-legacy -F
sudo iptables-legacy -t nat -F
sudo iptables-legacy -t mangle -F
```

## Setting Up Docker with nftables

Docker version 20.10 and later work with the iptables-nft backend. Ensure the alternatives system points to the nft version:

```bash
# Set iptables to use the nft backend on Debian/Ubuntu
sudo update-alternatives --set iptables /usr/sbin/iptables-nft
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-nft

# Restart Docker to pick up the change
sudo systemctl restart docker
```

Verify Docker created its rules through nftables:

```bash
# List nftables rules and look for Docker chains
sudo nft list table ip filter
sudo nft list table ip nat
```

## Writing Native nftables Rules for Docker

Instead of using iptables commands in the DOCKER-USER chain, you can write native nftables rules. First, understand the table structure:

```bash
# Show the filter table structure created by Docker (via iptables-nft)
sudo nft list table ip filter
```

Add custom rules using native nftables syntax:

```bash
# Add a custom nftables rule to restrict Docker published port access
sudo nft add rule ip filter DOCKER-USER iifname "eth0" tcp dport 8080 ip saddr != 192.168.1.0/24 drop

# Allow established connections
sudo nft insert rule ip filter DOCKER-USER ct state established,related accept

# Log dropped packets
sudo nft add rule ip filter DOCKER-USER iifname "eth0" log prefix "docker-drop: " drop
```

## Creating a Complete nftables Configuration

For a clean setup, define your Docker-related nftables rules in a configuration file:

```bash
# /etc/nftables.d/docker-custom.conf - Custom nftables rules for Docker
table ip docker-custom {
    chain forward-filter {
        type filter hook forward priority -1; policy accept;

        # Allow established connections
        ct state established,related accept

        # Allow internal networks to access all Docker containers
        ip saddr 10.0.0.0/8 accept
        ip saddr 172.16.0.0/12 accept
        ip saddr 192.168.0.0/16 accept

        # Rate limit new connections to published web ports
        iifname "eth0" tcp dport { 80, 443 } ct state new \
            limit rate 100/second burst 200 packets accept

        # Allow specific external IPs
        iifname "eth0" ip saddr 203.0.113.50 accept

        # Drop everything else from external interface to Docker bridges
        iifname "eth0" oifname "docker0" drop
        iifname "eth0" oifname "br-*" drop
    }
}
```

Load the configuration:

```bash
# Load the custom nftables rules
sudo nft -f /etc/nftables.d/docker-custom.conf

# Verify the new table exists
sudo nft list table ip docker-custom
```

## nftables Sets for Efficient IP Filtering

nftables has built-in set support (no need for ipset):

```bash
# Create a named set of allowed IP addresses
sudo nft add table ip docker-acl
sudo nft add set ip docker-acl allowed_ips '{ type ipv4_addr; }'

# Populate the set
sudo nft add element ip docker-acl allowed_ips '{ 203.0.113.10, 203.0.113.20, 198.51.100.0/24 }'

# Create a chain that uses the set
sudo nft add chain ip docker-acl filter '{ type filter hook forward priority -1; policy accept; }'
sudo nft add rule ip docker-acl filter iifname "eth0" oifname "docker0" \
    ip saddr != @allowed_ips drop
```

Update the set dynamically without reloading rules:

```bash
# Add a new IP to the allowed set
sudo nft add element ip docker-acl allowed_ips '{ 203.0.113.30 }'

# Remove an IP from the set
sudo nft delete element ip docker-acl allowed_ips '{ 203.0.113.10 }'

# List current set contents
sudo nft list set ip docker-acl allowed_ips
```

## Port Knocking with nftables and Docker

Implement port knocking to hide Docker services:

```bash
# /etc/nftables.d/docker-port-knock.conf
table ip port-knock {
    set knock-stage1 {
        type ipv4_addr
        timeout 10s
    }

    set knock-stage2 {
        type ipv4_addr
        timeout 10s
    }

    set allowed {
        type ipv4_addr
        timeout 300s
    }

    chain input {
        type filter hook forward priority -2; policy accept;

        # Stage 1: knock on port 7000
        iifname "eth0" tcp dport 7000 set add ip saddr @knock-stage1 drop

        # Stage 2: knock on port 8000 (must have completed stage 1)
        iifname "eth0" tcp dport 8000 ip saddr @knock-stage1 \
            set add ip saddr @knock-stage2 drop

        # Stage 3: knock on port 9000 (must have completed stage 2)
        iifname "eth0" tcp dport 9000 ip saddr @knock-stage2 \
            set add ip saddr @allowed drop

        # Allow access to Docker port 8080 only for IPs that completed the knock sequence
        iifname "eth0" oifname "docker0" tcp dport 80 ip saddr @allowed accept
        iifname "eth0" oifname "docker0" tcp dport 80 drop
    }
}
```

## Monitoring nftables Rules

nftables provides better monitoring than iptables:

```bash
# Show rules with packet and byte counters
sudo nft list ruleset -a

# Monitor nftables events in real-time
sudo nft monitor

# Show only specific table counters
sudo nft list table ip filter -a
```

Reset counters for fresh measurement:

```bash
# Reset all counters in a table
sudo nft reset counters table ip filter
```

## Persisting nftables Rules

Unlike iptables, nftables has a straightforward persistence model:

```bash
# Save the entire ruleset to the main configuration file
sudo nft list ruleset > /etc/nftables.conf

# On Debian/Ubuntu, enable the nftables service
sudo systemctl enable nftables

# Verify it loads on boot
sudo systemctl status nftables
```

For modular configuration:

```bash
# /etc/nftables.conf - Main configuration that includes Docker rules
#!/usr/sbin/nft -f

flush ruleset

include "/etc/nftables.d/*.conf"
```

```bash
# Create the includes directory and set permissions
sudo mkdir -p /etc/nftables.d
sudo chmod 700 /etc/nftables.d
```

## Troubleshooting nftables with Docker

Common issues and their fixes:

```bash
# Problem: Docker containers cannot reach the internet
# Check if masquerading is configured
sudo nft list table ip nat | grep masquerade

# Problem: Published ports not accessible
# Verify DNAT rules exist
sudo nft list chain ip nat DOCKER

# Problem: Containers on different networks can communicate (isolation broken)
# Check isolation chains
sudo nft list chain ip filter DOCKER-ISOLATION-STAGE-1

# Problem: Rules duplicated after Docker restart
# Check for duplicate chains
sudo nft list ruleset | grep -c "chain DOCKER "
```

## Migrating Existing iptables Rules to nftables

If you have existing DOCKER-USER iptables rules, translate them:

```bash
# Export current iptables rules in a format nftables can import
sudo iptables-save > /tmp/iptables-export.txt

# Convert to nftables format
sudo iptables-restore-translate -f /tmp/iptables-export.txt > /tmp/nftables-import.nft

# Review the converted rules before applying
cat /tmp/nftables-import.nft
```

## Conclusion

Docker and nftables work together through the iptables-nft compatibility layer. For most setups, this is transparent and requires no special configuration. When you need custom firewall rules, writing native nftables rules offers advantages over iptables: sets without external tools, better performance with large rulesets, atomic rule updates, and cleaner syntax. The key is understanding that Docker's rules appear in the nftables ruleset through the compatibility layer, and your custom rules should live in separate tables to avoid conflicts.
