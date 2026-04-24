# How to Use Let's Encrypt Certificates with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Lets-encrypt, SSL, TLS, Certbot, ACME

Description: A guide to obtaining and configuring free Let's Encrypt SSL/TLS certificates for Portainer.

## Overview

Let's Encrypt provides free, trusted SSL/TLS certificates via the ACME protocol. Using Let's Encrypt with Portainer eliminates self-signed certificate warnings and provides trusted encryption. This guide covers obtaining Let's Encrypt certificates with Certbot and configuring them with Portainer.

## Prerequisites

- A domain name pointing to your server's public IP
- Port 80 accessible from the internet (for HTTP-01 challenge)
- Portainer installed on Docker
- Certbot installed

## Step 1: Install Certbot

```bash
# Ubuntu/Debian

sudo apt-get update
sudo apt-get install -y certbot

# RHEL/Rocky/Oracle
sudo dnf install -y certbot

# Or use Certbot Docker container
docker run --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly --standalone \
  -d portainer.example.com \
  --non-interactive \
  --agree-tos \
  -m admin@example.com
```

## Step 2: Obtain Let's Encrypt Certificate

```bash
# If another service is using port 80, stop it temporarily before running Certbot

# Obtain certificate using standalone mode
sudo certbot certonly --standalone \
  -d portainer.example.com \
  --non-interactive \
  --agree-tos \
  -m admin@example.com

# Certificates are saved at:
ls /etc/letsencrypt/live/portainer.example.com/
# cert.pem       - Server certificate
# chain.pem      - Intermediate chain
# fullchain.pem  - cert + chain (use this)
# privkey.pem    - Private key
```

## Step 3: Configure Portainer with Let's Encrypt Cert

```bash
# Copy certificates to Portainer data volume
docker run --rm \
  -v portainer_data:/data \
  -v /etc/letsencrypt:/letsencrypt:ro \
  alpine \
  sh -c "mkdir -p /data/certs && \
    cp /letsencrypt/live/portainer.example.com/fullchain.pem /data/certs/cert.pem && \
    cp /letsencrypt/live/portainer.example.com/privkey.pem /data/certs/key.pem && \
    chmod 644 /data/certs/cert.pem && \
    chmod 600 /data/certs/key.pem"

# Start Portainer with Let's Encrypt certs
docker run -d \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --sslcert /data/certs/cert.pem \
  --sslkey /data/certs/key.pem \
  --http-disabled
```

## Step 4: Automatic Certificate Renewal

Let's Encrypt certificates expire every 90 days. Set up automatic renewal:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# Renewal with Portainer restart hook
sudo tee /etc/letsencrypt/renewal-hooks/deploy/portainer-reload.sh << 'EOF'
#!/bin/bash
# Copy renewed cert to Portainer
docker run --rm \
  -v portainer_data:/data \
  -v /etc/letsencrypt:/letsencrypt:ro \
  alpine \
  sh -c "cp /letsencrypt/live/portainer.example.com/fullchain.pem /data/certs/cert.pem && \
    cp /letsencrypt/live/portainer.example.com/privkey.pem /data/certs/key.pem"

# Restart Portainer to load new cert
docker restart portainer
echo "Portainer restarted with renewed Let's Encrypt certificate"
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/portainer-reload.sh

# Most Certbot installations come with automatic renewal preconfigured
# Verify an automatic renewal timer exists:
systemctl list-timers | grep certbot

# Or manual cron entry
SLEEPTIME=$(awk 'BEGIN{srand(); print int(rand()*(3600+1))}'); echo "0 0,12 * * * root sleep $SLEEPTIME && certbot renew -q" | sudo tee -a /etc/crontab > /dev/null
```

## Using Nginx for Let's Encrypt with Portainer

For more flexibility, use Nginx as a reverse proxy handling Let's Encrypt:

```bash
# Install Certbot Nginx plugin
sudo apt-get install -y certbot python3-certbot-nginx

# Configure Nginx for Portainer
sudo tee /etc/nginx/sites-available/portainer.conf << 'EOF'
server {
    server_name portainer.example.com;
    location / {
        proxy_pass https://localhost:9443;
        proxy_ssl_verify off;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/portainer.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Let Certbot configure HTTPS automatically
sudo certbot --nginx -d portainer.example.com --non-interactive --agree-tos -m admin@example.com
```

## Verify Let's Encrypt Certificate

```bash
# Check certificate issuer and expiry
echo | openssl s_client -connect portainer.example.com:9443 -servername portainer.example.com 2>/dev/null \
  | openssl x509 -noout -issuer -enddate

# issuer should be Let's Encrypt, and notAfter should show the certificate expiry date

# Test with curl (no -k needed for valid cert)
curl -I https://portainer.example.com:9443
```

## Conclusion

Let's Encrypt provides free, trusted certificates that eliminate browser warnings for public-facing Portainer instances. The automatic renewal with deploy hooks ensures continuous availability without manual intervention. For private/internal Portainer instances not accessible from the internet, use an internal CA or DNS-01 ACME challenge instead of HTTP-01.
