# How to Squid IPv6 Forward Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv6, Forward Proxy, HTTP, HTTPS, Caching, ACL

Description: Configure Squid as an explicit forward proxy for IPv6 clients, with ACLs, caching, and SSL inspection.

## Introduction

Configure Squid as an explicit forward proxy for IPv6 clients, with ACLs, caching, and HTTPS CONNECT tunneling. This guide covers the essential configuration, code patterns, and verification steps.

## Step 1: Prerequisites and Setup

```bash
# Ensure IPv6 is enabled and functional

ip -6 addr show
ping -6 -c 3 ::1

# Install Squid and curl on Debian/Ubuntu
sudo apt-get update
sudo apt-get install -y squid curl
```

## Step 2: Core Implementation

```conf
# /etc/squid/squid.conf
http_port [::]:3128

# Replace this documentation prefix with your client IPv6 prefix.
acl ipv6_clients src 2001:db8:1234::/48
acl localhost src 127.0.0.1 ::1

acl SSL_ports port 443
acl Safe_ports port 80
acl Safe_ports port 443
acl CONNECT method CONNECT

http_access deny !Safe_ports
http_access deny CONNECT !SSL_ports
http_access allow localhost
http_access allow ipv6_clients
http_access deny all
```

## Step 3: Configuration

```conf
# Enable a small disk cache and write access logs.
cache_dir ufs /var/spool/squid 100 16 256
access_log stdio:/var/log/squid/access.log logformat=squid
```

## Step 4: Apply and Verify

```bash
# Check the Squid configuration
sudo squid -k parse

# Create cache directories the first time you enable cache_dir
sudo systemctl stop squid
sudo squid -z

# Apply configuration
sudo systemctl start squid

# Verify functionality
curl -x "http://[::1]:3128" http://example.com/

# Test HTTPS CONNECT tunneling through the proxy
curl -x "http://[::1]:3128" https://example.com/
```

## Step 5: Monitoring

```python
import ipaddress
import logging

logger = logging.getLogger(__name__)

def log_ipv6_access(client_ip: str, allowed: bool):
    """Log IPv6 access attempts."""
    try:
        addr = ipaddress.ip_address(client_ip)
        logger.info({
            "client_ip": client_ip,
            "ip_version": addr.version,
            "allowed": allowed,
            "is_private": addr.is_private,
        })
    except ValueError:
        logger.warning(f"Invalid IP: {client_ip}")
```

## Conclusion

Squid IPv6 Forward Proxy requires understanding IPv6 address structure, CIDR notation, and address classification. Use Python's `ipaddress` module for validation and subnet matching. Log all IPv6 access attempts for security auditing. Monitor your implementation with OneUptime to detect access pattern anomalies.
