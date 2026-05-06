# How to Get the Client IPv4 Address from REST API Requests in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Flask, FastAPI, IPv4, REST API, Networking

Description: Learn how to extract the real client IPv4 address from REST API requests in Python using Flask and FastAPI, handling reverse proxy X-Forwarded-For headers and direct connections correctly.

## Flask: Direct Connection

```python
from flask import Flask, request

app = Flask(__name__)

@app.route("/whoami")
def whoami():
    # request.remote_addr is correct when there is no reverse proxy
    return {"client_ip": request.remote_addr}
```

## Flask: Behind a Reverse Proxy (Nginx / AWS ALB)

```python
from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# Trust one proxy that sets X-Forwarded-For
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

@app.route("/whoami")
def whoami():
    # After ProxyFix, request.remote_addr reflects the real client IP
    return {"client_ip": request.remote_addr}
```

## Flask: Manual X-Forwarded-For Parsing

```python
from flask import Flask, request
import ipaddress

app = Flask(__name__)

# Replace these with the IPv4 ranges used by your reverse proxies
TRUSTED_PROXIES = [
    ipaddress.IPv4Network("10.0.0.0/8"),
    ipaddress.IPv4Network("172.16.0.0/12"),
    ipaddress.IPv4Network("192.168.0.0/16"),
    ipaddress.IPv4Network("127.0.0.0/8"),
]

def parse_ipv4(value):
    try:
        return ipaddress.IPv4Address(value)
    except (TypeError, ValueError):
        return None

def is_trusted_proxy(ip) -> bool:
    addr = parse_ipv4(ip)
    return addr is not None and any(addr in net for net in TRUSTED_PROXIES)

def get_real_ip():
    if not is_trusted_proxy(request.remote_addr):
        return request.remote_addr

    forwarded_for = []
    for header_value in request.headers.getlist("X-Forwarded-For"):
        for part in header_value.split(","):
            addr = parse_ipv4(part.strip())
            if addr is not None:
                forwarded_for.append(addr)

    # Walk right-to-left until we find the first address that is not one of our proxies
    for addr in reversed(forwarded_for):
        if not any(addr in net for net in TRUSTED_PROXIES):
            return str(addr)

    return request.remote_addr

@app.route("/whoami")
def whoami():
    return {"client_ip": get_real_ip()}
```

## FastAPI: Direct Connection

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/whoami")
async def whoami(request: Request):
    # request.client.host is the direct connection IP
    client_ip = request.client.host if request.client else None
    return {"client_ip": client_ip}
```

## FastAPI: Behind a Reverse Proxy

```python
from fastapi import FastAPI, Request

app = FastAPI()

@app.get("/whoami")
async def whoami(request: Request):
    # With Uvicorn configured to trust your proxy's forwarded headers,
    # request.client.host reflects the real client IP
    client_ip = request.client.host if request.client else None
    return {"client_ip": client_ip}
```

## Conclusion

Never read `X-Forwarded-For` without first verifying that the connecting peer is a trusted proxy - an attacker can spoof this header on direct connections. In Flask, use `werkzeug.middleware.proxy_fix.ProxyFix` with the correct `x_for` count for your proxy chain. In FastAPI, configure your ASGI server to trust only known proxy IPs before relying on `request.client.host`. Always document the expected number of proxy hops so the configuration remains correct as infrastructure changes.
