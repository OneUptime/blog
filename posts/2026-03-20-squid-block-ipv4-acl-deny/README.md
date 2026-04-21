# How to Block IPv4 Address Ranges in Squid with ACL Deny Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv4, ACL, DENY, Blocking, Access Control

Description: Use Squid ACL deny rules to block specific IPv4 addresses, subnets, and ranges from using the proxy or accessing specific destinations.

## Introduction

Squid ACL deny rules block traffic based on client IP, destination IP, domain, or combinations. This is useful for enforcing acceptable use policies, blocking known-malicious IPs, and preventing data exfiltration to unauthorized destinations.

## Blocking Specific Client IPs

```bash
# /etc/squid/squid.conf

# Define blocked client IPs

acl blocked_clients src 192.0.2.100      # Single blocked IP
acl blocked_clients src 198.51.100.0/24  # Blocked subnet

# DENY blocked clients first (before any allow rules)
http_access deny blocked_clients

# Allow everyone else
acl all_clients src 0.0.0.0/0
http_access allow all_clients
```

## Blocking Access to Specific Destination IPs

```bash
# Block access to specific IPv4 destinations
acl malicious_destinations dst 192.0.2.0/24
acl malicious_destinations dst 198.51.100.50

http_access deny malicious_destinations
http_access allow all
```

## Blocking by Destination Domain and IP Combination

```bash
# Block known ad/tracker networks (IP-based)
acl ad_networks dst 203.0.113.0/24
acl ad_networks dst 198.51.100.128/25

# Also block by domain
acl blocked_domains dstdomain .doubleclick.net .ads.example.com

http_access deny ad_networks
http_access deny blocked_domains

acl internal src 10.0.0.0/8
http_access allow internal
http_access deny all
```

## Maintaining Block Lists from Files

```bash
# /etc/squid/blocked-ips.txt
# Updated from threat intelligence feeds
192.0.2.0/24
198.51.100.0/24
203.0.113.100
203.0.113.101

# /etc/squid/squid.conf
acl blocked_ips src "/etc/squid/blocked-ips.txt"
http_access deny blocked_ips
```

Auto-update script:

```bash
#!/bin/bash
# /usr/local/bin/update-squid-blocklist.sh

# Download threat feed
curl -sS https://threat-intel.example.com/malicious-ips.txt | \
  grep -E '^[0-9]' > /etc/squid/blocked-ips.txt

# Reload Squid to pick up new list
squid -k reconfigure
```

## Deny Rules for Sensitive Internal Resources

```bash
# Prevent proxy users from reaching internal management interfaces
acl internal_mgmt dst 10.10.0.0/24    # Management VLAN
acl internal_mgmt dst 10.10.1.0/24

# Block proxy access to management networks
http_access deny internal_mgmt

# Allow regular internet access
acl internet dst 0.0.0.0/0
http_access allow internet
```

## Logging Denied Requests

```bash
# /etc/squid/squid.conf

# Log requests to the access log
access_log daemon:/var/log/squid/access.log logformat=squid
# Denied requests show TCP_DENIED in access log

# Parse denied requests
sudo awk '/TCP_DENIED/{print $3, $7}' /var/log/squid/access.log | sort | uniq -c | sort -rn | head 20
```

## Conclusion

Squid ACL deny rules follow a simple pattern: define an ACL with `acl name type value`, then use `http_access deny acl_name` before any allow rules. Place deny rules at the top of `http_access` declarations since Squid evaluates them sequentially. Use file-based ACLs for large block lists and automate updates from threat intelligence feeds, reloading with `squid -k reconfigure` to apply changes without restarting.
