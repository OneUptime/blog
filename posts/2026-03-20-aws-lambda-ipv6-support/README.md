# How to Configure AWS Lambda IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, Lambda, IPv6, Serverless, VPC, Dual-Stack, Function

Description: Configure AWS Lambda functions to access IPv6 resources within VPCs and invoke Lambda functions over IPv6 endpoints.

## Introduction

AWS Lambda IPv6 support covers two different paths: inbound IPv6 requests to Lambda function URLs, and outbound IPv6 connections from functions attached to dual-stack VPC subnets. To use outbound IPv6, Lambda must be connected to dual-stack subnets and configured to allow IPv6 traffic.

## Step 1: Enable IPv6 for Lambda

```bash
# Lambda function URLs are dual stack and support IPv4 and IPv6
dig AAAA <url-id>.lambda-url.<region>.on.aws

# To make outbound IPv6 connections from Lambda, attach the function to a VPC
# with dual-stack subnets and enable IPv6 in the function VPC configuration
aws lambda update-function-configuration \
  --function-name my-function \
  --vpc-config SubnetIds=subnet-0123456789abcdef0,subnet-0fedcba9876543210,SecurityGroupIds=sg-0123456789abcdef0,Ipv6AllowedForDualStack=true
```

## Step 2: Handle IPv6 Client Addresses in Functions

```python
# Python serverless handler example
import ipaddress

def handler(event, context):
    # Extract client IP from a Lambda function URL or API Gateway event
    headers = event.get("headers", {})
    client_ip = (
        event.get("requestContext", {})
             .get("http", {})
             .get("sourceIp")
        or event.get("requestContext", {})
             .get("identity", {})
             .get("sourceIp")
        or headers.get("x-forwarded-for", headers.get("X-Forwarded-For", "")).split(",")[0].strip()
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
    """Make HTTP request to an IPv6 endpoint from Lambda."""
    # Requires Lambda to be attached to dual-stack VPC subnets with IPv6 enabled
    # URL with bracketed IPv6 address
    url = "http://[2001:db8::1]/api/health"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode()
    except Exception as e:
        return f"Error: {e}"

# Or with requests if you package it with your function or a Lambda layer
import requests

def call_ipv6_with_requests():
    response = requests.get("http://[2001:db8::1]/api", timeout=10)
    return response.json()
```

## Step 4: Test IPv6 Connectivity

```bash
# Test that your Lambda function URL accepts IPv6
curl -6 https://<url-id>.lambda-url.<region>.on.aws/

# Test with explicit IPv6 address
curl --resolve "<url-id>.lambda-url.<region>.on.aws:443:[2001:db8::1]" \
  https://<url-id>.lambda-url.<region>.on.aws/

# Check IPv6 DNS
dig AAAA <url-id>.lambda-url.<region>.on.aws
```

## Step 5: Environment Variable Configuration

```bash
# Set environment variables for IPv6 endpoints

BACKEND_URL="http://[2001:db8::10]/api"
DATABASE_HOST="2001:db8::db"
```

```python
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

AWS Lambda IPv6 support has two parts: Lambda function URLs are dual stack for inbound requests, and outbound IPv6 requires a VPC-attached function with dual-stack subnets and IPv6 enabled in the function VPC configuration. Extract client IPv6 addresses from the Lambda event context, normalize IPv4-mapped addresses, and use bracket notation for IPv6 URLs in outbound requests. Monitor Lambda invocations from IPv6 clients with OneUptime to track adoption and error rates.
