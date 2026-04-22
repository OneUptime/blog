# How to Set Up UFW (Uncomplicated Firewall) for IPv4 on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UFW, Ubuntu, Linux, Firewall, Security, IPv4

Description: Configure UFW on Ubuntu to create a simple, maintainable IPv4 firewall with a default deny policy, allowing only necessary services.

UFW (Uncomplicated Firewall) is Ubuntu's frontend to iptables designed for simplicity. It provides sensible defaults and human-readable syntax while managing the underlying iptables rules automatically.

## Install and Enable UFW

```bash
# Install UFW (usually pre-installed on Ubuntu)

sudo apt install ufw -y

# Check current status
sudo ufw status verbose

# Enable UFW (enable AFTER setting rules if not already running)
# WARNING: ensure you allow SSH first to avoid lockout
sudo ufw enable
```

## Set Default Policies

Always start with a default-deny inbound policy:

```bash
# Default: deny all incoming, allow all outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Verify
sudo ufw status verbose
# Status: active
# Default: deny (incoming), allow (outgoing)
```

## Allow Common Services

```bash
# Allow SSH (critical - do this before enabling!)
sudo ufw allow ssh          # By service name (TCP 22)
# or
sudo ufw allow 22/tcp       # By port/protocol

# Allow HTTP and HTTPS
sudo ufw allow http         # TCP 80
sudo ufw allow https        # TCP 443

# Allow a specific port range
sudo ufw allow 8000:8080/tcp

# Allow a specific application profile
sudo ufw app list           # List available app profiles
sudo ufw allow 'Nginx Full' # Allow HTTP + HTTPS via app profile
```

## Allow from Specific IPs

```bash
# Allow SSH only from your office IP
sudo ufw allow proto tcp from 203.0.113.10 to any port 22

# Allow all traffic from a trusted subnet
sudo ufw allow from 10.0.0.0/8

# Allow specific port from specific source
sudo ufw allow from 192.168.1.50 to any port 5432 proto tcp
```

## Delete and Manage Rules

```bash
# List rules with numbers
sudo ufw status numbered

# Delete rule by number
sudo ufw delete 3

# Delete rule by specification
sudo ufw delete allow 8080/tcp

# Reset all rules (caution - disables UFW)
sudo ufw reset
```

## Deny Specific Connections

```bash
# Block an IP address
sudo ufw deny from 1.2.3.4

# Block a subnet
sudo ufw deny from 192.0.2.0/24

# Block a specific port
sudo ufw deny 23/tcp     # Block Telnet
```

## UFW Application Profiles

UFW supports named application profiles:

```bash
# List available application profiles
sudo ufw app list

# View profile details
sudo ufw app info 'Nginx Full'
# Ports: 80,443/tcp

# Allow the app profile
sudo ufw allow 'OpenSSH'
```

## Enable Logging

```bash
# Enable UFW logging (commonly logs to /var/log/ufw.log via rsyslog)
sudo ufw logging on

# Set log level (low, medium, high, full)
sudo ufw logging medium

# View UFW logs (if rsyslog writes /var/log/ufw.log)
sudo tail -f /var/log/ufw.log

# Example UFW log entry:
# UFW BLOCK IN=eth0 OUT= MAC=... SRC=1.2.3.4 DST=10.0.0.1
# LEN=44 TOS=0x00 PREC=0x00 TTL=52 ID=0 PROTO=TCP
# SPT=54321 DPT=3306 WINDOW=1024 RES=0x00 SYN URGP=0
```

## View and Test

```bash
# Show all rules with verbose details
sudo ufw status verbose

# Show in numbered format for management
sudo ufw status numbered

# Preview rule changes without applying them (dry run)
sudo ufw --dry-run allow http

# Inspect active UFW-managed iptables rules
sudo iptables -L -n | grep -A5 "ufw"
```

UFW makes firewall management approachable without sacrificing control, making it the ideal tool for Ubuntu servers where simplicity and correctness matter equally.
