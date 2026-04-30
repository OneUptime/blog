# How to Configure X-Forwarded-For in HAProxy to Preserve Client IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, X-Forwarded-For, IPv4, HTTP Headers, Client IP, Proxy

Description: Configure HAProxy to correctly add and forward X-Forwarded-For headers so backend servers receive the real client IPv4 address in HTTP mode.

## Introduction

In HTTP mode, HAProxy can add `X-Forwarded-For` headers so backends know the real client IP. Without this, backends see only HAProxy's IP in the TCP connection, making IP-based logging and access control inaccurate.

## Enabling forwardfor Globally

```haproxy
# /etc/haproxy/haproxy.cfg

defaults
    mode    http
    option  forwardfor    # Automatically add X-Forwarded-For header

frontend http_in
    bind 203.0.113.10:80
    default_backend app_servers

backend app_servers
    server app1 192.168.1.10:8080 check
    server app2 192.168.1.11:8080 check
```

With `option forwardfor`, HAProxy adds:
```text
X-Forwarded-For: 203.0.113.50
```

If `X-Forwarded-For` already exists, HAProxy adds another `X-Forwarded-For` header with the current connection source IP. Backends should use the last occurrence unless you configure `if-none`:
```text
X-Forwarded-For: 203.0.113.50
X-Forwarded-For: 10.0.0.1
```

## Excluding Certain Source Addresses from XFF

```haproxy
frontend http_in
    bind 203.0.113.10:80
    mode    http
    option  forwardfor except 127.0.0.1   # Don't add XFF for requests arriving from localhost

    default_backend app_servers
```

## Replacing XFF to Prevent Spoofing

Clients can inject fake `X-Forwarded-For` headers. Replace the header completely:

```haproxy
frontend http_in
    bind 203.0.113.10:80

    # Delete any client-provided XFF header (prevent spoofing)
    http-request del-header X-Forwarded-For

    # Add a fresh XFF with the real connection IP
    http-request set-header X-Forwarded-For %[src]

    default_backend app_servers
```

## Trusted Proxy Chain Handling

When HAProxy is behind a CDN or upstream load balancer, trust only those source ranges and preserve their XFF header if present:

```haproxy
frontend http_in
    bind 203.0.113.10:80

    # Only trust XFF from our CDN IP range
    acl is_cdn src 103.21.244.0/22 103.22.200.0/22

    # Remove untrusted client-supplied XFF
    http-request del-header X-Forwarded-For if !is_cdn

    # Preserve trusted XFF if present; otherwise add one with the connection IP
    option forwardfor if-none

    default_backend app_servers
```

## Additional Forwarding Headers

Add complete proxy context headers:

```haproxy
frontend https_in
    bind 203.0.113.10:443 ssl crt /etc/haproxy/certs/bundle.pem

    option forwardfor

    # Standard forwarding headers
    http-request set-header X-Real-IP          %[src]
    http-request set-header X-Forwarded-Proto  https
    http-request set-header X-Forwarded-Port   443
    http-request set-header X-Forwarded-Host   %[req.hdr(Host)]

    default_backend app_servers
```

## Verifying XFF Headers Reach Backends

Create a simple debug endpoint on the backend:

```python
# Flask endpoint to echo request headers

from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/debug/headers')
def headers():
    return jsonify({
        'X-Forwarded-For': request.headers.get('X-Forwarded-For'),
        'X-Real-IP': request.headers.get('X-Real-IP'),
        'remote_addr': request.remote_addr
    })
```

```bash
# Test: should show real client IP in X-Forwarded-For
curl -s http://203.0.113.10/debug/headers | jq .
# {
#   "X-Forwarded-For": "203.0.113.50",
#   "X-Real-IP": "203.0.113.50",
#   "remote_addr": "192.168.1.1"   ← HAProxy's IP
# }
```

## Conclusion

HAProxy's `option forwardfor` is the simplest way to add `X-Forwarded-For` for HTTP traffic. At the edge, strip or overwrite untrusted client-supplied XFF headers to prevent IP spoofing. If HAProxy sits behind a trusted proxy or CDN, preserve only the XFF values from those trusted source ranges or use `option forwardfor if-none` in that trusted path. Combine with `X-Real-IP` and `X-Forwarded-Proto` so backends have complete proxy context for redirect URL construction and access control.
