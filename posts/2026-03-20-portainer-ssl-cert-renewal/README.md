# How to Automate SSL Certificate Renewal for Portainer - Cert

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, TLS, Let's Encrypt, Automation

Description: Automate SSL/TLS certificate renewal for Portainer and its managed services using Certbot, acme.sh, or Traefik's built-in ACME support.

## Introduction

SSL certificates expire, and manually renewing them risks service downtime. Portainer itself needs a valid TLS certificate, and services managed by Portainer need automatic renewal too. This guide covers four automation approaches: Certbot with automatic renewal, Certbot deploy hooks, Traefik's built-in ACME, and acme.sh.

## Method 1: Certbot with Automatic Renewal

```bash
# Install Certbot with Cloudflare plugin

sudo apt-get install -y certbot python3-certbot-dns-cloudflare

# Create Cloudflare credentials
sudo mkdir -p /root/.secrets
sudo tee /root/.secrets/cloudflare.ini > /dev/null << 'EOF'
dns_cloudflare_api_token = YOUR_CLOUDFLARE_TOKEN
EOF
sudo chmod 600 /root/.secrets/cloudflare.ini

# Obtain certificate
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
  -d portainer.example.com \
  --non-interactive \
  --agree-tos \
  -m admin@example.com

# Configure Portainer to use the certificate
docker rm -f portainer
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt/live/portainer.example.com:/certs/live/portainer.example.com:ro \
  -v /etc/letsencrypt/archive/portainer.example.com:/certs/archive/portainer.example.com:ro \
  portainer/portainer-ce:latest \
  --sslcert /certs/live/portainer.example.com/fullchain.pem \
  --sslkey /certs/live/portainer.example.com/privkey.pem
```

## Method 2: Renewal Hook for Portainer

```bash
# Create a deploy hook that restarts Portainer after certificate renewal
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy/

sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-portainer.sh << 'EOF'
#!/bin/bash
# Restart Portainer when certificate is renewed
echo "Certificate renewed, restarting Portainer..."
docker restart portainer
echo "Portainer restarted"
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-portainer.sh

# Test renewal and run deploy hooks during the dry run
sudo certbot renew --dry-run --run-deploy-hooks

# Set up automatic renewal via systemd timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer
```

## Method 3: Traefik with Automatic ACME

```yaml
# traefik-auto-ssl.yml - Traefik handles all SSL automatically
# Before starting: touch acme.json && chmod 600 acme.json
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/letsencrypt/acme.json
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --entrypoints.web.http.redirections.entrypoint.to=websecure
      - --certificatesresolvers.le.acme.email=admin@example.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.le.acme.httpchallenge=true
      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=web

  portainer:
    image: portainer/portainer-ce:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - traefik.enable=true
      - traefik.http.routers.portainer.rule=Host(`portainer.example.com`)
      - traefik.http.routers.portainer.entrypoints=websecure
      - traefik.http.routers.portainer.tls.certresolver=le
      - traefik.http.services.portainer.loadbalancer.server.port=9000
      - traefik.http.services.portainer.loadbalancer.server.scheme=http

volumes:
  portainer_data:
```

## Method 4: acme.sh for Certificate Management

```bash
# Install acme.sh
curl https://get.acme.sh | sh -s email=admin@example.com

# Issue certificate using DNS challenge (Cloudflare)
export CF_Token="your-cloudflare-token"
~/.acme.sh/acme.sh --issue --dns dns_cf -d portainer.example.com

# Install certificate to a path mounted into Portainer
mkdir -p "$HOME/portainer-certs"
~/.acme.sh/acme.sh --install-cert -d portainer.example.com \
  --cert-file "$HOME/portainer-certs/cert.pem" \
  --key-file "$HOME/portainer-certs/key.pem" \
  --fullchain-file "$HOME/portainer-certs/fullchain.pem" \
  --reloadcmd "docker restart portainer"

# acme.sh automatically adds cron job for renewal
crontab -l | grep acme
```

## Certificate Monitoring Script

```bash
#!/bin/bash
# check-cert-expiry.sh
# Alert if certificate expires within 14 days

DOMAIN="portainer.example.com"
PORT="9443"
WARN_DAYS=14

EXPIRY=$(echo | openssl s_client -connect "${DOMAIN}:${PORT}" -servername "$DOMAIN" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null \
  | cut -d= -f2)

EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

echo "Certificate for $DOMAIN:$PORT expires in $DAYS_LEFT days"

if [ "$DAYS_LEFT" -lt "$WARN_DAYS" ]; then
  echo "WARNING: Certificate expires soon! Triggering renewal..."
  certbot renew --cert-name "$DOMAIN"
fi
```

## Conclusion

Automating SSL certificate renewal for Portainer eliminates the risk of unexpected certificate expiry causing service outages. Traefik's built-in ACME support is the most seamless option for new deployments. Certbot with systemd timers is ideal for existing setups. Either way, automated renewal ensures Portainer and its managed services always present valid certificates.
