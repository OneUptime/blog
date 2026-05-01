# How to Configure firewalld IPv6 Rich Rules on CentOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, firewalld, CentOS, Rich Rules, Linux

Description: Learn how to configure IPv6 firewall rules on CentOS using firewalld rich rules, including service access control, source-based filtering, and permanent rule persistence.

## Overview

firewalld is the default firewall management tool on CentOS, RHEL, and Fedora. It supports IPv6 natively alongside IPv4. firewalld uses zones to classify network traffic and rich rules for complex IPv6-specific policies. Rich rules allow you to control access by source IPv6 address, protocol, and port.

## firewalld Basic Concepts

```text
Zones:          public, home, work, internal, trusted, dmz, drop, block, external
Zone assignment: Interfaces or source addresses → zones
Rules:          Services, ports, protocols, or rich rules
Runtime vs Permanent: Without --permanent, changes are runtime-only; reload applies permanent config
```

## Check and Configure firewalld

```bash
# Check firewalld status

systemctl status firewalld

# Start and enable
systemctl enable --now firewalld

# Check firewalld version and backend
firewall-cmd --version
# Note: firewalld uses nftables (backend) by default on RHEL 8+
grep FirewallBackend /etc/firewalld/firewalld.conf
# FirewallBackend=nftables  (or iptables on older versions)
```

## Basic Service and Port Rules

```bash
# Allow SSH (works for both IPv4 and IPv6)
firewall-cmd --permanent --add-service=ssh

# Allow HTTP and HTTPS
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# Allow a specific port
firewall-cmd --permanent --add-port=8443/tcp

# Reload to apply permanent rules
firewall-cmd --reload

# Verify
firewall-cmd --list-all
```

## IPv6-Specific Rich Rules

Rich rules allow more granular control, including IPv6 source address filtering:

### Allow Service from IPv6 Source

```bash
# Allow SSH only from IPv6 management prefix
firewall-cmd --permanent --add-rich-rule='
  rule family="ipv6"
  source address="2001:db8:100::/48"
  service name="ssh"
  accept'

# Allow custom port from specific IPv6 address
firewall-cmd --permanent --add-rich-rule='
  rule family="ipv6"
  source address="2001:db8:100::10/128"
  port port="9090" protocol="tcp"
  accept'

firewall-cmd --reload
```

### Block IPv6 Sources

```bash
# Block specific attacker prefix
firewall-cmd --permanent --add-rich-rule='
  rule family="ipv6"
  source address="2001:db8:bad0::/48"
  drop'

# Block with logging
firewall-cmd --permanent --add-rich-rule='
  rule family="ipv6"
  source address="2001:db8:bad0::/48"
  log prefix="BLOCKED-IPV6: " level="warning"
  drop'

firewall-cmd --reload
```

### Rate Limiting with Rich Rules

```bash
# Rate limit SSH connections
firewall-cmd --permanent --add-rich-rule='
  rule family="ipv6"
  service name="ssh"
  limit value="4/m"
  accept'

# Limit ICMP echo
firewall-cmd --permanent --add-rich-rule='
  rule family="ipv6"
  icmp-type name="echo-request"
  limit value="10/s"
  accept'

firewall-cmd --reload
```

## Zone-Based IPv6 Configuration

```bash
# Create a custom zone for IPv6 management
firewall-cmd --permanent --new-zone=ipv6-mgmt

# Add your management IPv6 prefix to this zone
firewall-cmd --permanent --zone=ipv6-mgmt --add-source=2001:db8:100::/48

# Allow services in this zone
firewall-cmd --permanent --zone=ipv6-mgmt --add-service=ssh
firewall-cmd --permanent --zone=ipv6-mgmt --add-service=cockpit

firewall-cmd --reload

# Verify
firewall-cmd --zone=ipv6-mgmt --list-all
```

## Listing IPv6 Rules

```bash
# List all rules in default zone
firewall-cmd --list-all

# List rich rules
firewall-cmd --list-rich-rules

# List all zones with their rules
firewall-cmd --list-all-zones

# Query if a service is allowed in the current zone
firewall-cmd --query-service=ssh
```

## Removing Rules

```bash
# Remove a rich rule
firewall-cmd --permanent --remove-rich-rule='
  rule family="ipv6"
  source address="2001:db8:bad0::/48"
  drop'

# Remove a service
firewall-cmd --permanent --remove-service=http

firewall-cmd --reload
```

## ICMP Configuration

```bash
# Check which ICMP types are blocked
firewall-cmd --list-icmp-blocks

# Block ping
firewall-cmd --permanent --add-icmp-block=echo-request   # Block ping

# Optional: invert handling so only listed ICMP types are accepted
firewall-cmd --permanent --add-icmp-block-inversion

# List available ICMP types
firewall-cmd --get-icmptypes
```

## Summary

firewalld on CentOS/RHEL supports IPv6 natively. Use `--add-service` and `--add-port` for basic rules (applies to both IPv4 and IPv6). For IPv6-specific control, use rich rules with `family="ipv6"` and `source address="prefix"`. Zone-based configuration allows grouping trusted IPv6 prefixes (management networks, trusted servers) into zones with appropriate service access. Always use `--permanent` for persistent rules and run `firewall-cmd --reload` after changes. List current IPv6 rich rules with `firewall-cmd --list-rich-rules`.
