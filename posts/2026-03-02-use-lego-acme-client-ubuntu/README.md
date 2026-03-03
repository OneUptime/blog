# How to Use Lego ACME Client on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL, ACME, Let's Encrypt, Certificate Management

Description: Set up and use Lego, the Go-based ACME client, on Ubuntu to obtain and renew SSL certificates with DNS validation and automated deployment.

---

Lego is an ACME client written in Go. It ships as a single statically-linked binary with no external dependencies, supports over 90 DNS providers for DNS-01 validation, and handles the full certificate lifecycle from issuance to renewal. If you're looking for an alternative to Certbot or acme.sh that runs as a standalone binary without any runtime dependencies, Lego is worth considering.

## Installing Lego

### From Binary Release

The easiest way is to download the precompiled binary:

```bash
# Check latest release at https://github.com/go-acme/lego/releases
LEGO_VERSION="4.18.0"
ARCH=$(dpkg --print-architecture)

# Map Debian arch names to release filenames
case "$ARCH" in
    amd64) LEGO_ARCH="amd64" ;;
    arm64) LEGO_ARCH="arm64" ;;
    armhf) LEGO_ARCH="arm" ;;
esac

# Download and extract
wget "https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_${LEGO_ARCH}.tar.gz" \
    -O /tmp/lego.tar.gz

tar -xzf /tmp/lego.tar.gz -C /tmp lego

sudo mv /tmp/lego /usr/local/bin/lego
sudo chmod +x /usr/local/bin/lego

# Verify
lego --version
```

### From Go Source

If you have Go installed:

```bash
go install github.com/go-acme/lego/v4/cmd/lego@latest
sudo cp ~/go/bin/lego /usr/local/bin/
```

## Basic Certificate Issuance

### HTTP-01 Validation (Standalone Mode)

```bash
# Stop your web server first if using standalone mode
sudo systemctl stop nginx

# Issue certificate
sudo lego \
    --email admin@example.com \
    --domains example.com \
    --domains www.example.com \
    --http \
    run

# Restart web server
sudo systemctl start nginx
```

Certificates are stored in `~/.lego/certificates/` (or `/root/.lego/` when run as root):

```text
/root/.lego/certificates/
    example.com.crt         # Full certificate chain
    example.com.key         # Private key
    example.com.issuer.crt  # Issuer certificate only
    example.com.json        # Certificate metadata
```

### HTTP-01 with Custom Web Root

If your web server is already running and serving from a known directory:

```bash
sudo lego \
    --email admin@example.com \
    --domains example.com \
    --http \
    --http.webroot /var/www/html \
    run
```

### DNS-01 for Wildcard Certificates

DNS-01 is Lego's strongest feature - extensive provider support built into the binary.

#### Cloudflare

```bash
# Set API credentials as environment variables
export CF_DNS_API_TOKEN="your-cloudflare-api-token"

sudo -E lego \
    --email admin@example.com \
    --domains '*.example.com' \
    --domains example.com \
    --dns cloudflare \
    run
```

#### Route53 (AWS)

```bash
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"

sudo -E lego \
    --email admin@example.com \
    --domains '*.example.com' \
    --dns route53 \
    run
```

#### DigitalOcean

```bash
export DO_AUTH_TOKEN="your-digitalocean-api-token"

sudo -E lego \
    --email admin@example.com \
    --domains '*.example.com' \
    --dns digitalocean \
    run
```

#### Checking Available DNS Providers

```bash
# List all supported DNS providers
lego dnshelp

# Get help for a specific provider
lego dnshelp -code cloudflare
```

## Certificate Renewal

### Manual Renewal

```bash
# Renew all certificates (only renews if expiring within 30 days)
sudo CF_DNS_API_TOKEN="your-token" lego \
    --email admin@example.com \
    --domains '*.example.com' \
    --dns cloudflare \
    renew

# Force renewal regardless of expiry
sudo CF_DNS_API_TOKEN="your-token" lego \
    --email admin@example.com \
    --domains '*.example.com' \
    --dns cloudflare \
    renew --renew-hook "/usr/local/bin/deploy-cert.sh" \
    --days 90
```

### Renewal with a Hook

The `--renew-hook` option runs a script after successful renewal:

```bash
sudo nano /usr/local/bin/deploy-cert.sh
```

```bash
#!/bin/bash
# Deploy renewed Lego certificates to service locations
# Environment variables available from Lego:
# LEGO_CERT_PATH      - path to the certificate file
# LEGO_CERT_KEY_PATH  - path to the key file
# LEGO_CERT_DOMAIN    - domain name

set -euo pipefail

CERT_DIR="/etc/ssl/lego"
DOMAIN="${LEGO_CERT_DOMAIN:-example.com}"

# Create target directory
mkdir -p "$CERT_DIR/$DOMAIN"

# Copy certificate files
cp "$LEGO_CERT_PATH" "$CERT_DIR/$DOMAIN/fullchain.pem"
cp "$LEGO_CERT_KEY_PATH" "$CERT_DIR/$DOMAIN/privkey.pem"

# Set permissions
chmod 644 "$CERT_DIR/$DOMAIN/fullchain.pem"
chmod 600 "$CERT_DIR/$DOMAIN/privkey.pem"

# Reload services
systemctl reload nginx 2>/dev/null && echo "Nginx reloaded"
systemctl reload haproxy 2>/dev/null && echo "HAProxy reloaded"

echo "Certificate deployment complete for $DOMAIN"
```

```bash
sudo chmod +x /usr/local/bin/deploy-cert.sh
```

## Storing API Credentials Securely

Rather than exporting environment variables in shell sessions, store credentials in a file:

```bash
sudo nano /etc/lego/cloudflare.env
```

```bash
CF_DNS_API_TOKEN=your-cloudflare-api-token
```

```bash
sudo chmod 600 /etc/lego/cloudflare.env
sudo chown root:root /etc/lego/cloudflare.env
```

Reference in scripts:

```bash
#!/bin/bash
set -a
source /etc/lego/cloudflare.env
set +a

lego --email admin@example.com \
     --domains '*.example.com' \
     --dns cloudflare \
     renew --renew-hook /usr/local/bin/deploy-cert.sh
```

## Setting Up Automated Renewal with systemd

### Create the Renewal Script

```bash
sudo nano /usr/local/bin/lego-renew.sh
```

```bash
#!/bin/bash
# Automated Lego certificate renewal
set -euo pipefail

# Load credentials
set -a
source /etc/lego/cloudflare.env
set +a

# Lego data directory
LEGO_PATH="/etc/lego/data"

# Run renewal
/usr/local/bin/lego \
    --path "$LEGO_PATH" \
    --email admin@example.com \
    --domains '*.example.com' \
    --domains example.com \
    --dns cloudflare \
    renew \
    --renew-hook "/usr/local/bin/deploy-cert.sh"
```

```bash
sudo chmod +x /usr/local/bin/lego-renew.sh
```

### Create the systemd Service

```bash
sudo nano /etc/systemd/system/lego-renew.service
```

```ini
[Unit]
Description=Lego ACME Certificate Renewal
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/lego-renew.sh
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lego-renew

# Harden the service
PrivateTmp=yes
NoNewPrivileges=yes
```

### Create the systemd Timer

```bash
sudo nano /etc/systemd/system/lego-renew.timer
```

```ini
[Unit]
Description=Lego Certificate Auto-Renewal Timer

[Timer]
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lego-renew.timer
sudo systemctl status lego-renew.timer
```

## Using a Staging Environment

Avoid rate limits during testing with Let's Encrypt's staging server:

```bash
sudo lego \
    --server https://acme-staging-v02.api.letsencrypt.org/directory \
    --email admin@example.com \
    --domains example.com \
    --dns cloudflare \
    run
```

Staging certificates are issued by a test CA and won't be trusted by browsers, but they confirm your configuration works before going to production.

## EAB Configuration for ZeroSSL

ZeroSSL requires External Account Binding (EAB) credentials:

```bash
# Get your EAB credentials from https://zerossl.com/developer/
sudo lego \
    --server https://acme.zerossl.com/v2/DV90 \
    --eab \
    --kid "your-key-id" \
    --hmac "your-hmac-key" \
    --email admin@example.com \
    --domains example.com \
    --dns cloudflare \
    run
```

## Inspecting Certificate Status

```bash
# List managed certificates
ls -la /root/.lego/certificates/

# Check certificate details
openssl x509 -in /root/.lego/certificates/example.com.crt \
    -noout -text | grep -E 'Subject|DNS:|Not After'

# Check days until expiry
EXPIRY=$(openssl x509 -in /root/.lego/certificates/example.com.crt \
    -noout -enddate | cut -d= -f2)
DAYS=$(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))
echo "Certificate expires in $DAYS days"
```

## Troubleshooting

**DNS propagation timeout:**

```bash
# Increase the propagation wait time
lego \
    --dns.propagation-wait 120s \
    --email admin@example.com \
    --domains example.com \
    --dns cloudflare \
    run
```

**Debugging provider issues:**

```bash
# Enable verbose output
lego \
    --email admin@example.com \
    --domains example.com \
    --dns cloudflare \
    --log.level DEBUG \
    run
```

**Wrong data directory:**

By default Lego stores data in `~/.lego`. When running as root via systemd, specify explicitly:

```bash
lego --path /etc/lego/data ...
```

## Summary

Lego is a self-contained ACME client that works well on Ubuntu servers where you want minimal dependencies and strong DNS provider support. The single binary model makes it easy to deploy, version, and update. Paired with a systemd timer for automated renewal and a deployment hook script, Lego handles the full certificate lifecycle cleanly.
