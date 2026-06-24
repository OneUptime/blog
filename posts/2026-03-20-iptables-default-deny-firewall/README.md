# How to Set Up a Default Deny Firewall Policy with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Firewall, Linux, Security, Default Deny, IPv4

Description: Configure iptables with a default deny policy for all chains and then progressively add allow rules for required traffic, implementing a secure firewall baseline.

A default deny firewall policy denies all traffic unless explicitly permitted. This is the security-first approach to firewall design.

## Step 1: Flush Existing Rules and Set Default Policy

```bash
#!/bin/bash
# firewall-setup.sh - Default deny firewall

# Flush existing rules from the filter, nat, and mangle tables

iptables -F       # Flush all rules in the filter table
iptables -X       # Delete user-defined chains in the filter table
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Set default policies to DROP (deny all)
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

echo "Default deny policy applied"
```

**WARNING**: Running this immediately locks out all connections including your SSH session. Always add allow rules BEFORE or TOGETHER with the default deny policy.

## Step 2: Allow Essential Traffic

```bash
# Allow loopback interface (required for local services)
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related connections (critical for stateful firewall)
# This allows responses to connections you initiated
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (port 22) inbound - CRITICAL: do this before locking down
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow outbound SSH (if you need to SSH out)
sudo iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
```

## Step 3: Allow Required Services

```bash
# Allow HTTP/HTTPS inbound (web server)
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow DNS outbound (for hostname resolution)
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Allow HTTP/HTTPS outbound (for package updates, etc.)
sudo iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT

# Allow NTP outbound (time synchronization)
sudo iptables -A OUTPUT -p udp --dport 123 -j ACCEPT

# Allow ICMP (ping) inbound - remove if hardening strictly
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT
sudo iptables -A OUTPUT -p icmp -j ACCEPT
```

## Step 4: Complete Script with Safety Check

```bash
#!/bin/bash
# safe-firewall.sh - Default deny with pre-set SSH allow

# STEP 1: Allow SSH FIRST before denying anything
iptables -I INPUT 1 -p tcp --dport 22 -m state --state NEW,ESTABLISHED -j ACCEPT
iptables -I OUTPUT 1 -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT

# STEP 2: Now apply default deny
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# STEP 3: Loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# STEP 4: Established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# STEP 5: Specific services
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT

echo "Firewall configured with default deny policy"
iptables -L -n --line-numbers
```

## Verifying the Default Deny Policy

```bash
# Check that default policies are DROP
sudo iptables -L -n | grep "policy DROP"
# Expected:
# Chain INPUT (policy DROP)
# Chain FORWARD (policy DROP)
# Chain OUTPUT (policy DROP)

# On the firewall host, start a temporary listener on a port you did not allow
python3 -m http.server --bind 0.0.0.0 8888 &
# From another host:
nc -vz SERVER_IP 8888  # Should fail or time out because no INPUT rule allows port 8888
```

## Saving the Configuration

```bash
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
# Rules saved to /etc/iptables/rules.v4
```

The key insight with default deny: establish your SSH allow rule before the `iptables -P INPUT DROP` command, or you will lock yourself out.
