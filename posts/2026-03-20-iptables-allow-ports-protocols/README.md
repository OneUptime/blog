# How to Allow Specific Ports and Protocols in iptables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: iptables, IPv4, Linux, Firewall, Port, Security

Description: Write iptables rules to allow specific TCP and UDP ports and protocols for common services while maintaining a secure firewall baseline.

After establishing a default deny policy, you add explicit allow rules for each required service. This guide covers common patterns for web servers, databases, DNS, and other services.

## TCP Port Rules

```bash
# Allow a single TCP port

sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT   # HTTP
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT  # HTTPS
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT   # SSH

# Allow a range of TCP ports
sudo iptables -A INPUT -p tcp --dport 8000:8080 -j ACCEPT

# Allow multiple specific ports using multiport
sudo iptables -A INPUT -p tcp -m multiport --dports 80,443,8080,8443 -j ACCEPT
```

## UDP Port Rules

```bash
# Allow inbound DNS queries to a local DNS server (UDP 53)
sudo iptables -A INPUT -p udp --dport 53 -j ACCEPT

# Allow outbound DNS queries from this host (UDP 53)
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT

# Allow WireGuard (UDP 51820)
sudo iptables -A INPUT -p udp --dport 51820 -j ACCEPT

# Allow NTP (UDP 123) outbound
sudo iptables -A OUTPUT -p udp --dport 123 -j ACCEPT
```

## Allow from Specific Source IP

```bash
# Allow SSH only from your management IP
sudo iptables -A INPUT -s 10.10.10.0/24 -p tcp --dport 22 -j ACCEPT

# Allow database access only from application servers
sudo iptables -A INPUT -s 192.168.1.0/24 -p tcp --dport 5432 -j ACCEPT

# Allow all traffic from trusted internal network
sudo iptables -A INPUT -s 10.0.0.0/8 -j ACCEPT
```

## Common Service Rules

```bash
# Web server
sudo iptables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT

# Database servers
sudo iptables -A INPUT -s 10.100.0.0/24 -p tcp --dport 5432 -j ACCEPT  # PostgreSQL
sudo iptables -A INPUT -s 10.100.0.0/24 -p tcp --dport 3306 -j ACCEPT  # MySQL
sudo iptables -A INPUT -s 10.100.0.0/24 -p tcp --dport 27017 -j ACCEPT # MongoDB

# Redis (only from app servers)
sudo iptables -A INPUT -s 10.100.2.0/24 -p tcp --dport 6379 -j ACCEPT

# Email services
sudo iptables -A INPUT -p tcp --dport 25 -j ACCEPT   # SMTP
sudo iptables -A INPUT -p tcp --dport 587 -j ACCEPT  # Submission
sudo iptables -A INPUT -p tcp --dport 993 -j ACCEPT  # IMAPS

# Kubernetes API server
sudo iptables -A INPUT -p tcp --dport 6443 -j ACCEPT

# Prometheus monitoring
sudo iptables -A INPUT -s 10.10.20.0/24 -p tcp --dport 9090 -j ACCEPT
```

## Stateful Rules (Recommended)

Always use connection tracking to allow only legitimate traffic:

```bash
# Allow NEW and ESTABLISHED inbound for SSH (connection-aware)
sudo iptables -A INPUT -p tcp --dport 22 \
  -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT

# Allow ESTABLISHED SSH responses to return
sudo iptables -A OUTPUT -p tcp --sport 22 \
  -m conntrack --ctstate ESTABLISHED -j ACCEPT

# The universal established/related rule (put near top of INPUT chain)
sudo iptables -I INPUT 1 -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
```

## Allowing ICMP

```bash
# Allow ping requests (inbound)
sudo iptables -A INPUT -p icmp --icmp-type echo-request -j ACCEPT

# Allow ping responses (outbound)
sudo iptables -A OUTPUT -p icmp --icmp-type echo-reply -j ACCEPT

# Allow all ICMP (less restrictive)
sudo iptables -A INPUT -p icmp -j ACCEPT
sudo iptables -A OUTPUT -p icmp -j ACCEPT
```

## Viewing Active Rules

```bash
# List all INPUT rules with port info
sudo iptables -L INPUT -n --line-numbers

# See packet/byte match counts
sudo iptables -L INPUT -n -v
```

Building allow rules incrementally - starting with essential services and adding more as needed - is safer than trying to write all rules upfront.
