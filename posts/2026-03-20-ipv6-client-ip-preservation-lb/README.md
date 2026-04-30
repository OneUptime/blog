# How to Handle IPv6 Client IP Preservation in Load Balancers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Load Balancer, Client IP, X-Forwarded-For, Proxy Protocol, Logging

Description: A guide to preserving and forwarding the real IPv6 client IP address through load balancers to backend servers for logging, security, and geo-based decisions.

When a load balancer accepts an IPv6 client connection and proxies it to a backend, the backend typically sees the load balancer's IP as the source - not the client's IPv6 address. Preserving the original client IPv6 address is critical for logging, rate limiting, geo-blocking, and security monitoring.

## Methods for IPv6 Client IP Preservation

| Method | Works With | Header |
|---|---|---|
| X-Forwarded-For | HTTP only | `X-Forwarded-For: 2001:db8::100` |
| X-Real-IP | HTTP only | `X-Real-IP: 2001:db8::100` |
| Proxy Protocol v2 | TCP/HTTP | Binary header (layer 3/4) |
| Direct Server Return | TCP | No forwarding needed |

## HAProxy: X-Forwarded-For for IPv6

```text
# /etc/haproxy/haproxy.cfg

frontend ipv6_frontend
    mode http
    bind [::]:443 ssl crt /etc/ssl/cert.pem

    # Add X-Forwarded-For header with real client IPv6
    option forwardfor

    default_backend web_backends

backend web_backends
    mode http
    # Set X-Real-IP from the client source address
    http-request set-header X-Real-IP %[src]
    server web1 ipv6@2001:db8::10:8080 check
```

The `X-Forwarded-For` header for an IPv6 client looks like:
```text
X-Forwarded-For: 2001:db8::100
```

## Proxy Protocol v2 for IPv6

Proxy Protocol v2 works at Layer 4, carrying the original source and destination addresses before the actual connection data:

```text
# HAProxy sender (front-end LB)

frontend ipv6_frontend
    mode http
    bind [::]:443 ssl crt /etc/ssl/cert.pem
    default_backend nginx_backends

backend nginx_backends
    mode http
    # Send Proxy Protocol to backends
    server nginx1 ipv6@2001:db8::20:8080 check send-proxy-v2
```

```nginx
# nginx receiver: accept Proxy Protocol
http {
    # Log shows real client IPv6 after realip processing
    log_format with_real_ip '$remote_addr - $request';

    server {
        listen [::]:8080 proxy_protocol;

        # Trust the load balancer that sends Proxy Protocol
        set_real_ip_from 2001:db8::1;
        real_ip_header proxy_protocol;

        access_log /var/log/nginx/access.log with_real_ip;
    }
}
```

## nginx: Preserve IPv6 with X-Forwarded-For

```nginx
http {
    # Trust the load balancer's IPv6 address range
    set_real_ip_from 2001:db8:1::/64;
    real_ip_header X-Forwarded-For;
    real_ip_recursive on;

    server {
        listen [::]:80;
        listen [::]:443 ssl;

        location / {
            proxy_pass http://backends;

            # Forward original client IPv6
            proxy_set_header X-Forwarded-For $http_x_forwarded_for;
            proxy_set_header X-Real-IP $remote_addr;

            # Optionally forward the resolved client IPv6 in a separate header
            proxy_set_header X-Original-IPv6 $remote_addr;
        }
    }
}
```

## Application: Reading IPv6 Client IP

### Python (Flask)

```python
from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

@app.route('/')
def index():
    # request.remote_addr now reflects the trusted client IP
    client_ip = request.remote_addr
    return f"Your IPv6: {client_ip}"
```

### Node.js

```javascript
app.set('trust proxy', 1);

app.get('/', (req, res) => {
  const clientIP = req.ip;  // Uses the client IP from X-Forwarded-For
  res.send(`Your IPv6: ${clientIP}`);
});
```

## AWS ALB: IPv6 in X-Forwarded-For

By default, AWS ALB adds the client IPv6 to X-Forwarded-For:

```bash
# Application receives:
# X-Forwarded-For: 2001:db8::100
# X-Forwarded-Proto: https

# If client port preservation is enabled:
# X-Forwarded-For: [2001:db8::100]:44321
```

## Cloudflare: Preserving IPv6 Through CDN

Cloudflare normally adds the original client IP in `CF-Connecting-IP`:

```nginx
# Trust Cloudflare and use CF-Connecting-IP
# List of Cloudflare IPv6 ranges: https://www.cloudflare.com/ips-v6
set_real_ip_from 2400:cb00::/32;
set_real_ip_from 2606:4700::/32;
# ... (add all Cloudflare IPv6 ranges)
real_ip_header CF-Connecting-IP;
```

If Cloudflare Pseudo IPv4 is set to `Overwrite Headers`, the real IPv6 is preserved in `CF-Connecting-IPv6` instead.

## Logging IPv6 Client IPs

```nginx
# nginx log format that captures the resolved real IPv6 client
log_format ipv6_aware '$remote_addr [$time_local] '
                      '"$request" $status $body_bytes_sent '
                      '"$http_referer" "$http_user_agent"';

access_log /var/log/nginx/access.log ipv6_aware;
```

IPv6 client IP preservation requires configuring both the load balancer to forward the original address and the backend to trust and read the forwarded address - ensuring accurate logging and security controls for IPv6 traffic.
