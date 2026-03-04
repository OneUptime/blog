# How to Set Up Nginx with HTTP/2 and TLS 1.3 on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Nginx, HTTP/2, TLS 1.3, Security, Linux

Description: Configure Nginx on RHEL 9 to use HTTP/2 and TLS 1.3 for maximum performance and security with modern protocol support.

---

HTTP/2 and TLS 1.3 represent the latest standards in web performance and security. HTTP/2 enables multiplexed streams over a single connection, while TLS 1.3 reduces the handshake to just one round trip. Nginx on RHEL 9 supports both. This guide shows you how to enable and optimize them.

## Prerequisites

- A RHEL 9 system with Nginx installed
- A valid SSL certificate (from Let's Encrypt or another CA)
- Root or sudo access

## Step 1: Verify OpenSSL Version

TLS 1.3 requires OpenSSL 1.1.1 or newer. RHEL 9 ships with OpenSSL 3.x:

```bash
# Check OpenSSL version
openssl version

# Check Nginx's compiled OpenSSL version
nginx -V 2>&1 | grep -o "OpenSSL [0-9.]*"
```

## Step 2: Enable HTTP/2 and TLS 1.3

```nginx
# /etc/nginx/conf.d/example.com.conf

server {
    # Enable HTTP/2 by adding 'http2' to the listen directive
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    server_name example.com www.example.com;
    root /var/www/html;

    # SSL certificate files
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Enable only TLS 1.2 and TLS 1.3
    ssl_protocols TLSv1.2 TLSv1.3;

    # Cipher suites for TLS 1.2 (TLS 1.3 ciphers are fixed by the protocol)
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;

    # Let the server choose the cipher order
    ssl_prefer_server_ciphers off;

    # ECDH curve for key exchange
    ssl_ecdh_curve X25519:prime256v1:secp384r1;

    location / {
        try_files $uri $uri/ =404;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Step 3: Optimize TLS Session Handling

```nginx
# /etc/nginx/conf.d/ssl-optimization.conf

# SSL session cache shared across all worker processes
ssl_session_cache shared:SSL:10m;

# Session timeout (clients can reuse sessions for 1 day)
ssl_session_timeout 1d;

# Disable session tickets (improves forward secrecy)
ssl_session_tickets off;

# OCSP stapling for faster certificate verification
ssl_stapling on;
ssl_stapling_verify on;

# DNS resolver for OCSP stapling
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS header (tell browsers to always use HTTPS)
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

## Step 4: HTTP/2 Specific Tuning

```nginx
# /etc/nginx/conf.d/http2-tuning.conf

# Maximum number of concurrent HTTP/2 streams per connection
http2_max_concurrent_streams 128;

# Maximum size of HTTP/2 request header
large_client_header_buffers 4 16k;
```

## Step 5: Enable Server Push (Optional)

HTTP/2 server push preloads resources before the browser requests them:

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    location / {
        root /var/www/html;

        # Push CSS and JS when the main page is requested
        http2_push /css/style.css;
        http2_push /js/app.js;
    }

    # Preload header approach (better browser compatibility)
    location = /index.html {
        root /var/www/html;
        add_header Link "</css/style.css>; rel=preload; as=style";
        add_header Link "</js/app.js>; rel=preload; as=script";
    }
}
```

## Step 6: Test and Verify

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test HTTP/2 support
curl -vso /dev/null --http2 https://example.com/ 2>&1 | grep "< HTTP/"
# Expected: < HTTP/2 200

# Test TLS version
openssl s_client -connect example.com:443 -tls1_3 < /dev/null 2>/dev/null | grep "Protocol"
# Expected: Protocol  : TLSv1.3

# Check ALPN protocol (should show h2)
openssl s_client -connect example.com:443 -alpn h2 < /dev/null 2>/dev/null | grep "ALPN"
```

## Step 7: Performance Comparison

You can measure the difference HTTP/2 makes:

```bash
# Install nghttp2 client for HTTP/2 testing
sudo dnf install -y nghttp2

# Measure page load with HTTP/2
nghttp -nvas https://example.com/

# Compare with HTTP/1.1
curl -w "time_total: %{time_total}\n" -o /dev/null -s --http1.1 https://example.com/
curl -w "time_total: %{time_total}\n" -o /dev/null -s --http2 https://example.com/
```

## Troubleshooting

```bash
# Verify HTTP/2 module is compiled into Nginx
nginx -V 2>&1 | grep http_v2

# Check if TLS 1.3 is supported by the system
openssl ciphers -v 'TLSv1.3' 2>/dev/null

# Check error log
sudo tail -f /var/log/nginx/error.log

# If HTTP/2 is not negotiated, verify the listen directive includes http2
grep -r "listen.*443" /etc/nginx/conf.d/
```

## Summary

With HTTP/2 and TLS 1.3 enabled on Nginx on RHEL 9, your server handles connections more efficiently through multiplexing, delivers content faster with header compression, and completes TLS handshakes in a single round trip. The configuration is straightforward since Nginx and RHEL 9 both ship with modern protocol support out of the box.
