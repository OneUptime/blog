# How to Configure TLS 1.3 on Nginx for Secure IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TLS, Nginx, SSL, HTTPS, Security, IPv4

Description: Learn how to configure TLS 1.3 on Nginx to enforce modern cipher suites, disable older TLS versions, and serve HTTPS traffic securely on IPv4.

## Why TLS 1.3?

TLS 1.3 offers significant improvements over TLS 1.2:
- **Faster handshake:** 1-RTT (vs 2-RTT for TLS 1.2) with optional 0-RTT resumption
- **Stronger security:** Only AEAD cipher suites are supported, with fewer legacy negotiation choices
- **Forward secrecy:** Certificate-based handshakes use ephemeral (EC)DHE key exchange; 0-RTT and PSK-only modes do not provide the same protection
- **Simpler:** Removes many legacy options that created vulnerabilities

Nginx 1.13.0+ built with the HTTP SSL module and OpenSSL 1.1.1+ supports TLS 1.3.

## Step 1: Verify Nginx and OpenSSL Support

```bash
# Check Nginx version and TLS support

nginx -V 2>&1 | grep -E "version|OpenSSL|http_ssl_module"

# Check OpenSSL version (must be 1.1.1+)
openssl version

# Verify TLS 1.3 ciphersuites are available
openssl ciphers -v -s -tls1_3
```

## Step 2: Configure TLS 1.3 in Nginx

Edit your Nginx SSL server block configuration:

```nginx
# /etc/nginx/conf.d/secure-site.conf

server {
    listen 443 ssl;
    server_name example.com www.example.com;

    # Certificate and private key
    ssl_certificate     /etc/ssl/certs/example.com.crt;
    ssl_certificate_key /etc/ssl/private/example.com.key;

    # Enable TLS 1.2 and TLS 1.3 (remove TLSv1.2 if you want TLS 1.3 only)
    # To support older clients, include both:
    ssl_protocols TLSv1.2 TLSv1.3;

    # ssl_ciphers applies to TLS 1.2 and older.
    # OpenSSL's default TLS 1.3 ciphersuites are used here.
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;

    # Let clients choose among the strong allowed suites
    ssl_prefer_server_ciphers off;

    # Enable session caching for performance
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;         # Avoid long-lived ticket-key resumption risk

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/chain.crt;

    # DNS resolver for OCSP
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    root /var/www/html;
    index index.html;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$server_name$request_uri;
}
```

## Step 3: Generate a Strong DH Parameters File

If you add DHE cipher suites for TLS 1.2 fallback, use 2048-bit or stronger DH parameters. The ECDHE-only cipher list above does not need this file:

```bash
# Generate DH parameters (takes a few minutes)
openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

Add to nginx config when DHE ciphers are enabled:

```nginx
ssl_dhparam /etc/nginx/dhparam.pem;
```

## Step 4: Test and Reload Nginx

```bash
# Test configuration syntax
sudo nginx -t

# Reload without dropping connections
sudo systemctl reload nginx
```

## Step 5: Verify TLS 1.3 Is Active

```bash
# Test TLS 1.3 handshake
openssl s_client -4 -connect example.com:443 -tls1_3 2>&1 | grep -E "Protocol|Cipher"

# Expected output:
# Protocol  : TLSv1.3
# Cipher    : TLS_AES_256_GCM_SHA384  (or another enabled TLS 1.3 suite)

# Test with curl
curl -4 -vI --tlsv1.3 https://example.com 2>&1 | grep -E "TLS|SSL"
```

## Step 6: Check SSL Rating

Run your site through SSL Labs to verify the configuration:

```bash
# Using sslyze for local testing
pip install --upgrade sslyze
python3 -m sslyze example.com:443

# Or use testssl.sh
./testssl.sh example.com
```

An A+ rating depends on the full SSL Labs scoring rules; in practice you need an A-grade configuration with HSTS, strong key exchange/ciphers, and no grade-capping vulnerabilities. TLS 1.3 is recommended, but TLS 1.2 can also score well when configured correctly.

## Conclusion

Configuring TLS 1.3 on Nginx requires Nginx 1.13+ built with the HTTP SSL module and OpenSSL 1.1.1+. Set `ssl_protocols TLSv1.2 TLSv1.3` for broad compatibility, disable TLS 1.0/1.1, configure strong TLS 1.2 ciphers for fallback, enable OCSP stapling, and add HSTS headers. Verify with `openssl s_client -tls1_3` and test your SSL rating with sslyze or testssl.sh.
