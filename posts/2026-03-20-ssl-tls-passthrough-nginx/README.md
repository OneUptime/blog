# How to Configure SSL/TLS Passthrough on Nginx Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, TLS Passthrough, SSL, Reverse Proxy, Stream Module

Description: Learn how to configure Nginx as a TCP/SSL passthrough proxy using the stream module, forwarding encrypted TLS traffic directly to backend servers without termination.

## What Is TLS Passthrough?

In TLS passthrough mode, the proxy forwards the encrypted TLS stream directly to backend servers without decrypting it. The backend server handles TLS termination. This is useful when:
- End-to-end encryption is required (backend must hold the private key)
- Compliance requires no intermediate decryption
- You can't install certificates on the proxy

The tradeoff: the proxy cannot inspect or modify HTTP headers (like adding X-Forwarded-For).

## Step 1: Enable the Stream Module

TLS passthrough requires Nginx's `stream` module (for TCP proxying), not the `http` module. SNI-based routing also requires the `ssl_preread` module:

```bash
# Verify stream module is available

nginx -V 2>&1 | tr ' ' '\n' | grep -E '^--with-stream(=dynamic)?$'

# Verify ssl_preread is available for SNI-based routing
nginx -V 2>&1 | tr ' ' '\n' | grep '^--with-stream_ssl_preread_module$'

# If not included, install a package that provides the stream module (Debian/Ubuntu)
sudo apt-get install -y libnginx-mod-stream
```

## Step 2: Configure Stream Passthrough in Nginx

Add the `stream` block to your Nginx configuration (typically in a separate file):

```nginx
# /etc/nginx/stream.conf (for simple passthrough)
# Or add to /etc/nginx/nginx.conf outside the http block

stream {
    # Simple passthrough to a backend server
    upstream ssl_backend {
        server 192.168.1.10:443;
    }

    server {
        listen 443;
        proxy_pass ssl_backend;
        proxy_timeout 300s;
        proxy_connect_timeout 5s;
    }
}
```

Include it in nginx.conf:

```nginx
# In /etc/nginx/nginx.conf (outside http block)
include /etc/nginx/stream.conf;
```

## Step 3: SNI-Based Routing for Multiple Backends

Use `ssl_preread` to route to different backends based on SNI without decrypting:

```nginx
stream {
    # Enable SSL preread to inspect SNI without decryption
    map $ssl_preread_server_name $backend {
        "api.example.com"      backend_api;
        "app.example.com"      backend_app;
        "db.example.com"       backend_db;
        default                backend_default;
    }

    upstream backend_api {
        server 192.168.1.10:443;
    }

    upstream backend_app {
        server 192.168.1.11:443;
    }

    upstream backend_db {
        server 192.168.1.12:443;
    }

    upstream backend_default {
        server 192.168.1.20:443;
    }

    server {
        listen 443;
        ssl_preread on;    # Read SNI without decrypting the TLS stream
        proxy_pass $backend;
        proxy_connect_timeout 5s;
        proxy_timeout 600s;
    }
}
```

## Step 4: Configure Mixed HTTP and HTTPS Routing

To handle both HTTP (L7 handling) and HTTPS (passthrough) on the same Nginx instance:

```nginx
# nginx.conf - Use both http and stream modules

# Stream block - TCP passthrough for port 443
stream {
    upstream ssl_backend {
        server 192.168.1.10:443;
    }

    server {
        listen 443;
        proxy_pass ssl_backend;
    }
}

# HTTP block - standard HTTP handling on port 80
http {
    upstream backend_http {
        server 192.168.1.30:80;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://backend_http;
        }
    }
}
```

## Step 5: Test Passthrough

```bash
# Verify SSL passthrough works - the certificate should come from the backend
openssl s_client -connect proxy.example.com:443 -servername api.example.com 2>&1 | \
  grep subject

# The subject should show the backend's certificate, NOT the proxy's certificate
# (since the proxy never decrypts the traffic)

# Test with curl
curl -v --resolve api.example.com:443:192.168.1.100 https://api.example.com/
```

## Step 6: Verify Nginx Configuration

```bash
sudo nginx -t
sudo systemctl reload nginx

# Check stream connections in logs
sudo tail -f /var/log/nginx/error.log
```

## Passthrough vs Termination Comparison

| Feature | TLS Passthrough | TLS Termination |
|---|---|---|
| Backend decrypts | Yes (backend handles TLS) | No (proxy handles TLS) |
| Add X-Forwarded-For | No | Yes |
| Inspect/modify headers | No | Yes |
| Certificate management | On each backend | On proxy only |
| End-to-end encryption | Yes | No (proxy can see plaintext) |
| L7 WAF/inspection | Limited | Full |

## Conclusion

Nginx TLS passthrough uses the `stream` module with `ssl_preread on` to route HTTPS traffic based on SNI without decrypting it. This maintains end-to-end encryption at the cost of losing L7 visibility. Use SNI-based routing to direct different hostnames to different backend servers. Passthrough is ideal for compliance requirements or when backends must hold their own private keys.
