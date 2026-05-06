# How to Configure FastAPI for IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FastAPI, Python, IPv6, Uvicorn, ASGI, Dual-Stack, Pydantic

Description: Configure FastAPI with Uvicorn to listen on IPv6, extract client IPv6 addresses from requests, validate IPv6 inputs with Pydantic, and deploy behind an IPv6 proxy.

## Introduction

FastAPI uses Uvicorn (ASGI server) which has native IPv6 support. Binding to `::` makes Uvicorn listen on IPv6; whether that also accepts IPv4 connections depends on the platform and socket configuration. FastAPI's Pydantic integration makes validating IPv6 address inputs straightforward.

## Step 1: Run FastAPI on IPv6

```python
# main.py

import uvicorn
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/")
async def root(request: Request):
    return {"client": request.client.host if request.client else None}

if __name__ == "__main__":
    # Listen on all IPv6 interfaces
    uvicorn.run("main:app", host="::", port=8000, reload=True)
```

```bash
# Start directly
uvicorn main:app --host "::" --port 8000

# Same bind, without access logging
uvicorn main:app --host "::" --port 8000 --no-access-log

# Test
curl -6 http://[::1]:8000/
```

## Step 2: Extract Client IPv6 Address

```python
# middleware/client_ip.py
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
import ipaddress

class ClientIPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # If you're behind a trusted proxy, start Uvicorn with
        # --forwarded-allow-ips so request.client reflects the forwarded client IP.
        ip = request.client.host if request.client else "unknown"

        # Attach to request state
        request.state.client_ip = ip
        request.state.is_ipv6 = False
        try:
            addr = ipaddress.ip_address(ip)
            if isinstance(addr, ipaddress.IPv6Address) and addr.ipv4_mapped:
                addr = addr.ipv4_mapped
            request.state.client_ip = str(addr)
            request.state.is_ipv6 = (addr.version == 6)
        except ValueError:
            pass

        return await call_next(request)

app = FastAPI()
app.add_middleware(ClientIPMiddleware)
```

## Step 3: IPv6 Input Validation with Pydantic

```python
# schemas.py
from ipaddress import IPv6Address
from pydantic import BaseModel, field_validator

class NetworkEndpoint(BaseModel):
    address: IPv6Address
    port: int

    @field_validator("address")
    @classmethod
    def validate_ipv6(cls, v: IPv6Address) -> IPv6Address:
        if v.is_loopback:
            raise ValueError("Loopback addresses not allowed")
        return v

    def url(self) -> str:
        """Return properly formatted URL for IPv6."""
        return f"http://[{self.address.compressed}]:{self.port}"
```

```python
# routes/network.py
from fastapi import APIRouter
from schemas import NetworkEndpoint

router = APIRouter()

@router.post("/endpoint")
async def create_endpoint(endpoint: NetworkEndpoint):
    return {
        "address": str(endpoint.address),
        "port": endpoint.port,
        "url": endpoint.url(),
    }
```

## Step 4: Rate Limiting by IPv6 /64 Subnet

```python
# middleware/rate_limit.py
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
import ipaddress

app = FastAPI()

def get_ipv6_subnet_key(request: Request) -> str:
    """Use /64 subnet as rate limit key for IPv6."""
    ip = request.state.client_ip if hasattr(request.state, "client_ip") \
        else get_remote_address(request)
    try:
        addr = ipaddress.ip_address(ip)
        if isinstance(addr, ipaddress.IPv6Address):
            net = ipaddress.IPv6Network(f"{addr}/64", strict=False)
            return str(net.network_address)
    except ValueError:
        pass
    return ip

limiter = Limiter(key_func=get_ipv6_subnet_key, default_limits=["100/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
```

## Step 5: Production Deployment

```bash
# Install the maintained Gunicorn worker
python -m pip install uvicorn-worker

# Gunicorn with Uvicorn workers (production)
gunicorn main:app \
    --worker-class uvicorn_worker.UvicornWorker \
    --bind "[::]:8000" \
    --workers 4

# If your platform keeps IPv4 and IPv6 separate, add an IPv4 bind too
gunicorn main:app \
    --worker-class uvicorn_worker.UvicornWorker \
    --bind "0.0.0.0:8000" \
    --bind "[::]:8000" \
    --workers 4
```

## Conclusion

FastAPI on IPv6 starts by passing `host="::"` to Uvicorn. When running behind a proxy, configure Uvicorn to trust forwarded headers from the proxy so `request.client` reflects the real client address. Pydantic can validate `IPv6Address` inputs directly. Rate-limit by /64 subnets to handle the large address space IPv6 clients may use. Monitor FastAPI with OneUptime's API checks targeting IPv6 endpoints.
