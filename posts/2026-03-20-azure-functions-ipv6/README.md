# How to Configure Azure Functions IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Function, IPv6, Serverless, VNet Integration, Dual-Stack

Description: Configure Azure Functions with VNet integration for IPv6 connectivity and dual-stack outbound networking.

## Introduction

Azure Functions inherits IPv6 behavior from Azure App Service. On supported hosting plans, inbound IPv6 is controlled by the function app's DNS behavior, while outbound IPv6 to public endpoints is currently a separate capability. Virtual Network integration is outbound-only, uses an IPv4 delegated subnet, and public outbound IPv6 doesn't work when application traffic is routed through the virtual network.

## Step 1: Enable IPv6 on the Platform

```bash
# Publish AAAA records for the default *.azurewebsites.net hostname
az resource update \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --resource-type "Microsoft.Web/sites" \
  --set properties.ipMode="IPv4AndIPv6"

# IPMode is a DNS setting. The app can still receive both IPv4 and IPv6 traffic.

# For IPv6-only DNS responses, use IPv6 instead.
az resource update \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --resource-type "Microsoft.Web/sites" \
  --set properties.ipMode="IPv6"

# Check that the function app hostname now has an AAAA record
dig AAAA <function-app-name>.azurewebsites.net
```

## Step 2: Handle IPv6 Client Addresses in Functions

```python
import ipaddress
import azure.functions as func

app = func.FunctionApp()

@app.route(route="client-ip", auth_level=func.AuthLevel.ANONYMOUS)
def client_ip(req: func.HttpRequest) -> func.HttpResponse:
    # App Service forwards the client chain in X-Forwarded-For.
    forwarded_for = req.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",")[0].strip() or "unknown"

    # Normalize IPv4-mapped IPv6
    try:
        addr = ipaddress.ip_address(client_ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            client_ip = str(addr.ipv4_mapped)
            is_ipv6 = False
        else:
            is_ipv6 = addr.version == 6
    except ValueError:
        is_ipv6 = False

    return func.HttpResponse(
        f"Client IP: {client_ip}, IPv6: {is_ipv6}",
        status_code=200,
    )
```

## Step 3: Make Outbound IPv6 Requests

```python
import urllib.request

def call_ipv6_endpoint():
    """Make HTTP request to an IPv6-capable public endpoint."""
    url = "https://your-ipv6-enabled-host.example.com/api/health"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode()
    except Exception as e:
        return f"Error: {e}"

# If you use an IPv6 literal, enclose it in brackets.
def call_ipv6_literal():
    url = "http://[2001:db8::1]/api/health"  # Replace with a reachable IPv6 address
    with urllib.request.urlopen(url, timeout=10) as response:
        return response.read().decode()

# Or with requests library (add requests to requirements.txt)
import requests

def call_ipv6_with_requests():
    response = requests.get("https://your-ipv6-enabled-host.example.com/api", timeout=10)
    return response.json()
```

## Step 4: Test IPv6 Connectivity

```bash
# Test that the function app accepts IPv6
curl -6 https://<function-app-name>.azurewebsites.net/

# Test a custom hostname against an explicit IPv6 address
# Replace 2001:db8::1 with the hostname's actual IPv6 address.
curl --resolve "your-function-url.example.com:443:[2001:db8::1]" \
  https://your-function-url.example.com/

# Check IPv6 DNS
dig AAAA <function-app-name>.azurewebsites.net
```

## Step 5: Environment Variable Configuration

```bash
# Linux function apps must opt in to outbound IPv6 preview.
# Windows function apps have outbound IPv6 enabled by default.
az functionapp config appsettings set \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --settings WEBSITE_NETWORK_LINUX_OUTBOUND_DISABLE_IPV6=false

# Set application settings for your own IPv6-capable backends
az functionapp config appsettings set \
  --resource-group <resource-group> \
  --name <function-app-name> \
  --settings BACKEND_URL="https://your-ipv6-enabled-host.example.com/api"
```

```python
import os

backend_url = os.environ.get("BACKEND_URL")
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

Azure Functions IPv6 is configured through Azure App Service rather than by enabling IPv6 on a delegated VNet integration subnet. For inbound traffic, use `IPMode` and confirm that DNS returns AAAA records. For outbound traffic, IPv6 to public endpoints is currently separate from VNet-routed traffic, so validate routing behavior before relying on dual-stack egress. Extract client IPs from forwarded headers, normalize IPv4-mapped addresses, and use bracket notation only when you call IPv6 literals directly. Monitor serverless function invocations from IPv6 clients with OneUptime to track adoption and error rates.
