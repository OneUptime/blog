# How to Configure Portainer SSL with Certbot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Certbot, SSL, Let's Encrypt, Automation

Description: A complete guide to using Certbot to obtain and automatically renew SSL certificates for Portainer with DNS and HTTP challenge methods.

---

Certbot is the official Let's Encrypt client that automates SSL certificate issuance and renewal. This guide covers both HTTP-01 and DNS-01 challenge methods for Portainer SSL setup.

## HTTP-01 Challenge (Port 80 Required)

The HTTP-01 challenge validates domain ownership by serving a file on port 80.

```bash
# Ensure port 80 is available and accessible

# Stop any service on port 80 temporarily
sudo systemctl stop nginx 2>/dev/null || true

# Obtain certificate using standalone HTTP challenge
sudo certbot certonly \
  --standalone \
  --http-01-port 80 \
  --agree-tos \
  --non-interactive \
  --email admin@example.com \
  -d portainer.example.com
```

## DNS-01 Challenge (No Port 80 Required)

The DNS-01 challenge validates via a TXT DNS record - useful when port 80 is blocked:

```bash
# Use DNS challenge (requires manual DNS TXT record creation)
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --agree-tos \
  --email admin@example.com \
  -d portainer.example.com

# Certbot will prompt you to add a DNS TXT record
# _acme-challenge.portainer.example.com -> <provided-value>
# After adding the record, press Enter to continue
```

## Certbot with Nginx Plugin (Recommended)

If Nginx is already running and handling your traffic:

```bash
# Install certbot nginx plugin
sudo apt-get install -y python3-certbot-nginx

# Configure Nginx first with the domain, then run certbot
sudo certbot --nginx \
  --agree-tos \
  --email admin@example.com \
  -d portainer.example.com
```

## Configure Portainer to Use Certbot Certificates

```bash
# Certificates are stored in /etc/letsencrypt/live/<domain>/
# Start Portainer with these certificates
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt:/letsencrypt:ro \
  portainer/portainer-ce:latest \
  --ssl \
  --sslcert /letsencrypt/live/portainer.example.com/fullchain.pem \
  --sslkey /letsencrypt/live/portainer.example.com/privkey.pem
```

## Automated Renewal with Post-Hook

Configure Certbot to restart Portainer after successful renewal:

```bash
# Create a renewal deploy hook that restarts Portainer
sudo tee /etc/letsencrypt/renewal-hooks/deploy/portainer.sh << 'EOF'
#!/bin/bash
# Restart Portainer after certificate renewal
docker restart portainer
echo "Portainer restarted with new certificate: $(date)"
EOF

sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/portainer.sh
```

Certbot's systemd timer handles automatic renewal:

```bash
# Check if certbot renewal timer is active (apt install)
sudo systemctl status certbot.timer

# If certbot was installed via snap, the timer is named differently
# sudo systemctl status snap.certbot.renew.timer

# Manually trigger a dry-run renewal test
sudo certbot renew --dry-run
```

## Check Certificate Status

```bash
# List all managed certificates and their expiry
sudo certbot certificates

# Check days until expiry for a specific domain
openssl s_client -connect portainer.example.com:9443 </dev/null 2>/dev/null | \
  openssl x509 -noout -enddate
```

---

*Stay ahead of certificate expirations with [OneUptime](https://oneuptime.com) SSL monitoring and automated alerts.*
