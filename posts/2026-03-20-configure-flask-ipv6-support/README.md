# How to Configure Flask for IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flask, Python, IPv6, Web Framework, Dual-Stack, WSGI

Description: Configure Flask to listen on IPv6, handle IPv6 client addresses in requests, and deploy behind an IPv6-capable reverse proxy for production use.

## Introduction

Flask's built-in development server and production WSGI servers support IPv6. Enabling IPv6 means binding to `::` (all IPv6 interfaces) or a specific IPv6 address, and correctly handling client IP addresses when your app is behind a trusted reverse proxy.

## Step 1: Run Flask Dev Server on IPv6

```python
# app.py

from flask import Flask, request

app = Flask(__name__)

@app.route("/")
def index():
    client_ip = request.remote_addr
    return f"Client IP: {client_ip}\n"

if __name__ == "__main__":
    # Listen on all IPv6 interfaces
    app.run(host="::", port=5000, debug=True)
```

```bash
# Run the dev server
python app.py

# Test locally from IPv6 loopback
curl -g -6 "http://[::1]:5000/"

# Replace 2001:db8::1 with your server's IPv6 address
curl -g -6 "http://[2001:db8::1]:5000/"
```

## Step 2: Get Real Client IPv6 Address

```python
from flask import Flask, request
import ipaddress

app = Flask(__name__)

def get_client_ip() -> str:
    """Extract client IP after ProxyFix has trusted proxy headers."""
    client_ip = request.remote_addr or ""

    try:
        addr = ipaddress.ip_address(client_ip)
        return str(addr)
    except ValueError:
        return client_ip

@app.route("/info")
def info():
    ip = get_client_ip()
    try:
        addr = ipaddress.ip_address(ip)
        version = f"IPv{addr.version}"
        is_private = addr.is_private
    except ValueError:
        version = "unknown"
        is_private = False

    return {
        "client_ip": ip,
        "version": version,
        "is_private": is_private,
    }
```

## Step 3: IPv6 Rate Limiting by /64 Subnet

```python
from flask import Flask, request, abort
from collections import defaultdict
import ipaddress, time

app = Flask(__name__)
# This in-memory example is per-process; use shared storage in production.
rate_counters = defaultdict(list)

def get_rate_limit_key(ip: str) -> str:
    """Group IPv6 /64 subnets under one rate limit key."""
    try:
        addr = ipaddress.ip_address(ip)
        if addr.version == 6:
            network = ipaddress.IPv6Network(f"{ip}/64", strict=False)
            return str(network.network_address)
    except ValueError:
        pass
    return ip

@app.before_request
def rate_limit():
    ip = request.remote_addr or ""
    key = get_rate_limit_key(ip)
    now = time.time()
    window = 60  # 1 minute
    limit = 100  # requests per minute per /64

    # Clean old entries
    rate_counters[key] = [t for t in rate_counters[key] if now - t < window]
    rate_counters[key].append(now)

    if len(rate_counters[key]) > limit:
        abort(429)
```

## Step 4: Production with Gunicorn

```bash
# Install Gunicorn
pip install gunicorn

# Run on all IPv6 interfaces
gunicorn --bind "[::]:8000" --workers 4 app:app

# Run on specific IPv6 address
gunicorn --bind "[2001:db8::1]:8000" --workers 4 app:app

# Dual-stack (IPv4 and IPv6)
gunicorn --bind "0.0.0.0:8000" --bind "[::]:8000" --workers 4 app:app
```

## Step 5: NGINX Reverse Proxy Configuration

```nginx
upstream flask_app {
    server [::1]:8000;
}

server {
    listen [::]:80;
    listen 80;

    location / {
        proxy_pass http://flask_app;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }
}
```

## Step 6: Flask Config for Proxy Headers

```python
from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Trust 1 proxy level for the forwarded headers this proxy sets
app.wsgi_app = ProxyFix(
    app.wsgi_app,
    x_for=1,
    x_proto=1,
)
```

## Conclusion

Flask supports IPv6 by binding to `::` in the development server or passing `[::]:port` to Gunicorn. Use `ProxyFix` middleware when behind a reverse proxy so Flask can trust forwarded client IP headers. If you need both IPv4 and IPv6 in production, bind both families explicitly with Gunicorn or terminate traffic at an IPv6-capable reverse proxy. Rate-limit by /64 subnets to fairly handle IPv6 clients sharing a prefix. Monitor Flask endpoints with OneUptime's HTTP checks on IPv6 addresses.
