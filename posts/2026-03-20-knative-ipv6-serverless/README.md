# How to Configure Knative IPv6 Serverless

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, IPv6, Kubernetes, Serverless, Eventing, Dual-Stack

Description: Configure Knative Serving and Eventing on an IPv6-enabled Kubernetes cluster for serverless workloads.

## Introduction

Knative Serving runs on Kubernetes, so IPv6 and dual-stack behavior depend on the cluster network, CNI, and the ingress layer used by Knative. In practice, you enable IPv6 on the Kubernetes platform first, make sure the Knative ingress Service can expose IPv6, and then validate IPv6 client and outbound connectivity from your application container.

## Step 1: Enable IPv6 on the Cluster and Ingress

```bash
# Knative depends on the Kubernetes cluster and the ingress Service
# used by your networking layer. Kourier is shown here.

# If you use Istio or another ingress, inspect and patch that Service instead.

# Inspect the public ingress Service
kubectl get svc kourier -n kourier-system -o yaml

# On a dual-stack cluster, tell the ingress Service to prefer dual-stack IPs
kubectl patch svc kourier -n kourier-system \
  --type merge \
  -p '{"spec":{"ipFamilyPolicy":"PreferDualStack"}}'

# For a LoadBalancer Service, your cloud provider must support dual-stack load balancers.

# Verify the Service reports ipFamilyPolicy, ipFamilies, and clusterIPs
kubectl get svc kourier -n kourier-system -o yaml
```

## Step 2: Handle IPv6 Client Addresses in Your Service

```python
# Python WSGI example for a Knative HTTP container
import ipaddress

def app(environ, start_response):
    # Prefer the forwarded client IP when the ingress provides it.
    raw_client_ip = (
        environ.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
        or environ.get("REMOTE_ADDR", "")
        or "unknown"
    )

    # Normalize IPv4-mapped IPv6
    try:
        addr = ipaddress.ip_address(raw_client_ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            client_ip = str(addr.ipv4_mapped)
            is_ipv6 = False
        else:
            client_ip = str(addr)
            is_ipv6 = addr.version == 6
    except ValueError:
        client_ip = raw_client_ip
        is_ipv6 = False

    body = f"Client IP: {client_ip}, IPv6: {is_ipv6}\n".encode()

    start_response("200 OK", [
        ("Content-Type", "text/plain"),
        ("Content-Length", str(len(body))),
    ])
    return [body]
```

## Step 3: Make Outbound IPv6 Requests

```python
import urllib.request

def call_ipv6_endpoint():
    """Make an HTTP request to an IPv6 endpoint from a Knative service."""
    # Use brackets when the URL contains a literal IPv6 address.
    url = "http://[2001:db8::10]/api/health"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.read().decode()
    except Exception as e:
        return f"Error: {e}"

# Or with requests library
import requests

def call_ipv6_with_requests():
    response = requests.get("http://[2001:db8::10]/api/health", timeout=10)
    response.raise_for_status()
    return response.text
```

## Step 4: Test IPv6 Connectivity

```bash
# Check the URL that Knative assigned to the Service
kubectl get ksvc your-service-name

# Replace the hostname below with your own Knative Service hostname.

# Check IPv6 DNS
dig AAAA your-service.example.com

# Test that your Knative endpoint accepts IPv6
curl -6 http://your-service.example.com/

# Test with an explicit IPv6 address
curl --resolve 'your-service.example.com:80:[2001:db8::1]' \
  http://your-service.example.com/
```

## Step 5: Environment Variable Configuration

```bash
# Set environment variables for IPv6 endpoints

BACKEND_URL="http://[2001:db8::10]/api"
DATABASE_HOST="2001:db8::20"
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

Knative IPv6 Serverless works best when the Kubernetes cluster, CNI, and Knative ingress layer all support IPv6 or dual-stack operation. Validate the Knative ingress Service, test the `ksvc` hostname over IPv6, and treat client addresses as normal HTTP request metadata inside your container. Use bracket notation for literal IPv6 URLs in outbound requests, and monitor IPv6 traffic with OneUptime to track adoption and error rates.
