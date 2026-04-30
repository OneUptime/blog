# How to Handle IPv6 Client Addresses in Serverless Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Serverless, Client Address, Lambda, Function, Rate Limiting

Description: Handle IPv6 client addresses consistently across serverless platforms (AWS Lambda, Azure Functions, GCP Cloud Functions) with common patterns for extraction, validation, and rate limiting.

## Introduction

Serverless functions often receive client IP addresses through trusted proxy headers, but some platforms also expose them in request context fields. Header names and formats vary between platforms, and IPv6 requires special handling for bracket notation, IP:port formatting, IPv4-mapped representation, and a /64-based rate limiting heuristic. This post provides platform-agnostic patterns.

## Universal IPv6 Client IP Extractor

```python
def _parse_proxy_ip(value: str) -> str:
    """
    Parse a single IP from Forwarded/X-Forwarded-For style values.
    Handles IPv4:port and [IPv6]:port forms.
    """
    import ipaddress

    candidate = value.split(",")[0].strip()

    # RFC 7239 Forwarded header: for="[2001:db8::1]:443"
    if ";" in candidate or candidate.lower().startswith("for="):
        for part in candidate.split(";"):
            part = part.strip()
            if part.lower().startswith("for="):
                candidate = part.split("=", 1)[1].strip().strip('"')
                break

    if candidate.startswith("["):
        closing = candidate.find("]")
        if closing != -1:
            candidate = candidate[1:closing]
    elif candidate.count(":") == 1:
        host, port = candidate.rsplit(":", 1)
        if port.isdigit():
            candidate = host

    candidate = candidate.strip("[]")

    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return candidate

def extract_client_ip(headers: dict, source_ip: str = "") -> str:
    """
    Extract a client IP from a trusted platform field or trusted proxy headers.
    Prefer passing a platform-provided source_ip when one exists.
    """
    if source_ip:
        return _parse_proxy_ip(source_ip)

    # Only trust proxy headers if your ingress strips or overwrites
    # client-supplied forwarding headers.
    candidate_headers = [
        "cf-connecting-ip",    # Cloudflare
        "true-client-ip",      # Cloudflare Enterprise
        "fastly-client-ip",    # Fastly CDN
        "forwarded",           # RFC 7239
        "x-forwarded-for",     # Most common
        "x-real-ip",           # Nginx proxy
    ]

    headers_lower = {k.lower(): v for k, v in headers.items()}

    for header in candidate_headers:
        value = headers_lower.get(header, "")
        if value:
            return _parse_proxy_ip(value)

    return "unknown"

def normalize_ipv6(ip: str) -> str:
    """
    Normalize IPv6 representation.
    Converts IPv4-mapped ::ffff:x.x.x.x to plain IPv4.
    """
    import ipaddress
    try:
        addr = ipaddress.ip_address(ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(addr)  # Returns compressed IPv6 form
    except ValueError:
        return ip
```

## AWS Lambda Handler

```python
# AWS Lambda with IPv6 client detection

import json
from typing import Any

def lambda_handler(event: dict, context: Any) -> dict:
    request_context = event.get("requestContext", {}) or {}
    http_context = request_context.get("http", {}) or {}
    identity = request_context.get("identity", {}) or {}

    headers = event.get("headers", {}) or {}
    source_ip = http_context.get("sourceIp") or identity.get("sourceIp", "")
    client_ip = normalize_ipv6(extract_client_ip(headers, source_ip))

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps({
            "clientIp": client_ip,
            "isIPv6": ":" in client_ip,
        }),
    }
```

## Azure Functions Handler

```python
# Azure Functions with IPv6
import azure.functions as func
import json

def main(req: func.HttpRequest) -> func.HttpResponse:
    headers = dict(req.headers)
    client_ip = extract_client_ip(headers)
    client_ip = normalize_ipv6(client_ip)

    return func.HttpResponse(
        json.dumps({"clientIp": client_ip, "isIPv6": ":" in client_ip}),
        status_code=200,
        mimetype="application/json",
    )
```

## GCP Cloud Functions Handler

```python
# GCP Cloud Functions with IPv6
from flask import Request, jsonify

def handle_request(request: Request):
    headers = dict(request.headers)
    client_ip = extract_client_ip(headers)
    client_ip = normalize_ipv6(client_ip)

    return jsonify({
        "clientIp": client_ip,
        "isIPv6": ":" in client_ip,
    })
```

## IPv6 Rate Limiting (Common Pattern)

```python
import time
from collections import defaultdict
import ipaddress

# In-memory store (use Redis for distributed functions)
rate_store: dict = defaultdict(lambda: {"count": 0, "reset": 0})

def get_rate_key(ip: str) -> str:
    """
    Get rate limiting key. Uses a /64 prefix heuristic for IPv6.
    """
    try:
        addr = ipaddress.ip_address(normalize_ipv6(ip))
        if isinstance(addr, ipaddress.IPv6Address):
            network = ipaddress.ip_network(f"{addr}/64", strict=False)
            return f"{network.network_address}/64"
        return str(addr)
    except ValueError:
        pass
    return ip

def is_rate_limited(ip: str, limit: int = 100, window: int = 60) -> bool:
    """Check if IP is rate limited. Returns True if over limit."""
    key = get_rate_key(ip)
    now = time.time()
    entry = rate_store[key]

    if now > entry["reset"]:
        entry["count"] = 0
        entry["reset"] = now + window

    entry["count"] += 1
    return entry["count"] > limit
```

## Logging IPv6 Addresses Safely

```python
import ipaddress

def anonymize_ipv6(ip: str) -> str:
    """
    Anonymize IPv6 for GDPR-compliant logging.
    Masks the interface identifier (last 64 bits).
    """
    try:
        addr = ipaddress.ip_address(normalize_ipv6(ip))
        if isinstance(addr, ipaddress.IPv6Address):
            network = ipaddress.ip_network(f"{addr}/64", strict=False)
            return f"{network.network_address}/64"
        return str(addr)
    except ValueError:
        return ip  # Return as-is if not valid IPv6
```

## Conclusion

Consistent IPv6 client address handling in serverless functions requires using platform-provided source IP fields when available, falling back to trusted proxy headers, normalizing IPv4-mapped addresses, and applying a /64-based rate limiting heuristic for IPv6. The patterns in this post work across AWS Lambda, Azure Functions, and GCP Cloud Functions when those fields or headers come from trusted infrastructure. Store rate limit counters in Redis for distributed serverless deployments. Monitor function behavior with OneUptime using synthetic probes from IPv6 networks.
