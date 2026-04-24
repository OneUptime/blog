# How to Use Certbot to Secure Portainer with SSL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Certbot, SSL, TLS, ACME, Security

Description: A detailed guide to using Certbot to obtain and manage SSL certificates for Portainer, including automated renewal and multiple ACME challenge methods.

## Overview

Certbot is a recommended ACME client for Let's Encrypt. It automates the process of obtaining, installing, and renewing SSL certificates. This guide covers using Certbot specifically for Portainer, including standalone mode, webroot mode, DNS-01 challenges for private networks, and automated renewal hooks.

## Prerequisites

- A domain name (for HTTP-01 challenge, it must resolve to your server)
- Certbot installed
- Portainer running on Docker

## Step 1: Install Certbot

```bash
# Ubuntu 22.04/24.04

sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot

# Ubuntu 20.04 / Debian
sudo apt-get install -y certbot

# RHEL/Rocky/Oracle Linux
sudo dnf install -y epel-release
sudo dnf install -y certbot

# Verify
certbot --version
```

## Method 1: Standalone Mode

Certbot runs its own web server on port 80 to prove domain ownership:

```bash
# Nothing else can be using port 80 while Certbot runs
sudo certbot certonly --standalone \
  -d portainer.example.com \
  --agree-tos \
  --non-interactive \
  -m admin@example.com \
  --preferred-challenges http

# Certificates created at:
# /etc/letsencrypt/live/portainer.example.com/
```

## Method 2: Webroot Mode (with Nginx)

If Nginx is running on port 80, use webroot mode instead:

```bash
# Configure Nginx to serve the ACME challenge
sudo mkdir -p /var/www/certbot
sudo tee /etc/nginx/conf.d/acme-challenge.conf << 'EOF'
server {
    listen 80;
    server_name portainer.example.com;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# Obtain cert using webroot
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d portainer.example.com \
  --agree-tos \
  --non-interactive \
  -m admin@example.com
```

## Method 3: DNS-01 Challenge (for Private Networks)

For Portainer instances not reachable from the internet:

```bash
# DNS-01 requires DNS API access
# Example with Cloudflare using the Certbot snap
# If you installed Certbot via apt or dnf, install the matching distro plugin package instead
sudo snap set certbot trust-plugin-with-root=ok
sudo snap install certbot-dns-cloudflare

# Create Cloudflare credentials
sudo mkdir -p /etc/letsencrypt
sudo tee /etc/letsencrypt/cloudflare.ini << 'EOF'
dns_cloudflare_api_token = your-cloudflare-api-token
EOF
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Obtain cert via DNS-01
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d portainer.internal.example.com \
  --agree-tos \
  --non-interactive \
  -m admin@example.com
```

## Step 4: Deploy Certbot Certificate to Portainer

```bash
#!/bin/bash
# deploy-cert-to-portainer.sh
# Use the Certificate Name from "certbot certificates"
CERT_NAME="portainer.example.com"
PORTAINER_IMAGE="portainer/portainer-ce:sts"

docker stop portainer
docker rm portainer

docker run -d \
  -p 9443:9443 -p 8000:8000 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v "/etc/letsencrypt/live/${CERT_NAME}:/certs/live/${CERT_NAME}:ro" \
  -v "/etc/letsencrypt/archive/${CERT_NAME}:/certs/archive/${CERT_NAME}:ro" \
  "${PORTAINER_IMAGE}" \
  --sslcert "/certs/live/${CERT_NAME}/fullchain.pem" \
  --sslkey "/certs/live/${CERT_NAME}/privkey.pem"

echo "Portainer restarted with the Let's Encrypt certificate"
```

## Step 5: Configure Automatic Renewal with Deploy Hook

```bash
# Create renewal hook
sudo tee /etc/letsencrypt/renewal-hooks/deploy/portainer.sh << 'EOF'
#!/bin/bash
# Use the Certificate Name from "certbot certificates"
CERT_NAME="portainer.example.com"

if [ "$RENEWED_LINEAGE" = "/etc/letsencrypt/live/${CERT_NAME}" ]; then
  docker restart portainer
  logger "Portainer: Let's Encrypt certificate renewed and Portainer restarted"
fi
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/portainer.sh

# Test renewal simulation
sudo certbot renew --dry-run
```

## Monitor Certificate Expiry

```bash
# Check when certificates expire
sudo certbot certificates

# Output:
# Found the following certs:
#   Certificate Name: portainer.example.com
#     Domains: portainer.example.com
#     Expiry Date: 2026-06-18 (VALID: 89 days)
#     Certificate Path: /etc/letsencrypt/live/portainer.example.com/fullchain.pem

# Set up expiry monitoring
echo | openssl s_client -servername portainer.example.com -connect portainer.example.com:9443 2>/dev/null \
  | openssl x509 -noout -enddate
```

## Conclusion

Certbot with multiple challenge methods covers a range of Portainer deployments - standalone for simple setups, webroot for servers already running Nginx, and DNS-01 for private/internal Portainer instances. Renewal hooks ensure certificates are automatically deployed to Portainer without manual intervention, maintaining continuous HTTPS availability.
