# How to Configure Squid ACL src to Allow Specific IPv4 Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, ACL, IPv4, Access Control, Src, Subnets

Description: Use Squid's ACL src directive to allow proxy access to specific IPv4 addresses and subnets while denying all other clients.

## Introduction

Squid uses Access Control Lists (ACLs) with `http_access` directives to control who can use the proxy. The `src` ACL type matches the client's source IPv4 address against IP addresses, CIDR ranges, or address files.

## Basic src ACL Configuration

```bash
# /etc/squid/squid.conf

http_port 10.0.0.1:3128

# Define ACLs for allowed source IPs

acl office_network    src 203.0.113.0/24      # Example office public IP range
acl internal_network  src 10.0.0.0/8          # RFC 1918 private
acl developer_ips     src 192.168.1.10         # Specific developer machine
acl developer_ips     src 192.168.1.11         # Another developer
acl vpn_clients       src 172.16.10.0/24       # VPN subnet

# Allow the defined sources
http_access allow office_network
http_access allow internal_network
http_access allow developer_ips
http_access allow vpn_clients

# Deny everything else
http_access deny all
```

## Using an IP File for Large Lists

For many IPs, use a file-based ACL:

```bash
# /etc/squid/allowed-ips.txt
# One IP or CIDR per line
10.0.0.5
10.0.0.6
192.168.1.0/24
203.0.113.0/26
```

```bash
# /etc/squid/squid.conf
acl allowed_clients src "/etc/squid/allowed-ips.txt"
http_access allow allowed_clients
http_access deny all
```

After updating the file, reload Squid:
```bash
sudo squid -k reconfigure
```

## Time-Based Access Control

Allow different IPs at different times:

```bash
acl business_hours time MTWHF 09:00-18:00
acl all_day_access  src 10.0.0.100  # Always-on monitoring server

acl internal src 10.0.0.0/8

# Monitoring server: always allowed
http_access allow all_day_access

# Internal network: only during business hours
http_access allow internal business_hours

http_access deny all
```

## Combining src with Destination ACLs

Allow internal clients to access only approved destinations:

```bash
acl internal_clients  src 10.0.0.0/8
acl approved_sites    dstdomain .example.com .partner.com
acl social_media      dstdomain .twitter.com .facebook.com .tiktok.com

# Block social media for internal clients
http_access deny internal_clients social_media

# Allow internal clients to approved sites
http_access allow internal_clients approved_sites

# Deny everything else
http_access deny all
```

## Verifying ACL Rules

```bash
# Test access from allowed IP
curl -x http://10.0.0.1:3128 http://httpbin.org/ip

# Test from a blocked client (should get access denied)
curl -x http://10.0.0.1:3128 http://httpbin.org/ip

# Check Squid cache log for ACL debug output after enabling debug_options ALL,1 33,2
sudo tail -f /var/log/squid/cache.log

# Parse access log to find denied requests
sudo awk '/TCP_DENIED/{print $3, $7, $8}' /var/log/squid/access.log | tail -20

# Validate configuration
sudo squid -k parse
```

## Conclusion

Squid `src` ACLs with CIDR notation provide straightforward IPv4-based access control for your proxy. Define named ACLs with `acl name src CIDR` and combine them with `http_access allow/deny` rules. Rules are evaluated top-to-bottom, so place more specific rules before general ones. Use file-based ACLs for large IP lists and reload with `squid -k reconfigure` after changes.
