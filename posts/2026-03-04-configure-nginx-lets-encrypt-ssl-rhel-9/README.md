# How to Configure Nginx with Let's Encrypt SSL on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NGINX, SSL, TLS, Let's Encrypt, Certbot, Linux

Description: Step-by-step instructions for securing Nginx with free TLS certificates from Let's Encrypt using Certbot on RHEL, including automatic renewal.

---

Securing your Nginx web server with HTTPS is essential. Let's Encrypt provides free, trusted TLS certificates, and Certbot automates their installation and renewal. This guide covers the full process on RHEL.

## Prerequisites

- A RHEL system with Nginx installed and running
- A domain name pointing to your server's public IP
- Ports 80 and 443 open in the firewall
- Root or sudo access

## Step 1: Install Certbot

```bash
# Enable EPEL repository
sudo dnf install -y epel-release

# Install Certbot with the Nginx plugin
sudo dnf install -y certbot python3-certbot-nginx

# Verify Certbot is installed
certbot --version
```

## Step 2: Verify Nginx Configuration

Make sure your server block has a valid server_name:

```nginx
# /etc/nginx/conf.d/example.com.conf
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/html;
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Reload if needed
sudo systemctl reload nginx
```

## Step 3: Obtain the Certificate

```bash
# Run Certbot with the Nginx plugin
sudo certbot --nginx -d example.com -d www.example.com

# Certbot will:
# 1. Verify domain ownership via HTTP challenge
# 2. Obtain the certificate
# 3. Automatically configure Nginx for SSL
# 4. Optionally set up HTTP to HTTPS redirect
```

For non-interactive use:

```bash
sudo certbot --nginx     --non-interactive     --agree-tos     --email admin@example.com     --redirect     -d example.com     -d www.example.com
```

## Step 4: Review the Automatic Configuration

Certbot modifies your Nginx server block. The result looks like:

```nginx
server {
    server_name example.com www.example.com;
    root /var/www/html;

    # SSL settings added by Certbot
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

# HTTP to HTTPS redirect added by Certbot
server {
    listen 80;
    server_name example.com www.example.com;

    if ($host = www.example.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = example.com) {
        return 301 https://$host$request_uri;
    }

    return 404;
}
```

## Step 5: Harden SSL Settings

```nginx
# /etc/nginx/conf.d/ssl-hardening.conf

# Disable old TLS versions
ssl_protocols TLSv1.2 TLSv1.3;

# Strong cipher suites
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;

# Enable HSTS (1 year)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# SSL session caching
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
```

## Step 6: Set Up Automatic Renewal

```bash
# Check if the Certbot timer is active
sudo systemctl status certbot-renew.timer

# Enable if not active
sudo systemctl enable --now certbot-renew.timer

# Test renewal without actually renewing
sudo certbot renew --dry-run

# List all managed certificates
sudo certbot certificates
```

## Step 7: Verify SSL

```bash
# Test with curl
curl -vI https://example.com 2>&1 | grep -E "subject|expire|issuer|HTTP/"

# Check certificate details
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates

# Test SSL configuration with Nginx
sudo nginx -t
```

## Troubleshooting

```bash
# If Certbot fails, check that port 80 is open
sudo firewall-cmd --list-services

# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Verify DNS resolution
dig example.com +short

# If renewal fails
sudo certbot renew --dry-run --debug-challenges
```

## Summary

Your Nginx server on RHEL now serves traffic over HTTPS with a free Let's Encrypt certificate. Certbot handles the certificate lifecycle, including automatic renewal every 60 days. With the additional SSL hardening settings, your server only accepts modern TLS connections and tells browsers to always use HTTPS via HSTS headers.
