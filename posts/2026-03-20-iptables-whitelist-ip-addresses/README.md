# How to Whitelist IP Addresses with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Whitelist, Linux, Security, Firewall, Access Control

Description: Create iptables allowlists to restrict access to services from specific trusted IP addresses or subnets, blocking all other sources by default.

Whitelisting - allowing only known trusted IPs - is the most restrictive and secure approach to access control. For sensitive services like SSH, admin interfaces, and databases, only accepting connections from specific IPs dramatically reduces attack surface.

These examples use IPv4 with `iptables`; if your host also has IPv6 enabled, apply equivalent rules with `ip6tables` or IPv6 traffic will not be filtered by these rules.

## Whitelist a Single IP for SSH

```bash
# Allow SSH only from your home/office IP

sudo iptables -A INPUT -p tcp --dport 22 \
  -s 203.0.113.10 -j ACCEPT

# Allow SSH from your VPN server
sudo iptables -A INPUT -p tcp --dport 22 \
  -s 10.200.0.1 -j ACCEPT

# Block SSH from everyone else
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

# WARNING: Test the above from an ALLOWED IP before adding the DROP rule
```

## Whitelist a Subnet

```bash
# Allow a management subnet to access all services
sudo iptables -A INPUT -s 10.100.0.0/24 -j ACCEPT

# Allow a specific office network for SSH only
sudo iptables -A INPUT -p tcp --dport 22 \
  -s 192.168.1.0/24 -j ACCEPT
```

## Whitelist Multiple IPs with a Script

```bash
#!/bin/bash
# whitelist-ssh.sh - Allow SSH only from trusted IPs

TRUSTED_IPS=(
    "203.0.113.10"    # Home IP
    "198.51.100.5"    # Colleague IP
    "10.0.0.0/8"      # Internal network
)

# Allow from each trusted source
for IP in "${TRUSTED_IPS[@]}"; do
    sudo iptables -A INPUT -p tcp --dport 22 -s "$IP" -j ACCEPT
done

# Block SSH from all other sources
sudo iptables -A INPUT -p tcp --dport 22 -j DROP

echo "SSH whitelisted for ${#TRUSTED_IPS[@]} sources"
```

## Efficient Whitelisting with ipset

For many trusted IPs, ipset is much more efficient than individual rules:

```bash
# Create an allowlist set
sudo ipset create whitelist hash:net family inet

# Add trusted IPs/ranges
sudo ipset add whitelist 203.0.113.10
sudo ipset add whitelist 198.51.100.0/24
sudo ipset add whitelist 10.0.0.0/8

# Allow whitelisted IPs through SSH
sudo iptables -A INPUT -p tcp --dport 22 \
  -m set --match-set whitelist src -j ACCEPT

# Block everyone else
sudo iptables -A INPUT -p tcp --dport 22 -j DROP
```

## Whitelist an Admin Interface

```bash
# Admin panel on port 8443 - only internal network
sudo iptables -A INPUT -p tcp --dport 8443 \
  -s 10.0.0.0/8 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8443 -j DROP

# Database port - only from application servers
sudo iptables -A INPUT -p tcp --dport 5432 \
  -s 10.100.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 5432 -j DROP
```

## Order Matters: Allow Before Deny

```bash
# WRONG order - allow rule comes after DROP, never matches:
sudo iptables -A INPUT -p tcp --dport 22 -j DROP
sudo iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT  # TOO LATE

# CORRECT order - allow first, then drop:
sudo iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT  # First
sudo iptables -A INPUT -p tcp --dport 22 -j DROP                   # Last

# Verify order with line numbers
sudo iptables -L INPUT -n --line-numbers
```

## Update the Whitelist Dynamically

```bash
# Add a new IP to an existing whitelist
sudo iptables -I INPUT 1 -p tcp --dport 22 \
  -s 203.0.113.99 -j ACCEPT
# -I INPUT 1 inserts at position 1, BEFORE the DROP rule

# Remove an IP from whitelist (when someone leaves)
sudo iptables -D INPUT -p tcp --dport 22 \
  -s 203.0.113.10 -j ACCEPT

# With ipset: even simpler
sudo ipset add whitelist 203.0.113.99    # Add
sudo ipset del whitelist 203.0.113.10   # Remove
# No iptables rule changes needed!
```

IP whitelisting provides the highest level of access control - even if credentials are stolen, an attacker can't use them from an unauthorized IP address.
