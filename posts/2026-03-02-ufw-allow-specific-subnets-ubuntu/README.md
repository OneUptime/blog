# How to Set Up ufw Allow from Specific Subnets on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Networking, Security

Description: Configure UFW to allow access from specific subnets and IP ranges on Ubuntu, useful for restricting services to internal networks, office IPs, or trusted infrastructure.

---

Allowing access from specific subnets rather than the entire internet is one of the most effective security controls for server-side services. SSH, databases, monitoring endpoints, and admin panels should not be accessible from arbitrary internet IPs - they should only be reachable from known, trusted networks.

UFW makes subnet-based rules straightforward with its `from` syntax.

## Basic Subnet Allow Rules

```bash
# Allow SSH from a specific subnet
sudo ufw allow from 192.168.1.0/24 to any port 22

# Allow from multiple specific subnets (one rule per subnet)
sudo ufw allow from 10.0.0.0/8 to any port 22       # class A private network
sudo ufw allow from 172.16.0.0/12 to any port 22    # class B private range
sudo ufw allow from 192.168.0.0/16 to any port 22   # class C private range

# Allow from a single specific IP (use /32 for a host address)
sudo ufw allow from 203.0.113.50 to any port 22
sudo ufw allow from 203.0.113.50/32 to any port 22  # same thing, explicit /32
```

The `to any` part means "destined for any IP on this server" - useful when a server has multiple IP addresses.

## Combining Subnet with Port and Protocol

```bash
# Allow PostgreSQL from the application server subnet only
sudo ufw allow from 10.0.1.0/24 to any port 5432 proto tcp

# Allow Redis from specific servers
sudo ufw allow from 10.0.1.10 to any port 6379 proto tcp
sudo ufw allow from 10.0.1.11 to any port 6379 proto tcp

# Allow monitoring from the monitoring server
sudo ufw allow from 10.0.5.50 to any port 9100 proto tcp  # Prometheus node exporter
sudo ufw allow from 10.0.5.50 to any port 8080 proto tcp  # custom metrics endpoint

# Allow NFS from storage clients
sudo ufw allow from 10.0.2.0/24 to any port 2049 proto tcp
sudo ufw allow from 10.0.2.0/24 to any port 111 proto tcp   # rpcbind
```

## Allowing All Traffic from a Subnet

When you want to fully trust a subnet:

```bash
# Allow all traffic from the management network
sudo ufw allow from 10.0.10.0/24

# This allows any protocol and port from that subnet
# Equivalent to adding this subnet to a whitelist
```

Use this for trusted internal networks where you manage all the machines and do not want to enumerate every service.

## Restricting Access to a Specific Destination IP

On servers with multiple IPs, you can restrict which IP a service is reachable on:

```bash
# Allow SSH only on the management IP, from the management subnet
sudo ufw allow from 10.0.10.0/24 to 10.0.10.100 port 22 proto tcp

# Allow database access only on the internal IP, from app servers
sudo ufw allow from 10.0.1.0/24 to 10.0.0.50 port 5432 proto tcp

# Web traffic on public IP - no source restriction
sudo ufw allow to 203.0.113.50 port 80 proto tcp
sudo ufw allow to 203.0.113.50 port 443 proto tcp
```

## Office IP / Specific Location Rules

A common pattern is allowing admin access only from office IPs:

```bash
# Main office
sudo ufw allow from 203.0.113.0/24 to any port 22 comment "Main office SSH"
sudo ufw allow from 203.0.113.0/24 to any port 443 comment "Main office HTTPS admin"

# Remote office
sudo ufw allow from 198.51.100.0/24 to any port 22 comment "Remote office SSH"

# VPN exit node (users connected to corporate VPN)
sudo ufw allow from 10.8.0.0/24 to any port 22 comment "VPN users SSH"
```

The `comment` parameter is available in newer UFW versions and makes rules much easier to audit.

## Deny with Subnet (Blocklisting)

While allowlisting is the primary approach, you can also blocklist subnets:

```bash
# Block an entire country range (example - Tor exit nodes)
sudo ufw deny from 185.220.100.0/24

# Block a specific known-bad IP
sudo ufw deny from 192.0.2.100

# Block access to a specific port from a subnet
sudo ufw deny from 10.0.99.0/24 to any port 3306
```

UFW rules are evaluated in order - more specific rules should come before broader ones.

## Rule Ordering and Precedence

UFW evaluates rules in order and applies the first matching rule:

```bash
# View rules with their numbers
sudo ufw status numbered

# If you deny first and allow later, the deny wins for that source
# Wrong order:
sudo ufw deny from 10.0.0.0/8 to any port 22      # rule 1
sudo ufw allow from 10.0.1.0/24 to any port 22    # rule 2 - never reached for 10.0.1.x

# Correct order - more specific rules first:
sudo ufw insert 1 allow from 10.0.1.0/24 to any port 22   # more specific
sudo ufw deny from 10.0.0.0/8 to any port 22              # broader deny after
```

## Building a Complete Subnet-Based Policy

Here is a practical configuration for a database server that should only be accessible from application servers and DBAs:

```bash
# Reset if starting fresh
# sudo ufw reset

# Default policy - deny all incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Database port (5432) - only from application server subnet
sudo ufw allow from 10.0.1.0/24 to any port 5432 proto tcp \
  comment "App servers to PostgreSQL"

# SSH - only from management/DBA subnet
sudo ufw allow from 10.0.10.0/24 to any port 22 proto tcp \
  comment "DBA/admin SSH access"

# Monitoring - from monitoring server
sudo ufw allow from 10.0.5.50 to any port 9187 proto tcp \
  comment "Prometheus PostgreSQL exporter"

# Backup - from backup server
sudo ufw allow from 10.0.6.10 to any port 22 proto tcp \
  comment "Backup SSH"

# Enable
sudo ufw enable

# Verify
sudo ufw status verbose
```

## IPv6 Subnet Rules

UFW handles IPv6 rules separately but with the same syntax. Check that IPv6 is enabled in UFW:

```bash
# Verify IPv6 is enabled in UFW config
grep IPV6 /etc/default/ufw
# Should show: IPV6=yes

# Allow from an IPv6 subnet
sudo ufw allow from 2001:db8::/32 to any port 22

# Allow from a specific IPv6 address
sudo ufw allow from 2001:db8::1 to any port 22
```

## Viewing and Managing Subnet Rules

```bash
# Show all rules with numbers
sudo ufw status numbered

# Show only rules containing a specific IP/subnet
sudo ufw status | grep "10.0.1"

# Delete a rule by number
sudo ufw status numbered
sudo ufw delete 5   # delete rule number 5

# Delete a rule by specification
sudo ufw delete allow from 192.168.1.0/24 to any port 22
```

## Scripting Subnet Rules for Many IPs

When you have a list of allowed IPs (from a file or configuration management):

```bash
#!/bin/bash
# apply-firewall-rules.sh - apply subnet allow rules from a list

ALLOWED_SUBNETS=(
  "192.168.1.0/24"
  "10.0.0.0/8"
  "203.0.113.0/24"
)

PORT=22
PROTO=tcp

for subnet in "${ALLOWED_SUBNETS[@]}"; do
  echo "Allowing $subnet to port $PORT/$PROTO"
  sudo ufw allow from "$subnet" to any port "$PORT" proto "$PROTO"
done
```

## Verifying Subnet Rules Are Working

```bash
# Test that allowed subnet can connect
# From a machine in 10.0.1.0/24:
ssh admin@server

# Test that blocked subnet cannot connect
# From a machine outside allowed subnets:
# Should timeout or get connection refused

# Check which rules matched recent traffic
sudo ufw logging on
sudo grep "UFW" /var/log/ufw.log | tail -20

# Look for ALLOW entries matching your test connections
sudo grep "UFW ALLOW" /var/log/ufw.log | grep "DPT=22" | tail -10
# Look for BLOCK entries to verify unauthorized sources are blocked
sudo grep "UFW BLOCK" /var/log/ufw.log | grep "DPT=22" | tail -10
```

Subnet-based restrictions are one of the most impactful firewall configurations you can make. A database port that is only reachable from known application servers eliminates entire categories of attack surface, regardless of whether the database has its own authentication controls. Defense in depth means applying restrictions at every layer, and the firewall layer is the most reliable.
