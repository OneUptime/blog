# How to Use Let's Encrypt Certificates with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Let's Encrypt, TLS, SSL, Certbot

Description: Learn how to obtain free Let's Encrypt SSL certificates and configure Portainer to use them for trusted HTTPS access.

---

Let's Encrypt provides free, automated, and trusted TLS certificates. Combining Let's Encrypt with Portainer eliminates browser warnings and provides enterprise-grade encryption at no cost.

## Prerequisites

- A domain name pointing to your server's public IP
- Port 80 accessible from the internet (for HTTP-01 challenge)
- Certbot installed on the host

## Step 1: Install Certbot

```bash
# Ubuntu/Debian

sudo apt-get update
sudo apt-get install -y certbot

# Or using snap (recommended)
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

## Step 2: Obtain a Let's Encrypt Certificate

Use the standalone mode (temporarily binds port 80):

```bash
# Stop anything using port 80, then run Certbot standalone
# Replace portainer.example.com with your actual domain
sudo certbot certonly \
  --standalone \
  --agree-tos \
  --email admin@example.com \
  -d portainer.example.com

# Certificates are saved to:
# /etc/letsencrypt/live/portainer.example.com/fullchain.pem
# /etc/letsencrypt/live/portainer.example.com/privkey.pem
```

## Step 3: Run Portainer with Let's Encrypt Certificates

```bash
# Start Portainer using Let's Encrypt certificates
# Mount both the live and archive directories read-only
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt/live/portainer.example.com:/certs/live/portainer.example.com:ro \
  -v /etc/letsencrypt/archive/portainer.example.com:/certs/archive/portainer.example.com:ro \
  portainer/portainer-ce:latest \
  --sslcert /certs/live/portainer.example.com/fullchain.pem \
  --sslkey /certs/live/portainer.example.com/privkey.pem
```

## Docker Compose Example

```yaml
# docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      # Mount both live and archive because Certbot's live files are symlinks
      - /etc/letsencrypt/live/portainer.example.com:/certs/live/portainer.example.com:ro
      - /etc/letsencrypt/archive/portainer.example.com:/certs/archive/portainer.example.com:ro
    command:
      - --sslcert
      - /certs/live/portainer.example.com/fullchain.pem
      - --sslkey
      - /certs/live/portainer.example.com/privkey.pem

volumes:
  portainer_data:
```

## Automate Certificate Renewal

Let's Encrypt certificates expire every 90 days. Certbot usually configures automatic renewal for you, but you can verify it and add a deploy hook for Portainer if needed:

```bash
# Test renewal (dry run)
sudo certbot renew --dry-run

# If your Certbot installation does not already include automated renewal,
# add a cron job that restarts Portainer only after a successful renewal
# Edit crontab: sudo crontab -e
0 3 * * * certbot renew --quiet --deploy-hook "/usr/bin/docker restart portainer" >> /var/log/certbot-portainer.log 2>&1
```

## Verify the Certificate

```bash
# Check the certificate served by Portainer
openssl s_client -connect portainer.example.com:9443 -servername portainer.example.com </dev/null 2>/dev/null | \
  openssl x509 -noout -subject -issuer -enddate

# Or use curl
curl -v https://portainer.example.com:9443 2>&1 | grep -A10 "Server certificate"
```

---

*Track SSL certificate health and Portainer uptime with [OneUptime](https://oneuptime.com) monitoring.*
