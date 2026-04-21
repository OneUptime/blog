# How to Squid IPv6 Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Squid, IPv6, Reverse Proxy, HTTP Accelerator, Cache, Backend, Load Balancing

Description: Configure Squid as an IPv6 reverse proxy (HTTP accelerator) to cache and load balance requests to IPv6 backend servers.

## Introduction

Configure Squid as an IPv6 reverse proxy (HTTP accelerator) to cache and load balance requests to IPv6 backend servers. This guide covers the essential configuration, code patterns, and verification steps.

## Step 1: Prerequisites and Setup

```bash
# Ensure IPv6 is enabled and functional

ip -6 addr show
ping -6 -c 3 ::1

# Install Squid and test tools (Debian/Ubuntu)
sudo apt-get update
sudo apt-get install -y squid curl iproute2 iputils-ping
```

## Step 2: Core Implementation

```python
import ipaddress

def check_ipv6_subnet(client_ip: str, allowed_prefix: str) -> bool:
    """Check if an IPv6 address is within an allowed subnet."""
    try:
        addr = ipaddress.IPv6Address(client_ip)
        network = ipaddress.IPv6Network(allowed_prefix, strict=False)
        return addr in network
    except ValueError:
        return False

# Example usage
allowed_networks = [
    "2001:db8:100::/48",
    "::1/128",
    "fe80::/10",
]

def is_allowed(client_ip: str) -> bool:
    """Check if client IP is in any allowed network."""
    for network in allowed_networks:
        if check_ipv6_subnet(client_ip, network):
            return True
    return False

# Tests
print(is_allowed("2001:db8:100::1"))       # True
print(is_allowed("2001:db8:200::1"))       # False
print(is_allowed("::1"))                   # True
```

## Step 3: Configuration

```conf
# /etc/squid/squid.conf - Squid IPv6 reverse proxy
# Place accelerator rules before any forward-proxy http_access rules.

http_port [::]:8080 accel defaultsite=www.example.com

cache_peer backend1.example.net parent 8080 0 no-query originserver round-robin name=backend1
cache_peer backend2.example.net parent 8080 0 no-query originserver round-robin name=backend2

acl our_site dstdomain www.example.com
acl trusted_clients src 2001:db8:100::/48 ::1/128 fe80::/10

http_access allow our_site trusted_clients
http_access deny all

cache_peer_access backend1 allow our_site
cache_peer_access backend1 deny all
cache_peer_access backend2 allow our_site
cache_peer_access backend2 deny all
```

## Step 4: Apply and Verify

```bash
# Apply configuration
sudo squid -k parse
sudo squid -k reconfigure

# Verify functionality
python3 -c "
import ipaddress
addr = ipaddress.IPv6Address('2001:db8:100::1')
net = ipaddress.IPv6Network('2001:db8:100::/48')
print(f'{addr} in {net}: {addr in net}')
"

# Test connectivity
curl -6 -H 'Host: www.example.com' http://[::1]:8080/health
```

## Step 5: Monitoring

```python
import ipaddress
import logging

logger = logging.getLogger(__name__)

def log_ipv6_access(client_ip: str, allowed: bool):
    """Log IPv6 access attempts."""
    try:
        addr = ipaddress.IPv6Address(client_ip)
        logger.info({
            "client_ip": client_ip,
            "ip_version": 6,
            "allowed": allowed,
            "is_private": addr.is_private,
            "is_link_local": addr.is_link_local,
        })
    except ValueError:
        logger.warning(f"Invalid IPv6 address: {client_ip}")
```

## Conclusion

Squid IPv6 Reverse Proxy requires understanding IPv6 address structure, CIDR notation, and address classification. Use Python's `ipaddress` module for validation and subnet matching. Log all IPv6 access attempts for security auditing. Monitor your implementation with OneUptime to detect access pattern anomalies.
