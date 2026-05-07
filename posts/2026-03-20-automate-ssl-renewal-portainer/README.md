# How to Automate SSL Certificate Renewal for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, Let's Encrypt, Certbot, Traefik, Automation, Security

Description: Learn how to set up automatic SSL certificate renewal for Portainer and its managed services using Traefik or Certbot with automated renewal hooks.

---

Let's Encrypt's default certificates expire every 90 days. Manually renewing them is error-prone and easy to forget. This guide covers three common ways to automate SSL for Portainer: using Traefik (which handles renewal automatically), using Certbot with renewal hooks to reload the TLS endpoint, and configuring Portainer to use externally managed certificates.

---

## Approach 1: Traefik with Automatic SSL (Recommended)

Traefik handles certificate acquisition and renewal entirely automatically. Once configured, you never need to think about SSL again.

```yaml
# traefik-auto-ssl-stack.yml - Traefik with automatic Let's Encrypt

version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      # Redirect all HTTP to HTTPS
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      # ACME / Let's Encrypt configuration
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_letsencrypt:/letsencrypt
  portainer:
    image: portainer/portainer-ce:sts
    container_name: portainer
    command: -H unix:///var/run/docker.sock
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

volumes:
  traefik_letsencrypt:
  portainer_data:
```

Traefik renews certificates automatically when they're within 30 days of expiry - no cron jobs needed.

---

## Approach 2: Certbot with Renewal Hooks

If you're using Nginx instead of Traefik, Certbot's renewal hooks can reload services after certificate renewal.

```bash
# Install Certbot
sudo apt update && sudo apt install -y certbot python3-certbot-nginx

# Obtain a certificate for Portainer's domain
sudo certbot certonly \
  --nginx \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email \
  -d portainer.example.com

# Verify the certificate
sudo certbot certificates
```

---

### Create a Renewal Hook to Reload Nginx

```bash
# /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#!/bin/bash
# This script runs after every successful certificate renewal

echo "Certificate renewed. Reloading Nginx..."
systemctl reload nginx

echo "Reload complete at $(date)"
```

```bash
chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

---

### Test Certbot Auto-Renewal

```bash
# Dry-run renewal to verify the process works, including deploy hooks
sudo certbot renew --dry-run --run-deploy-hooks

# Check the systemd timer for automatic renewal
sudo systemctl status certbot.timer

# View renewal logs
sudo journalctl -u certbot.service -u certbot.timer
```

---

## Approach 3: Portainer with Custom SSL Certificates

If you manage certificates externally, update Portainer to use them.

```bash
# Recreate Portainer with your certificate and key mounted into /certs
docker rm -f portainer

docker run -d \
  -p 9443:9443 -p 8000:8000 \
  --name portainer \
  --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /path/to/your/certs:/certs:ro \
  portainer/portainer-ce:sts \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

---

## Monitoring Certificate Expiry with OneUptime

Set up an SSL expiry check in OneUptime to alert you if any certificate is within 14 days of expiry - as a safety net for your automation.

---

## Summary

The simplest path to automated SSL for Portainer is deploying Traefik as a reverse proxy. Traefik handles Let's Encrypt certificates and renewals automatically with zero maintenance. For Nginx-based setups, Certbot with renewal hooks in `/etc/letsencrypt/renewal-hooks/deploy/` provides reliable automation. Always test renewals with `--dry-run --run-deploy-hooks` before relying on them in production.
