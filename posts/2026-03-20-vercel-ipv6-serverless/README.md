# How to Configure Vercel Serverless IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vercel, IPv6, Serverless, Edge Function, Dual-Stack, Deployment

Description: Deploy Vercel applications that serve IPv6 clients and use IPv6 in serverless and edge function environments.

## Introduction

Vercel Serverless IPv6 enables serverless workloads to operate in IPv6 and dual-stack environments. The configuration varies by platform but involves enabling IPv6 on the underlying network, configuring function runtime environment, and validating IPv6 client connectivity.

## Step 1: Enable IPv6 on the Platform

```bash
# Platform-specific IPv6 enablement

# Most serverless platforms use the underlying cloud provider's network

# Check if the platform's public endpoint has IPv6
dig AAAA your-function-url.example.com

# For VPC-integrated functions, ensure VPC subnet has IPv6
# (refer to platform documentation)
```

## Step 2: Handle IPv6 Client Addresses in Functions

```python
# Python serverless handler example
import ipaddress

def handler(event, context):
    # Extract client IP (varies by platform)
    client_ip = (
        event.get("requestContext", {})
             .get("identity", {})
             .get("sourceIp")
        or event.get("headers", {}).get("X-Forwarded-For", "").split(",")[0].strip()
        or "unknown"
    )

    # Normalize IPv4-mapped IPv6
    try:
        addr = ipaddress.ip_address(client_ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            client_ip = str(addr.ipv4_mapped)
        is_ipv6 = isinstance(addr, ipaddress.IPv6Address) and not addr.ipv4_mapped
    except ValueError:
        is_ipv6 = False

    return {
        "statusCode": 200,
        "body": f"Client IP: {client_ip}, IPv6: {is_ipv6}"
    }
```

## Step 3: Make Outbound IPv6 Requests

```python
import urllib.request

def call_ipv6_endpoint():
    """Make HTTP request to an IPv6 endpoint from serverless."""
    # URL with bracketed IPv6 address
    url = "http://[2001:db8::1]/api/health"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode()
    except Exception as e:
        return f"Error: {e}"

# Or with requests library
import requests

def call_ipv6_with_requests():
    response = requests.get("http://[2001:db8::1]/api", timeout=10)
    return response.json()
```

## Step 4: Test IPv6 Connectivity

```bash
# Test that your serverless endpoint accepts IPv6
curl -6 https://your-function-url.example.com/

# Test with explicit IPv6 address
curl --resolve "your-function-url.example.com:443:2001:db8::1"     https://your-function-url.example.com/

# Check IPv6 DNS
dig AAAA your-function-url.example.com
```

## Step 5: Environment Variable Configuration

```bash
# Set environment variables for IPv6 endpoints
# (Platform-specific - shown as generic examples)

BACKEND_URL="http://[2001:db8::abcd]/api"
DATABASE_HOST="2001:db8::db"

# In your function code
import os
backend_url = os.environ.get("BACKEND_URL", "http://[::1]/api")
```

## Step 6: Monitoring and Logging

```python
import logging
import ipaddress

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def log_ipv6_metrics(client_ip: str):
    """Log IPv6 client metrics for observability."""
    try:
        addr = ipaddress.ip_address(client_ip)
        logger.info({
            "event": "request",
            "client_ip": client_ip,
            "ip_version": addr.version,
            "is_private": addr.is_private,
        })
    except ValueError:
        logger.warning(f"Invalid IP address: {client_ip}")
```

## Conclusion

Vercel Serverless IPv6 works best when the underlying network has IPv6 enabled at the VPC/subnet level. Extract client IPv6 addresses from platform-specific request contexts, normalize IPv4-mapped addresses, and use bracket notation for IPv6 URLs in outbound requests. Monitor serverless function invocations from IPv6 clients with OneUptime to track adoption and error rates.
