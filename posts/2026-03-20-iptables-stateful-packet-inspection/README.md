# How to Configure Stateful Packet Inspection with iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, Stateful Firewall, Connection Tracking, IPv4, Linux, Security

Description: Use iptables connection tracking (conntrack) module to implement stateful packet inspection that allows return traffic for established connections automatically.

Stateful packet inspection (SPI) tracks the state of network connections and automatically allows return traffic, eliminating the need for explicit rules in both directions.

## Connection States in iptables

| State | Description |
|---|---|
| NEW | Starts a new connection, or a connection only seen in one direction so far |
| ESTABLISHED | Part of a connection that has seen traffic in both directions |
| RELATED | Starts a new connection related to an existing one (e.g., FTP data channel) |
| INVALID | Can't be identified or tracked correctly |

## Basic Stateful Firewall

```bash
# This single rule allows all return traffic for outbound connections

# Without it, you'd need symmetric rules for every service
sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow outbound (and its return traffic will be allowed by the ESTABLISHED rule)
sudo iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT

# Then apply default deny:
sudo iptables -P INPUT DROP
sudo iptables -P OUTPUT DROP

# No INPUT rules needed for these - ESTABLISHED handles responses
```

## Using the Modern conntrack Module

The `conntrack` module is the newer replacement for `state`:

```bash
# Using conntrack instead of state (more modern and feature-rich)
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Allow new inbound connections for specific services
sudo iptables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 443 -j ACCEPT
```

## Complete Stateful Firewall Script

```bash
#!/bin/bash
# stateful-firewall.sh

# Start permissive so existing sessions are not dropped during rule replacement
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
iptables -P FORWARD ACCEPT

# Flush existing rules
iptables -F
iptables -X

# === INPUT CHAIN ===

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established and related connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Drop invalid packets
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Allow ICMP ping
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 5/s -j ACCEPT

# Allow new SSH connections
iptables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 22 -j ACCEPT

# Allow new HTTPS connections
iptables -A INPUT -m conntrack --ctstate NEW -p tcp --dport 443 -j ACCEPT

# Log and drop everything else
iptables -A INPUT -j LOG --log-prefix "INPUT_DROP: " --log-level 4

# === OUTPUT CHAIN ===
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established outbound connections
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow new DNS queries
iptables -A OUTPUT -m conntrack --ctstate NEW -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate NEW -p tcp --dport 53 -j ACCEPT

# Allow new HTTP/HTTPS outbound
iptables -A OUTPUT -m conntrack --ctstate NEW -p tcp --dport 80 -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate NEW -p tcp --dport 443 -j ACCEPT

# Allow NTP
iptables -A OUTPUT -m conntrack --ctstate NEW -p udp --dport 123 -j ACCEPT

# Default deny
iptables -P INPUT DROP
iptables -P OUTPUT DROP
iptables -P FORWARD DROP

echo "Stateful firewall configured"
```

## Viewing Connection Tracking Table

```bash
# On Debian/Ubuntu, install conntrack tools
sudo apt install conntrack -y

# View all tracked connections
sudo conntrack -L

# Filter by state
sudo conntrack -L | grep ESTABLISHED | head -10

# Watch in real time
sudo conntrack -E

# Count total connections
sudo conntrack -C
```

## Handling FTP (Connection Tracking Helper)

FTP uses separate control and data connections - with the FTP helper assigned, the data connection can be tracked as `RELATED`:

```bash
# Load the FTP connection tracking helper
sudo modprobe nf_conntrack_ftp

# On current kernels, explicitly assign the helper to outbound FTP control traffic
sudo iptables -t raw -A OUTPUT -p tcp --dport 21 -j CT --helper ftp

# Allow RELATED FTP data channels according to your firewall policy
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

Stateful inspection dramatically simplifies firewall rules - you only write rules for initiating new connections, and return traffic is handled automatically by the connection tracking table.
