# How to Handle IPv6 in Python Flask Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Flask, IPv6, Web Development, HTTP, REST API

Description: Configure Flask applications to handle IPv6 connections, extract client IPv6 addresses, and serve on IPv6 interfaces.

## Running Flask on IPv6

By default, Flask's development server listens on `127.0.0.1`. To enable IPv6:

```python
from flask import Flask

app = Flask(__name__)

@app.route("/")
def index():
    return "Hello from Flask over IPv6!"

if __name__ == "__main__":
    # Listen on all IPv6 interfaces
    app.run(
        host="::",         # :: binds to all IPv6 interfaces
        port=5000,
        debug=True
    )
```

Run with:
```bash
python app.py
# Access via: http://[::1]:5000  (localhost IPv6)

# Or: http://[your-server-ipv6]:5000  (replace with your global IPv6)
```

## Getting Client IPv6 Address

```python
from flask import Flask, request, jsonify
import ipaddress
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

def get_client_ip() -> str:
    """
    Get the client IP address, handling direct connections and
    IPv4-mapped IPv6 addresses (::ffff:x.x.x.x).

    If the app is behind a trusted proxy, ProxyFix makes
    request.remote_addr reflect X-Forwarded-For safely.
    """
    ip_str = request.remote_addr or ""

    # Normalize IPv4-mapped IPv6 addresses
    try:
        ip = ipaddress.ip_address(ip_str)
        if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
            return str(ip.ipv4_mapped)
        return str(ip)
    except ValueError:
        return ip_str  # Return as-is if parsing fails

@app.route("/api/whoami")
def whoami():
    client_ip = get_client_ip()
    return jsonify({
        "ip": client_ip,
        "version": ipaddress.ip_address(client_ip).version if client_ip else None
    })
```

## Rate Limiting with IPv6

Rate limiting by IPv6 address often uses /64 prefixes (one user may have many /128 addresses):

```python
from flask import Flask, jsonify, request
from flask_limiter import Limiter
import ipaddress

app = Flask(__name__)

def get_ipv6_rate_limit_key():
    """
    Use /64 prefix as rate limit key for IPv6 (privacy extensions
    mean one user can have many different /128 addresses).
    For IPv4, use the full address.
    If the app is behind a trusted proxy, configure ProxyFix first.
    """
    ip = request.remote_addr or ""
    try:
        addr = ipaddress.ip_address(ip)
        if isinstance(addr, ipaddress.IPv6Address) and addr.is_global:
            # Use /64 prefix as key for global IPv6
            net = ipaddress.IPv6Network(f"{addr}/64", strict=False)
            return str(net)
    except ValueError:
        pass
    return ip

limiter = Limiter(
    app=app,
    key_func=get_ipv6_rate_limit_key,
    default_limits=["100 per minute"]
)

@app.route("/api/data")
@limiter.limit("10 per second")
def get_data():
    return jsonify({"data": "value"})
```

## Validating IPv6 Input in Flask Routes

```python
from flask import Flask, request, jsonify
import ipaddress

app = Flask(__name__)

@app.route("/api/device/<address>")
def get_device(address: str):
    """
    Route that accepts an IPv6 address as a normal path string.
    Validate it explicitly before using it.
    """
    # Validate the IPv6 address
    try:
        addr = ipaddress.IPv6Address(address)
    except ValueError:
        return jsonify({"error": f"Invalid IPv6 address: {address}"}), 400

    return jsonify({
        "address": str(addr.compressed),
        "type": "link_local" if addr.is_link_local else "global" if addr.is_global else "other",
        "expanded": addr.exploded
    })

@app.route("/api/device", methods=["POST"])
def create_device():
    """Create a device with IPv6 address validation."""
    data = request.get_json()

    if not data or "ipv6" not in data:
        return jsonify({"error": "Missing ipv6 field"}), 400

    try:
        addr = ipaddress.IPv6Address(data["ipv6"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Process valid address
    return jsonify({
        "status": "created",
        "address": str(addr.compressed)
    }), 201
```

## Flask with Gunicorn for Production IPv6

For production, run Flask with Gunicorn bound to IPv6:

```bash
# Bind to all IPv6 interfaces
gunicorn -b "[::]:8000" app:app

# Bind to specific IPv6 address
gunicorn -b "[2001:db8::1]:8000" app:app

# Dual-stack: bind to both IPv4 and IPv6
gunicorn -b "0.0.0.0:8000" -b "[::]:8000" app:app
```

## Nginx Reverse Proxy for IPv6 Flask

Configure Nginx to proxy IPv6 requests to Flask:

```nginx
server {
    listen [::]:80;         # IPv6
    listen 80;              # IPv4
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## Conclusion

Flask's development server can listen on IPv6 by binding to `::`. Client IPv6 address extraction should normalize IPv4-mapped addresses, and apps behind a reverse proxy should use `ProxyFix` so `request.remote_addr` reflects trusted `X-Forwarded-For` values. For rate limiting, grouping global IPv6 addresses by /64 is a common strategy when privacy extensions are in use. For production deployments, Gunicorn with `[::]:port` binding and Nginx fronting provides a robust IPv6-capable web service stack.
