# How to Set Up HTTP/2 on Nginx with TLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, HTTP/2, TLS, HTTPS, Performance, Web Server

Description: Learn how to enable HTTP/2 on Nginx with TLS to take advantage of multiplexing and header compression for faster web applications.

## Why HTTP/2?

HTTP/2 introduces multiplexing (multiple requests over a single connection) and header compression (HPACK), reducing page load times compared to HTTP/1.1. Nginx supports HTTP/2, but for browser traffic you'll use it with TLS in practice because all major browsers only implement HTTP/2 over HTTPS.

## Prerequisites

- Nginx 1.9.5 or later (compiled with `ngx_http_v2_module`)
- OpenSSL 1.0.2 or later (for ALPN support with HTTP/2 over TLS)
- A valid TLS certificate (Let's Encrypt works well)

Verify your Nginx build includes HTTP/2 support:

```bash
nginx -V 2>&1 | grep http_v2
```

You should see `--with-http_v2_module` in the output.

## Enabling HTTP/2

Enable HTTP/2 for the TLS virtual host:

```nginx
# /etc/nginx/sites-available/example.com

server {
    # Enable HTTP/2 for this server block
    listen 443 ssl;
    http2 on;
    listen [::]:443 ssl;

    server_name example.com www.example.com;

    # TLS certificate paths (Let's Encrypt example)
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/html;
    index index.html;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}
```

Note: In Nginx 1.25.1+, `http2 on` is a standalone directive. In older versions, add `http2` to each TLS `listen` directive instead, for example `listen 443 ssl http2;` and `listen [::]:443 ssl http2;`.

## Recommended TLS Configuration for HTTP/2

For HTTP/2 over TLS, use TLS 1.2 or higher and avoid prohibited TLS 1.2 cipher suites. Apply these settings:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Use TLS 1.2 or 1.3 for HTTP/2 over TLS
    ssl_protocols TLSv1.2 TLSv1.3;

    # TLS 1.2 cipher suites compatible with HTTP/2
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Enable OCSP stapling for faster TLS handshakes
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 1.0.0.1 valid=300s;
    resolver_timeout 5s;
    ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;

    # Session resumption reduces handshake overhead
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    root /var/www/html;
}
```

## Verifying HTTP/2 Is Active

After reloading Nginx (`nginx -s reload`), verify with `curl`:

```bash
# --http2 requests HTTP/2; -I fetches headers only
curl -I --http2 https://example.com
```

Look for an `HTTP/2` status line such as `HTTP/2 200` in the output. Alternatively, use the browser DevTools Network tab-the Protocol column should show `h2`.

## Tuning HTTP/2 Parameters

```nginx
http {
    # Number of concurrent streams per connection (default: 128)
    http2_max_concurrent_streams 256;

    # Chunk size for HTTP/2 data frames (default: 8k)
    http2_chunk_size 16k;
}
```

## Conclusion

Enabling HTTP/2 on Nginx is as simple as enabling `http2` and ensuring a solid TLS configuration. Combined with OCSP stapling and session resumption, you'll see measurable improvements in Time to First Byte and overall page load performance.
