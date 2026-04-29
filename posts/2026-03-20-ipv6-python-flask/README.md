# How to Run Python Flask Apps on IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Flask, Web Development, Dual-Stack

Description: Configure Python Flask web applications to listen on IPv6, handle IPv6 client addresses, build dual-stack APIs, and deploy Flask behind an IPv6-capable reverse proxy.

## Run Flask on IPv6

Flask's built-in development server supports IPv6 natively.

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    client_ip = request.remote_addr or ""
    return jsonify({
        "message": "Hello from Flask over IPv6!",
        "client_ip": client_ip,
        "is_ipv6": ":" in client_ip,
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    # Listen on all IPv6 interfaces.
    # On some platforms, the same socket may also accept IPv4 connections.
    app.run(host="::", port=5000, debug=False)
    # For IPv6 loopback only:
    # app.run(host="::1", port=5000)
```

## Extract IPv6 Client Address

```python
from flask import Flask, request
import ipaddress
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
# Trust one reverse proxy that sets X-Forwarded-For.
# Adjust x_for if you have multiple trusted proxies.
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

def get_real_client_ip() -> str:
    """
    Get the client IP after trusted proxy headers are applied.
    Returns normalized IPv6 or IPv4 address string.
    """
    raw = request.remote_addr or ""

    # Handle IPv4-mapped IPv6 (::ffff:192.168.1.1)
    try:
        addr = ipaddress.ip_address(raw)
        if addr.version == 6 and addr.ipv4_mapped:
            return str(addr.ipv4_mapped)
        return str(addr)
    except ValueError:
        return raw

@app.route("/api/whoami")
def whoami():
    client_ip = get_real_client_ip()
    try:
        addr = ipaddress.ip_address(client_ip)
        ip_version = addr.version
        is_private = addr.is_private
    except ValueError:
        ip_version = None
        is_private = False

    return {
        "ip": client_ip,
        "version": ip_version,
        "is_private": is_private,
    }
```

## IPv6 Input Validation in Flask

```python
from flask import Flask, request, jsonify, abort, g
import ipaddress
from functools import wraps

app = Flask(__name__)

def validate_ipv6_param(param_name: str):
    """Decorator to validate an IPv6 address query parameter."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            raw = request.args.get(param_name)
            if not raw:
                abort(400, description=f"Missing parameter: {param_name}")
            try:
                addr = ipaddress.ip_address(raw)
                if addr.version != 6:
                    abort(400, description="Must be an IPv6 address")
                # Attach normalized address for the rest of this request
                g.validated_ipv6 = str(addr)
            except ValueError:
                abort(400, description=f"Invalid IPv6 address: {raw!r}")
            return f(*args, **kwargs)
        return wrapper
    return decorator

@app.route("/api/lookup")
@validate_ipv6_param("ip")
def lookup():
    addr = ipaddress.ip_address(g.validated_ipv6)
    return jsonify({
        "address": str(addr),
        "compressed": addr.compressed,
        "exploded": addr.exploded,
        "is_global": addr.is_global,
        "is_link_local": addr.is_link_local,
        "is_private": addr.is_private,
        "is_loopback": addr.is_loopback,
        "reverse_pointer": addr.reverse_pointer,
    })
```

## Deploy Flask with Gunicorn (IPv6)

```bash
# Install Gunicorn

pip install gunicorn

# Run on all IPv6 interfaces
gunicorn --bind "[::]:8000" --workers 4 "app:app"

# IPv6 loopback only
gunicorn --bind "[::1]:8000" --workers 4 "app:app"

# With TLS (HTTPS over IPv6)
gunicorn \
    --bind "[::]:443" \
    --workers 4 \
    --certfile /etc/ssl/certs/server.crt \
    --keyfile /etc/ssl/private/server.key \
    "app:app"
```

## Nginx Reverse Proxy for IPv6 Flask

```nginx
# /etc/nginx/sites-available/flask-ipv6

# Listen on both IPv4 and IPv6
server {
    listen 80;
    listen [::]:80;

    server_name example.com;

    location / {
        proxy_pass http://[::1]:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Preserve IPv6 address in X-Forwarded-For
        # nginx automatically handles this correctly
    }
}

# HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;

    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    location / {
        proxy_pass http://[::1]:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Rate Limiting by IPv6 /64

```python
from flask import Flask, request, jsonify
from collections import defaultdict
import ipaddress
import time

app = Flask(__name__)
rate_limit_store = defaultdict(list)
RATE_LIMIT = 60   # requests per minute
WINDOW = 60       # seconds

def get_ipv6_prefix64(client_ip: str) -> str:
    """Return a /64 aggregation key for global IPv6 addresses."""
    try:
        addr = ipaddress.ip_address(client_ip)
        if addr.version == 6 and not addr.is_private:
            # Get the /64 prefix used as the aggregation key
            net = ipaddress.ip_network(f"{addr}/64", strict=False)
            return str(net.network_address)
    except ValueError:
        pass
    return client_ip

@app.before_request
def check_rate_limit():
    client_key = get_ipv6_prefix64(request.remote_addr or "")
    now = time.time()
    requests_in_window = [t for t in rate_limit_store[client_key] if now - t < WINDOW]
    rate_limit_store[client_key] = requests_in_window
    if len(requests_in_window) >= RATE_LIMIT:
        return jsonify({"error": "Rate limit exceeded"}), 429
    rate_limit_store[client_key].append(now)
```

## Conclusion

Flask runs on IPv6 by passing `host="::"` to `app.run()`, which binds to all IPv6 interfaces. On some platforms, that IPv6 socket may also accept IPv4 connections via IPv4-mapped addresses, so explicit dual-stack behavior is platform-dependent. When Flask is behind a trusted reverse proxy, configure `ProxyFix` so `request.remote_addr` reflects the forwarded client address, then unwrap IPv4-mapped addresses (`::ffff:192.168.x.x`) to IPv4 when needed. In production, bind Gunicorn to an IPv6 address such as `--bind "[::]:8000"`; Gunicorn also supports multiple `--bind` options when you want separate IPv4 and IPv6 listeners. Configure Nginx with `listen [::]:80` plus current HTTP/2 syntax. When rate-limiting IPv6 clients, grouping by /64 is a common heuristic because end-host IPv6 subnets are normally /64 and privacy extensions can rotate interface identifiers within that prefix. Validate IPv6 address inputs with the `ipaddress` module and return normalized compressed-form addresses in API responses.
