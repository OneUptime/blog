# How to Configure GCP Cloud Functions IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Function, IPv6, Serverless, VPC Connector, Dual-Stack

Description: Configure GCP Cloud Functions to use IPv6 networking via VPC Connector for private IPv6 resource access.

## Introduction

Cloud Run functions (formerly Cloud Functions 2nd gen) can use Cloud Run networking features, but Serverless VPC Access connectors route IPv4 only. For private IPv6 resource access, configure the underlying Cloud Run service with Direct VPC egress on a dual-stack subnet, then validate client and outbound IPv6 behavior.

## Step 1: Enable IPv6 on the Cloud Run Networking Layer

```bash
# Serverless VPC Access connectors route IPv4 only on Cloud Run and Cloud Run functions.
# For IPv6 egress, use Direct VPC egress on the underlying Cloud Run service
# and place it on a dual-stack subnet.

gcloud compute networks create NETWORK \
  --subnet-mode=custom \
  --enable-ula-internal-ipv6

gcloud compute networks subnets create SUBNET \
  --network=NETWORK \
  --range=10.10.0.0/24 \
  --stack-type=IPV4_IPV6 \
  --ipv6-access-type=internal \
  --region=REGION

gcloud run services update FUNCTION_SERVICE \
  --region=REGION \
  --network=NETWORK \
  --subnet=SUBNET \
  --vpc-egress=private-ranges-only
```

## Step 2: Handle IPv6 Client Addresses in HTTP Functions

```python
import functions_framework
import ipaddress
from flask import jsonify

@functions_framework.http
def handler(request):
    # Cloud Run functions expose the original client IP through X-Forwarded-For.
    client_ip = (
        request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or request.remote_addr
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

    return jsonify({
        "clientIp": client_ip,
        "ipv6": is_ipv6,
    })
```

## Step 3: Make Outbound IPv6 Requests

```python
import urllib.request

def call_ipv6_endpoint():
    """Make an HTTP request to a private IPv6 endpoint from a Cloud Run function."""
    # URL with bracketed IPv6 address
    url = "http://[fd20:1234::10]/api/health"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode()
    except Exception as e:
        return f"Error: {e}"

# Or with requests library
import requests

def call_ipv6_with_requests():
    response = requests.get("http://[fd20:1234::10]/api", timeout=10)
    return response.json()
```

## Step 4: Test IPv6 Connectivity

```bash
# Verify the hostname in front of your function publishes an AAAA record
dig AAAA your-function-domain.example.com

# Then force an IPv6 connection to that hostname
curl -6 https://your-function-domain.example.com/

# When using --resolve with an IPv6 address, wrap the address in brackets
curl --resolve "your-function-domain.example.com:443:[2001:db8::1]" \
  https://your-function-domain.example.com/
```

## Step 5: Environment Variable Configuration

```bash
# Set environment variables for IPv6 endpoints
# for private dual-stack resources

export BACKEND_URL="http://[fd20:1234::10]/api"
export DATABASE_HOST="fd20:1234::20"
```

```python
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

For Cloud Run functions, IPv6 networking depends on the underlying Cloud Run service configuration. Serverless VPC Access connectors don't carry IPv6 traffic, so use Direct VPC egress with a dual-stack subnet when you need private IPv6 reachability. Extract client IPv6 addresses from `X-Forwarded-For`, normalize IPv4-mapped addresses, and use bracket notation for IPv6 URLs in outbound requests. Monitor serverless function invocations from IPv6 clients with OneUptime to track adoption and error rates.
