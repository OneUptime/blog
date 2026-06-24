# How to Configure Cloudflare Workers IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloudflare, Worker, IPv6, Edge, Serverless, Dual-Stack, Fetch

Description: Build Cloudflare Workers that handle IPv6 client requests and make outbound IPv6 connections to origin servers.

## Introduction

Cloudflare Workers already run on Cloudflare's edge, so you do not enable IPv6 on a Worker by attaching it to a VPC or subnet. Instead, IPv6 behavior depends on the Worker endpoint you expose and the Cloudflare headers and runtime APIs you use. For custom domains, Cloudflare's IPv6 Compatibility setting controls whether proxied hostnames advertise AAAA records.

## Step 1: Enable IPv6 on the Platform

```bash
# For workers.dev routes, Cloudflare manages the public endpoint for you.
# For custom domains, confirm the hostname is proxied through Cloudflare
# and that IPv6 Compatibility is enabled on the zone.

# Check that the Worker hostname has an AAAA record
dig AAAA your-worker.example.com

# You do not configure IPv6 for Workers at a VPC or subnet layer
```

## Step 2: Handle IPv6 Client Addresses in Functions

```python
from workers import WorkerEntrypoint, Response

import ipaddress

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        # Prefer CF-Connecting-IPv6 when Pseudo IPv4 overwrites CF-Connecting-IP
        client_ip = (
            request.headers.get("cf-connecting-ipv6")
            or request.headers.get("cf-connecting-ip")
            or "unknown"
        )

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

        return Response(
            f"Client IP: {client_ip}, IPv6: {is_ipv6}",
            headers={"content-type": "text/plain"},
        )
```

## Step 3: Make Outbound IPv6 Requests

```python
from workers import WorkerEntrypoint, Response, fetch as worker_fetch

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        """Make HTTP request to an IPv6 endpoint from a Worker."""
        # Use brackets when targeting an IPv6 literal
        url = "http://[2001:db8::1]/api/health"

        try:
            response = await worker_fetch(url)
            return Response(
                await response.text(),
                headers={"content-type": "text/plain"},
            )
        except Exception as e:
            return Response(f"Error: {e}", status=502)
```

## Step 4: Test IPv6 Connectivity

```bash
# Test that your Worker endpoint accepts IPv6
curl -6 https://your-worker.example.com/

# Test with explicit IPv6 address
curl --resolve "your-worker.example.com:443:[2001:db8::1]" \
    https://your-worker.example.com/

# Check IPv6 DNS
dig AAAA your-worker.example.com
```

## Step 5: Environment Variable Configuration

```toml
# wrangler.toml
[vars]
BACKEND_URL = "http://[2001:db8::1]/api"
DATABASE_HOST = "2001:db8::10"
```

```python
from workers import WorkerEntrypoint, Response

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        backend_url = self.env.BACKEND_URL
        return Response(backend_url)
```

## Step 6: Monitoring and Logging

```python
import ipaddress
import logging

from workers import WorkerEntrypoint, Response

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Default(WorkerEntrypoint):
    async def fetch(self, request):
        client_ip = (
            request.headers.get("cf-connecting-ipv6")
            or request.headers.get("cf-connecting-ip")
            or "unknown"
        )

        try:
            addr = ipaddress.ip_address(client_ip)
            logger.info(
                "event=request client_ip=%s ip_version=%s is_private=%s",
                client_ip,
                addr.version,
                addr.is_private,
            )
        except ValueError:
            logger.warning("Invalid IP address: %s", client_ip)

        return Response("ok")
```

## Conclusion

Cloudflare Workers do not require IPv6 enablement at a VPC or subnet layer. Cloudflare's edge accepts IPv6 requests, and custom domains use the zone's IPv6 Compatibility setting. Read client IPs from `CF-Connecting-IP` or `CF-Connecting-IPv6`, use bindings via `self.env`, and use the Workers `fetch()` API for outbound HTTP requests. If you need to force an IPv6 destination, use a bracketed IPv6 literal or a hostname that only resolves to AAAA; for proxied DNS records with both IPv4 and IPv6 origin addresses, Cloudflare prefers IPv4.
