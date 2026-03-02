# How to Set Up HAProxy with Let's Encrypt on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HAProxy, SSL, Let's Encrypt, Security

Description: Configure HAProxy with Let's Encrypt SSL certificates on Ubuntu, including automatic certificate renewal, certificate combination for HAProxy, and HTTPS redirects.

---

HAProxy requires SSL certificates in a specific format - a single PEM file that combines the certificate, certificate chain, and private key. Let's Encrypt generates separate files, so you need to combine them before HAProxy can use them. This guide covers obtaining Let's Encrypt certificates, combining them for HAProxy, and automating renewal.

## Prerequisites

```bash
# Install HAProxy
sudo apt update
sudo apt install haproxy

# Install Certbot
sudo apt install certbot

# Check that port 80 is accessible from the internet
# (required for Let's Encrypt HTTP-01 challenge)
# Your firewall should allow port 80 and 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Obtaining Let's Encrypt Certificates

When HAProxy is running on port 80, you need to stop it temporarily to get the initial certificate, or use HAProxy's own ACME challenge handling.

### Method 1: Standalone Mode (Temporary Downtime)

```bash
# Stop HAProxy temporarily
sudo systemctl stop haproxy

# Obtain certificate in standalone mode
sudo certbot certonly --standalone -d example.com -d www.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive

# Restart HAProxy
sudo systemctl start haproxy
```

### Method 2: Webroot Mode (No Downtime)

Configure HAProxy to serve the ACME challenge files before certificate issuance:

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

Add a location for the ACME challenge in your HAProxy frontend:

```
frontend http_front
    bind *:80

    # Serve Let's Encrypt validation requests before redirecting to HTTPS
    acl letsencrypt-acl path_beg /.well-known/acme-challenge/
    use_backend letsencrypt-backend if letsencrypt-acl

    # Redirect everything else to HTTPS
    redirect scheme https code 301 if !letsencrypt-acl

backend letsencrypt-backend
    server letsencrypt 127.0.0.1:8888
```

```bash
# Create the webroot directory
sudo mkdir -p /var/www/letsencrypt/.well-known/acme-challenge

# Run a simple HTTP server for the ACME challenge
# HAProxy will proxy /.well-known/acme-challenge/ to this
sudo python3 -m http.server 8888 --directory /var/www/letsencrypt &

# Now obtain the certificate using webroot
sudo certbot certonly \
  --webroot \
  -w /var/www/letsencrypt \
  -d example.com \
  -d www.example.com \
  --email admin@example.com \
  --agree-tos \
  --non-interactive
```

## Combining Certificates for HAProxy

HAProxy needs a single PEM file containing the certificate, chain, and private key in this order:

```bash
# Check where certbot stored the certificates
ls -la /etc/letsencrypt/live/example.com/

# Combine into a single PEM file
# The order matters: cert + chain + privkey
sudo bash -c 'cat /etc/letsencrypt/live/example.com/fullchain.pem \
  /etc/letsencrypt/live/example.com/privkey.pem \
  > /etc/haproxy/certs/example.com.pem'

# Set proper permissions (private key must be protected)
sudo chmod 600 /etc/haproxy/certs/example.com.pem
sudo chown root:root /etc/haproxy/certs/example.com.pem

# Create the certs directory if it does not exist
sudo mkdir -p /etc/haproxy/certs
```

## HAProxy SSL Configuration

Now configure HAProxy to use the combined certificate:

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

```
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

    # SSL/TLS global settings
    ssl-default-bind-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options prefer-client-ciphers no-sslv3 no-tlsv10 no-tlsv11 no-tls-tickets

    ssl-default-server-ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256
    ssl-default-server-options no-sslv3 no-tlsv10 no-tlsv11 no-tls-tickets

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

# Frontend for HTTP - only serves ACME challenge, redirects rest to HTTPS
frontend http_front
    bind *:80

    # Serve Let's Encrypt ACME challenge
    acl letsencrypt-acl path_beg /.well-known/acme-challenge/
    use_backend letsencrypt-backend if letsencrypt-acl

    # Redirect everything else to HTTPS
    http-request redirect scheme https code 301 if !letsencrypt-acl

# Frontend for HTTPS
frontend https_front
    bind *:443 ssl crt /etc/haproxy/certs/example.com.pem alpn h2,http/1.1

    # HSTS header
    http-response set-header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"

    # Forward client IP to backends
    http-request set-header X-Forwarded-Proto https
    http-request set-header X-Real-IP %[src]

    default_backend app_backend

# ACME challenge backend
backend letsencrypt-backend
    server letsencrypt 127.0.0.1:8888

# Application backend
backend app_backend
    balance roundrobin
    option httpchk
    http-check send meth GET uri /health
    server app1 10.0.0.10:3000 check
    server app2 10.0.0.11:3000 check
```

```bash
# Test configuration
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Start/reload HAProxy
sudo systemctl reload haproxy
```

## Multiple Domains

For multiple domains, you can store all certificates in a directory and HAProxy will load them all using SNI:

```bash
# Combine each domain's certificate
sudo bash -c 'cat /etc/letsencrypt/live/example.com/fullchain.pem \
  /etc/letsencrypt/live/example.com/privkey.pem \
  > /etc/haproxy/certs/example.com.pem'

sudo bash -c 'cat /etc/letsencrypt/live/api.example.com/fullchain.pem \
  /etc/letsencrypt/live/api.example.com/privkey.pem \
  > /etc/haproxy/certs/api.example.com.pem'

sudo chmod 600 /etc/haproxy/certs/*.pem
```

Reference the directory in HAProxy (HAProxy 2.0+):

```
frontend https_front
    # Load all PEM files from the directory
    # HAProxy selects the right cert based on SNI
    bind *:443 ssl crt /etc/haproxy/certs/ alpn h2,http/1.1
```

## Automating Certificate Renewal

Let's Encrypt certificates expire every 90 days. Automate renewal with a hook that combines and reloads after renewal:

```bash
# Create the renewal hook script
sudo nano /etc/letsencrypt/renewal-hooks/deploy/haproxy-reload.sh
```

```bash
#!/bin/bash
# HAProxy certificate renewal hook
# Runs automatically after certbot renews certificates

CERTS_DIR="/etc/haproxy/certs"
DOMAIN="example.com"
LE_LIVE="/etc/letsencrypt/live"

# Combine the renewed certificate files
cat "${LE_LIVE}/${DOMAIN}/fullchain.pem" \
    "${LE_LIVE}/${DOMAIN}/privkey.pem" \
    > "${CERTS_DIR}/${DOMAIN}.pem"

chmod 600 "${CERTS_DIR}/${DOMAIN}.pem"

# Reload HAProxy gracefully (no connection drops)
systemctl reload haproxy

echo "HAProxy certificate renewed and reloaded for ${DOMAIN}"
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/haproxy-reload.sh
```

Test the renewal process:

```bash
# Test that renewal would work (does not actually renew yet)
sudo certbot renew --dry-run

# Force renewal to test the full pipeline
sudo certbot renew --force-renewal

# Check the certificate expiry date
openssl x509 -in /etc/haproxy/certs/example.com.pem -noout -dates
```

## Certbot Renewal via Systemd Timer

Modern Ubuntu uses a systemd timer instead of a cron job:

```bash
# Check that the certbot timer is enabled
sudo systemctl status certbot.timer

# View when the next renewal check runs
sudo systemctl list-timers certbot.timer

# Manually trigger the renewal check
sudo systemctl start certbot.service
```

## Testing SSL Configuration

```bash
# Test HTTPS is working
curl -I https://example.com

# Check certificate details
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null \
  | openssl x509 -noout -text | grep -A2 "Validity"

# Test SSL grade with testssl.sh
sudo apt install testssl.sh
testssl https://example.com

# Verify HTTP redirects to HTTPS
curl -I http://example.com
# Should return 301 to https://

# Test HTTP/2 support
curl --http2 -I https://example.com | grep "HTTP/"
```

## Troubleshooting SSL Issues

Common issues and solutions:

```bash
# Certificate not found - check file permissions
ls -la /etc/haproxy/certs/
sudo cat /etc/haproxy/certs/example.com.pem | head -5
# Should start with: -----BEGIN CERTIFICATE-----

# HAProxy failing to start after certificate change
sudo haproxy -c -f /etc/haproxy/haproxy.cfg
# Check the exact error message

# Certificate chain issue
openssl verify -CAfile /etc/ssl/certs/ca-certificates.crt \
  /etc/letsencrypt/live/example.com/cert.pem

# Check certificate expiry
sudo certbot certificates
```

With this setup, your SSL certificates renew automatically, and HAProxy reloads with the new certificates without dropping active connections. The renewal process is completely hands-off once configured.
