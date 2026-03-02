# How to Set Up ACME Protocol for Automated Certificate Issuance on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, ACME, Automation

Description: Learn how to use the ACME protocol on Ubuntu for automated SSL/TLS certificate issuance and renewal, covering multiple ACME clients and challenge types.

---

ACME (Automatic Certificate Management Environment) is the protocol that Let's Encrypt uses to automate certificate issuance and renewal. It removes humans from the certificate lifecycle - a properly configured server requests, receives, and renews its own certificates without manual intervention. While Certbot is the most well-known ACME client, several others offer different tradeoffs in features and complexity.

## How ACME Works

The ACME protocol involves three steps:

1. **Account creation** - Your ACME client registers with the CA using a key pair
2. **Domain validation** - You prove you control the domain using one of the challenge types
3. **Certificate issuance** - The CA signs and issues the certificate

The two most common challenge types are:

**HTTP-01** - The CA sends a token that your ACME client places at `http://yourdomain.com/.well-known/acme-challenge/<token>`. The CA fetches it to verify you control the domain. Requires port 80 to be publicly accessible.

**DNS-01** - Your ACME client creates a TXT record at `_acme-challenge.yourdomain.com`. The CA looks up the DNS record. Does not require a web server and works for wildcard certificates.

## Setting Up Certbot (The Standard Client)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Install web server plugins
sudo apt install python3-certbot-nginx   # For Nginx
sudo apt install python3-certbot-apache  # For Apache

# Install DNS plugins
sudo apt install python3-certbot-dns-cloudflare
sudo apt install python3-certbot-dns-route53
# Find more: apt search python3-certbot-dns
```

### HTTP-01 Challenge with Nginx

```bash
# Obtain certificate, Certbot handles Nginx configuration
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot-only certificate (no web server modification)
sudo certbot certonly --nginx -d yourdomain.com

# Using standalone mode (Certbot runs its own HTTP server temporarily)
sudo certbot certonly --standalone -d yourdomain.com
```

### DNS-01 Challenge for Wildcard Certificates

```bash
# Wildcard certificates require DNS challenge
# With Cloudflare DNS plugin:

# Create Cloudflare API credentials file
sudo mkdir -p /etc/letsencrypt/
sudo tee /etc/letsencrypt/cloudflare.ini << 'EOF'
# Cloudflare API token (not the global API key - use a scoped token)
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
sudo chmod 600 /etc/letsencrypt/cloudflare.ini

# Obtain wildcard certificate
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d yourdomain.com \
    -d "*.yourdomain.com" \
    --agree-tos \
    --email admin@yourdomain.com
```

## Setting Up acme.sh (Lightweight Alternative)

`acme.sh` is a pure shell script ACME client with broad DNS provider support:

```bash
# Install acme.sh
curl https://get.acme.sh | sh -s email=admin@yourdomain.com

# Reload shell to get the acme.sh alias
source ~/.bashrc

# Register with Let's Encrypt (ZeroSSL is now the default)
# To use Let's Encrypt explicitly:
acme.sh --set-default-ca --server letsencrypt

# Verify installation
acme.sh --version
```

### Issuing Certificates with acme.sh

```bash
# HTTP-01 challenge with webroot
acme.sh --issue -d yourdomain.com -d www.yourdomain.com \
    --webroot /var/www/html

# Standalone mode (stops your web server temporarily)
sudo systemctl stop nginx
acme.sh --issue -d yourdomain.com --standalone
sudo systemctl start nginx

# DNS-01 challenge with Cloudflare
export CF_Token="your-cloudflare-api-token"
acme.sh --issue -d yourdomain.com -d "*.yourdomain.com" --dns dns_cf

# Install certificate to a specific location with reload command
acme.sh --install-cert -d yourdomain.com \
    --cert-file /etc/nginx/ssl/cert.pem \
    --key-file /etc/nginx/ssl/key.pem \
    --fullchain-file /etc/nginx/ssl/fullchain.pem \
    --reloadcmd "systemctl reload nginx"
```

`acme.sh` automatically sets up a cron job for renewal.

## Setting Up Lego (Go-Based ACME Client)

Lego is a fast Go-based ACME client with an extensive list of DNS providers:

```bash
# Install lego
# Download from GitHub releases
LEGO_VERSION="v4.15.0"
wget "https://github.com/go-acme/lego/releases/download/${LEGO_VERSION}/lego_${LEGO_VERSION}_linux_amd64.tar.gz" \
    -O /tmp/lego.tar.gz
tar -xzf /tmp/lego.tar.gz -C /tmp
sudo install /tmp/lego /usr/local/bin/lego

# Verify installation
lego --version
```

```bash
# Issue a certificate using Cloudflare DNS
export CF_DNS_API_TOKEN="your-cloudflare-api-token"

lego \
    --email admin@yourdomain.com \
    --dns cloudflare \
    --domains yourdomain.com \
    --domains "*.yourdomain.com" \
    run

# Certificate files are stored in .lego/certificates/
ls .lego/certificates/
```

## Setting Up Automatic Renewal with Certbot

Certbot installs a systemd timer automatically. Verify it is working:

```bash
# Check the timer
sudo systemctl status certbot.timer
sudo systemctl list-timers | grep certbot

# Test renewal without actually renewing
sudo certbot renew --dry-run

# Force a renewal (bypass the 30-day-remaining threshold)
sudo certbot renew --force-renewal

# View all managed certificates
sudo certbot certificates
```

## Using ACME with a Custom CA (Not Let's Encrypt)

ACME is not limited to Let's Encrypt. You can use it with any ACME-compliant CA:

```bash
# Use ZeroSSL (alternative free CA)
sudo certbot --server https://acme.zerossl.com/v2/DV90 \
    --agree-tos --email admin@yourdomain.com \
    certonly --standalone -d yourdomain.com

# Use BuyPass (another free CA)
sudo certbot --server https://api.buypass.com/acme/directory \
    --agree-tos --email admin@yourdomain.com \
    certonly --standalone -d yourdomain.com

# Use an internal step-ca
sudo certbot --server https://ca.internal.example.com:9000/acme/acme/directory \
    certonly --standalone -d service.internal.example.com

# Use with acme.sh (any ACME server)
acme.sh --issue -d yourdomain.com --standalone \
    --server https://acme.zerossl.com/v2/DV90 \
    --eab-kid YOUR_EAB_KID \
    --eab-hmac-key YOUR_EAB_HMAC_KEY
```

## Pre-Hook and Post-Hook for Certbot

Configure hooks to handle web server management during renewal:

```bash
# Pre-hook: stop web server before renewal (for standalone mode)
sudo tee /etc/letsencrypt/renewal-hooks/pre/stop-nginx.sh << 'EOF'
#!/bin/bash
systemctl stop nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/pre/stop-nginx.sh

# Post-hook: restart web server after renewal attempt
sudo tee /etc/letsencrypt/renewal-hooks/post/start-nginx.sh << 'EOF'
#!/bin/bash
systemctl start nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/start-nginx.sh

# Deploy hook: reload after successful renewal
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

## Monitoring ACME Certificate Health

```bash
#!/bin/bash
# check-acme-certs.sh - Monitor certificates managed by Certbot

echo "=== Certificate Status Report ==="
echo "Generated: $(date)"
echo ""

# List all Certbot-managed certificates
sudo certbot certificates 2>/dev/null | \
    grep -E "Certificate Name|Domains|Expiry Date|Certificate Path"

echo ""
echo "=== Upcoming Renewals ==="
sudo certbot certificates 2>/dev/null | grep "Expiry Date" | while read -r line; do
    EXPIRY=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2}')
    DAYS=$(( ($(date -d "$EXPIRY" +%s) - $(date +%s)) / 86400 ))
    if [[ $DAYS -lt 30 ]]; then
        echo "WARNING: Certificate expires in $DAYS days ($EXPIRY)"
    fi
done
```

## Handling ACME Rate Limits

Let's Encrypt enforces rate limits. Key limits to know:

- 5 duplicate certificates per 7 days (same domain set)
- 50 certificates per domain per week
- 5 failed validation attempts per hour per domain

```bash
# Use the staging environment for testing (no rate limits, but certs are not trusted)
sudo certbot certonly --staging --standalone \
    -d yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos

# acme.sh staging
acme.sh --issue -d yourdomain.com --standalone \
    --server https://acme-staging-v02.api.letsencrypt.org/directory

# When ready for production, get a real certificate
sudo certbot certonly --standalone \
    -d yourdomain.com \
    --email admin@yourdomain.com \
    --agree-tos
```

## Summary

ACME automation eliminates manual certificate management. Choose a client based on your needs: Certbot for the most documentation and plugin ecosystem, acme.sh for lightweight pure-shell operation with broad DNS provider support, or Lego for a fast Go binary. Use HTTP-01 challenge for standard web servers, and DNS-01 for wildcards or servers without public HTTP access. Configure renewal hooks to reload your web server after successful renewal, and always test with `--dry-run` before relying on the automation in production. The staging environment is invaluable for testing without hitting rate limits.
