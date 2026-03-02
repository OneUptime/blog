# How to Configure SSL/TLS Certificates for Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, SSL/TLS, Security

Description: Learn how to configure SSL/TLS certificates for Nginx on Ubuntu, including certificate installation, HTTPS server blocks, and security-hardened TLS settings.

---

Running a website over HTTP sends data in plain text. Anyone between your server and the visitor - their ISP, a coffee shop router, or a network attacker - can read or modify the traffic. SSL/TLS encrypts the connection and verifies your server's identity. This guide covers setting up SSL/TLS in Nginx on Ubuntu, from obtaining a certificate through Let's Encrypt to hardening the TLS configuration.

## Prerequisites

- Nginx installed and running
- A domain name pointing to your server
- Ports 80 and 443 open in your firewall

```bash
# Verify Nginx is running
sudo systemctl status nginx

# Check firewall rules
sudo ufw status
sudo ufw allow 'Nginx Full'  # Opens both 80 and 443
```

## Obtaining a Certificate with Certbot (Let's Encrypt)

Let's Encrypt provides free, trusted certificates. Certbot automates the process:

```bash
# Install Certbot and the Nginx plugin
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain a certificate and configure Nginx automatically
# Replace yourdomain.com with your actual domain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will:
# 1. Verify you control the domain (via HTTP challenge)
# 2. Obtain the certificate
# 3. Modify your Nginx config to use SSL
# 4. Set up automatic renewal
```

After running Certbot, your certificate files will be in:
- Certificate: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- Private key: `/etc/letsencrypt/live/yourdomain.com/privkey.pem`

## Manual Nginx SSL Configuration

Whether you used Certbot or have a certificate from another source, understanding the Nginx SSL config is important. Here is a well-structured HTTPS server block:

```nginx
# /etc/nginx/sites-available/yourdomain.com

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

# HTTPS server block
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    # Certificate and key locations
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Recommended security settings (see below for the full config file)
    include /etc/nginx/snippets/ssl-params.conf;

    # Your site's root and configuration
    root /var/www/yourdomain.com/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

## Creating a Shared SSL Parameters Snippet

Reusable TLS settings as a shared snippet:

```bash
sudo nano /etc/nginx/snippets/ssl-params.conf
```

```nginx
# TLS version: only allow TLS 1.2 and 1.3 (1.0 and 1.1 are deprecated)
ssl_protocols TLSv1.2 TLSv1.3;

# Prefer server cipher order
ssl_prefer_server_ciphers on;

# Strong cipher suites
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256;

# Session settings
ssl_session_timeout 1d;
ssl_session_cache shared:MozSSL:10m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# HSTS: tell browsers to always use HTTPS (31536000 seconds = 1 year)
# Add 'includeSubDomains' and 'preload' once you're sure everything works
add_header Strict-Transport-Security "max-age=31536000" always;

# Additional security headers
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header Referrer-Policy "strict-origin-when-cross-origin";

# Diffie-Hellman parameter for DHE ciphers
# Generate with: openssl dhparam -out /etc/nginx/dhparam.pem 2048
ssl_dhparam /etc/nginx/dhparam.pem;
```

Generate the DH parameter file:

```bash
# This takes a few minutes - run it in the background
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

## Configuring SSL for Multiple Domains

If you host multiple sites, each gets its own certificate:

```bash
# Obtain a certificate for each domain
sudo certbot --nginx -d site1.com -d www.site1.com
sudo certbot --nginx -d site2.com -d www.site2.com

# Or a wildcard certificate (requires DNS challenge)
sudo certbot certonly --manual --preferred-challenges dns -d "*.yourdomain.com"
```

Each server block references its own certificate:

```nginx
server {
    listen 443 ssl;
    server_name site1.com www.site1.com;
    ssl_certificate     /etc/letsencrypt/live/site1.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/site1.com/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;
    # ...
}

server {
    listen 443 ssl;
    server_name site2.com www.site2.com;
    ssl_certificate     /etc/letsencrypt/live/site2.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/site2.com/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;
    # ...
}
```

## Using a Commercial Certificate

If you have a certificate from a commercial CA (DigiCert, Comodo, etc.):

```bash
# Place your certificate files in a secure location
sudo mkdir -p /etc/nginx/ssl
sudo chmod 700 /etc/nginx/ssl

# Copy your certificate files
sudo cp yourdomain.crt /etc/nginx/ssl/
sudo cp yourdomain.key /etc/nginx/ssl/
sudo cp intermediate-ca.crt /etc/nginx/ssl/

# If you received separate certificate and intermediate CA files,
# combine them into a fullchain file
sudo cat yourdomain.crt intermediate-ca.crt | sudo tee /etc/nginx/ssl/fullchain.crt

# Set secure permissions
sudo chmod 600 /etc/nginx/ssl/yourdomain.key
sudo chmod 644 /etc/nginx/ssl/fullchain.crt
```

Reference in your Nginx config:

```nginx
ssl_certificate     /etc/nginx/ssl/fullchain.crt;
ssl_certificate_key /etc/nginx/ssl/yourdomain.key;
```

## Testing and Applying the Configuration

```bash
# Test the Nginx configuration for syntax errors
sudo nginx -t

# If the test passes, reload Nginx (no downtime)
sudo systemctl reload nginx

# Verify HTTPS is working
curl -I https://yourdomain.com

# Check which TLS version and cipher is being used
openssl s_client -connect yourdomain.com:443 -brief
```

## Testing SSL Configuration Quality

```bash
# Check TLS certificate and chain
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Verify the certificate details
openssl s_client -connect yourdomain.com:443 </dev/null | openssl x509 -noout -dates -subject -issuer

# Test specific TLS protocols
# TLS 1.2 should work:
openssl s_client -tls1_2 -connect yourdomain.com:443

# TLS 1.0 should fail (if you've disabled it):
openssl s_client -tls1 -connect yourdomain.com:443
```

For a comprehensive external test, use SSL Labs: `https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com`

## Enabling HTTP/2

HTTP/2 provides significant performance improvements over HTTP/1.1 and requires TLS. Add it to your listen directives:

```nginx
server {
    # Enable HTTP/2
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    # ... rest of config
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Monitoring Certificate Expiry

Let's Encrypt certificates expire every 90 days. Certbot handles renewal, but monitoring ensures it's working:

```bash
# Check certificate expiry date
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -noout -enddate

# Test certbot renewal (dry run)
sudo certbot renew --dry-run

# View renewal timer status
sudo systemctl status certbot.timer

# List all certificates managed by Certbot
sudo certbot certificates
```

## Summary

Configuring SSL/TLS in Nginx involves placing certificate files on the server, creating an HTTPS server block that references them, and applying security-hardened TLS settings. Use Let's Encrypt with Certbot for free certificates and automatic renewal, or install commercial certificates manually. Always test the configuration with `nginx -t` before reloading, verify HTTPS works with `curl` and `openssl s_client`, and check your configuration against SSL Labs to identify any weak settings.
