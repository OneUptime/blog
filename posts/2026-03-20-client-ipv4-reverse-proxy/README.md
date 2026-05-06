# How to Get the Client IPv4 Address Behind a Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, IPv4, Reverse Proxy, Nginx, X-Forwarded-For, REST API

Description: Learn how to extract the real client IPv4 address when your application server sits behind a reverse proxy, covering X-Forwarded-For, X-Real-IP, Forwarded headers, and proxy trust validation.

## The Problem

```text
Client (1.2.3.4) → Nginx (10.0.0.1) → App Server
```

Without configuration the app sees `10.0.0.1` (the proxy) as `REMOTE_ADDR`. To preserve the real client IP, the proxy forwards it in `X-Forwarded-For`.

## Nginx: Setting Headers Correctly

```nginx
# /etc/nginx/sites-available/myapp

upstream app {
    server 127.0.0.1:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://app;

        # Forward real client IP
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP       $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host            $host;
    }
}
```

`$proxy_add_x_forwarded_for` appends the client IP to any existing XFF chain. `$remote_addr` sets `X-Real-IP` to the direct connection address.

## Python / Flask: Reading the Headers

```python
from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
# x_for=1 / x_proto=1: trust one proxy hop for these headers
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

@app.route("/whoami")
def whoami():
    return {
        "ip":             request.remote_addr,       # real client after ProxyFix
        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
        "x_real_ip":       request.headers.get("X-Real-IP"),
    }
```

## Node.js / Express

```javascript
const express = require("express");
const app = express();

// trust proxy = 1: trust one reverse-proxy hop
app.set("trust proxy", 1);

app.get("/whoami", (req, res) => {
    res.json({
        ip:              req.ip,                              // real client
        xff:             req.headers["x-forwarded-for"],
        x_real_ip:       req.headers["x-real-ip"],
    });
});

app.listen(8080, "127.0.0.1");
```

## Multi-Hop Proxy Chains

```text
Client (1.2.3.4) → CDN (2.2.2.2) → LB (10.0.0.1) → App

X-Forwarded-For: 1.2.3.4, 2.2.2.2
```

The leftmost IP is the original client. Each proxy appends its view of the source.

```python
def extract_real_ip(xff: str | None, remote_addr: str, hops: int = 1) -> str:
    """
    Extract real client IP from XFF chain.
    hops = number of trusted proxy layers between client and app.
    """
    if not xff:
        return remote_addr
    parts = [p.strip() for p in xff.split(",")]
    # The client IP is `hops` positions from the right
    if len(parts) >= hops:
        return parts[-hops]
    return parts[0]
```

## RFC 7239 Forwarded Header

```nginx
# Simple single-hop RFC 7239 example
proxy_set_header Forwarded "for=$remote_addr;proto=$scheme;host=$host";
```

```python
# Parse a single RFC 7239 Forwarded element
def parse_forwarded_element(header: str) -> dict:
    result = {}
    for part in header.split(";"):
        k, _, v = part.strip().partition("=")
        if k:
            result[k.lower()] = v.strip('"')
    return result

fwd = parse_forwarded_element('for=1.2.3.4;proto=https;host=example.com')
print(fwd["for"])  # 1.2.3.4
```

## Conclusion

Always configure Nginx to forward `X-Forwarded-For` and `X-Real-IP`, and configure your application to trust exactly the right number of proxy hops - no more, no less. Trusting too many hops lets attackers spoof their IP by injecting fake XFF values. Libraries like `ProxyFix` (Python/werkzeug) and `trust proxy` (Express) implement the correct stripping logic. For new deployments, consider the RFC 7239 `Forwarded` header as a standardized alternative, but remember that its syntax and multi-hop parsing rules are stricter than `X-Forwarded-For`.
