# How to Check Your Public IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Public IP, NAT, Network Diagnostics

Description: Your public IPv4 address is the address visible to the internet from behind your NAT router, and it can be discovered using web services, DNS queries, or command-line tools.

## Why Your Local IP Is Not Your Public IP

If your machine has `192.168.1.100`, that is your private RFC 1918 address. In a typical home NAT setup, your ISP-assigned public IPv4 is on your router's WAN interface. With carrier-grade NAT, the router WAN may instead have a private/shared address, and internet lookups will show the ISP-facing public IPv4. Any host on the internet sees that public IPv4, not your device's private IP.

## Method 1: curl with IP Discovery Services

```bash
# Force IPv4 so dual-stack hosts do not return IPv6
# Simple - returns just the IPv4 address

curl -4 -s https://api.ipify.org
curl -4 -s https://ifconfig.me
curl -4 -s https://icanhazip.com
curl -4 -s https://ipecho.net/plain

# JSON response with additional info
curl -4 -s https://ipinfo.io/json
curl -4 -s https://api.ipify.org?format=json
```

## Method 2: DNS-Based Lookup (No HTTP Required)

Some DNS resolvers have a special hostname that returns your public IPv4:

```bash
# Force IPv4 transport so dual-stack hosts do not return IPv6

# Using OpenDNS resolver - returns your public IPv4
dig -4 +short myip.opendns.com @208.67.222.222

# Google's TXT record approach (returns the IPv4 in quotes)
dig -4 +short o-o.myaddr.l.google.com @ns1.google.com TXT
```

## Method 3: Python Script

```python
import urllib.request
import json

def get_public_ip() -> str:
    """Retrieve public IP using ipify API."""
    url = "https://api.ipify.org?format=json"
    with urllib.request.urlopen(url, timeout=5) as response:
        data = json.loads(response.read().decode())
        return data["ip"]

def get_public_ip_info(ip: str) -> dict:
    """Retrieve geolocation info for a specific public IPv4 from ipinfo.io."""
    url = f"https://ipinfo.io/{ip}/json"
    with urllib.request.urlopen(url, timeout=5) as response:
        return json.loads(response.read().decode())

ip = get_public_ip()
print(f"Public IP: {ip}")

info = get_public_ip_info(ip)
print(f"City: {info.get('city')}, Country: {info.get('country')}")
print(f"ISP: {info.get('org')}")
```

## Method 4: Check the Router's WAN Interface

If the router or host directly holds the public IPv4, check the WAN-facing interface:

```bash
# If you have access to the router/gateway CLI
# Cisco IOS:
# show ip interface brief

# Linux router - check the WAN-facing interface (e.g., ppp0 for PPPoE, eth0 for direct)
ip addr show ppp0
ip addr show eth0  # Look for a globally routable IPv4 address

# Cloud instance: show interface addresses
ip addr show
# Note: on many cloud VMs, the public/elastic IPv4 is provider-mapped and does not appear here
```

## Monitoring Public IP Changes (DDNS Use Case)

```python
import time, urllib.request

def watch_ip_changes(interval_seconds: int = 60):
    """Monitor for public IP changes (useful for DDNS updates)."""
    last_ip = None
    while True:
        with urllib.request.urlopen("https://api.ipify.org", timeout=5) as r:
            current_ip = r.read().decode()
        if current_ip != last_ip:
            print(f"IP changed: {last_ip} -> {current_ip}")
            last_ip = current_ip
        time.sleep(interval_seconds)
```

## Key Takeaways

- Your private IP (192.168.x.x, etc.) is not your public internet IP.
- Use `curl -4 https://api.ipify.org` or `dig -4 +short myip.opendns.com @208.67.222.222` for quick lookups.
- DNS-based methods work without HTTP and are useful in restricted environments.
- Public IPs change on home connections; use DDNS if you need a stable hostname.
