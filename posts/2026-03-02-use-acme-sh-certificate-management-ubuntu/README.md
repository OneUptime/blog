# How to Use acme.sh for Certificate Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL, ACME, TLS, Certificate Management

Description: A complete guide to using acme.sh for ACME protocol certificate management on Ubuntu, covering installation, DNS validation, auto-renewal, and deployment hooks.

---

acme.sh is a pure shell script implementation of the ACME protocol, used to obtain and renew SSL/TLS certificates from Let's Encrypt and other ACME-compatible CAs. It runs without any external dependencies beyond standard Unix utilities and curl, which makes it easy to install and manage on any Ubuntu server without worrying about Python environments or system packages breaking your certificate workflow.

## Why acme.sh

Compared to Certbot, acme.sh has several practical advantages:

- No system package dependencies - runs anywhere with bash and curl
- Native support for 150+ DNS providers for DNS-01 validation
- Flexible deployment hooks to copy certificates wherever needed
- Does not modify your web server configuration
- Runs entirely in user space under a dedicated account

## Installation

Install as the root user or a dedicated service account:

```bash
# Install acme.sh for the current user
curl https://get.acme.sh | sh -s email=admin@example.com

# The installer:
# - Copies acme.sh to ~/.acme.sh/
# - Adds a daily cron job for auto-renewal
# - Creates a shell alias

# Reload shell to pick up the alias
source ~/.bashrc
```

Verify installation:

```bash
acme.sh --version
```

## Choosing a Certificate Authority

acme.sh defaults to ZeroSSL since 2021, but Let's Encrypt remains a popular choice. Set your preferred CA:

```bash
# Use Let's Encrypt
acme.sh --set-default-ca --server letsencrypt

# Use ZeroSSL (default)
acme.sh --set-default-ca --server zerossl

# Use Buypass (90-day certs, ACME protocol)
acme.sh --set-default-ca --server buypass
```

## Obtaining Certificates

### HTTP-01 Validation (Webroot Mode)

If you have a web server running and can serve files from the document root:

```bash
# Issue certificate using webroot
acme.sh --issue -d example.com -d www.example.com \
    --webroot /var/www/html
```

acme.sh places a challenge file in `.well-known/acme-challenge/` and the CA validates it over HTTP.

### HTTP-01 with Standalone Mode

acme.sh can run its own temporary HTTP server on port 80:

```bash
# Stop any web server first, then:
acme.sh --issue -d example.com --standalone

# Or use a different port (requires port forwarding)
acme.sh --issue -d example.com --standalone --httpport 8080
```

### DNS-01 Validation

DNS validation is the most flexible method - it works without a web server and supports wildcard certificates:

```bash
# Manual DNS validation (prompts you to add a TXT record)
acme.sh --issue -d example.com -d '*.example.com' --dns \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please
```

After running this, acme.sh shows you the TXT records to add. Once added, complete the validation:

```bash
acme.sh --renew -d example.com \
    --yes-I-know-dns-manual-mode-enough-go-ahead-please
```

### Automatic DNS-01 with DNS Provider API

For fully automated wildcard certificates, use your DNS provider's API. Example with Cloudflare:

```bash
# Export Cloudflare credentials
export CF_Token="your-cloudflare-api-token"
export CF_Account_ID="your-account-id"

# Issue wildcard certificate
acme.sh --issue -d example.com -d '*.example.com' \
    --dns dns_cf
```

acme.sh stores the API credentials encrypted and uses them for renewals. Other DNS providers use similar environment variable patterns - check the acme.sh wiki for the full list.

Example with Route53:

```bash
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

acme.sh --issue -d example.com -d '*.example.com' \
    --dns dns_aws
```

## Installing Certificates to a Custom Location

Never use certificates directly from `~/.acme.sh/`. Instead, use the `--install-cert` command to copy them to a standard location and specify a reload command:

```bash
# Create target directory
sudo mkdir -p /etc/ssl/acme/example.com

# Install certificate with nginx reload hook
acme.sh --install-cert -d example.com \
    --cert-file      /etc/ssl/acme/example.com/cert.pem \
    --key-file       /etc/ssl/acme/example.com/key.pem \
    --fullchain-file /etc/ssl/acme/example.com/fullchain.pem \
    --reloadcmd      "sudo systemctl reload nginx"
```

This configuration is saved and replayed automatically at each renewal.

For Apache:

```bash
acme.sh --install-cert -d example.com \
    --cert-file      /etc/ssl/acme/example.com/cert.pem \
    --key-file       /etc/ssl/acme/example.com/key.pem \
    --fullchain-file /etc/ssl/acme/example.com/fullchain.pem \
    --reloadcmd      "sudo systemctl reload apache2"
```

### Granting Reload Permissions

The acme.sh user needs permission to reload the web server without a password:

```bash
sudo visudo
```

Add:

```text
# Allow acme user to reload nginx
acme ALL=(ALL) NOPASSWD: /usr/bin/systemctl reload nginx
```

## Managing Multiple Domains

Issue separate certificates or combine domains:

```bash
# Single certificate for multiple domains (SAN)
acme.sh --issue -d example.com -d www.example.com \
    -d api.example.com --dns dns_cf

# Separate certificate for a subdomain
acme.sh --issue -d mail.example.com --dns dns_cf
```

## Listing and Checking Certificates

```bash
# List all certificates managed by acme.sh
acme.sh --list

# Check certificate details
acme.sh --info -d example.com

# Check certificate expiry
openssl x509 -noout -dates -in ~/.acme.sh/example.com/fullchain.cer
```

## Manual Renewal

```bash
# Force renewal (even if not expiring soon)
acme.sh --renew -d example.com --force

# Renew all certificates
acme.sh --renew-all
```

## Configuring the Cron Job

The installer sets up a daily cron job:

```bash
crontab -l | grep acme
```

You should see something like:

```text
5 0 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" > /dev/null
```

Modify to add logging:

```bash
crontab -e
```

Replace the line with:

```text
5 0 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" >> /var/log/acme-renew.log 2>&1
```

## Revoking and Removing Certificates

```bash
# Revoke a certificate
acme.sh --revoke -d example.com

# Remove certificate from acme.sh management
acme.sh --remove -d example.com
```

## Using Pre and Post Hooks

acme.sh supports hooks that run before and after renewal:

```bash
# Example: stop HAProxy before renewal, start after
acme.sh --issue -d example.com --standalone \
    --pre-hook  "systemctl stop haproxy" \
    --post-hook "systemctl start haproxy"
```

Post-hook runs only on successful renewal. Use `--reloadcmd` when the action is a service reload.

## Deploying to Multiple Locations

For certificates needed in multiple places (e.g., nginx and a Node.js app):

```bash
# Create a custom deploy hook
nano ~/.acme.sh/deploy/custom_deploy.sh
```

```bash
#!/bin/bash
# Deploy certificate to multiple locations

DOMAIN="$1"
CERT="$2"
KEY="$3"
CHAIN="$4"
FULLCHAIN="$5"

# Copy to nginx location
cp "$FULLCHAIN" /etc/ssl/nginx/example.com.crt
cp "$KEY" /etc/ssl/nginx/example.com.key
systemctl reload nginx

# Copy to application directory
cp "$FULLCHAIN" /opt/myapp/ssl/cert.pem
cp "$KEY" /opt/myapp/ssl/key.pem
systemctl restart myapp

echo "Certificate deployed to nginx and myapp"
```

```bash
chmod +x ~/.acme.sh/deploy/custom_deploy.sh
```

Reference in acme.sh:

```bash
acme.sh --deploy -d example.com --deploy-hook custom_deploy
```

## Troubleshooting

**Debug mode:**
```bash
acme.sh --issue -d example.com --dns dns_cf --debug 2
```

**Test with staging CA (avoid rate limits):**
```bash
# Use Let's Encrypt staging
acme.sh --issue -d example.com --dns dns_cf --staging

# Once confirmed working, issue for real
acme.sh --issue -d example.com --dns dns_cf
```

**Check DNS propagation before validation:**
```bash
# Verify the TXT record is visible
dig +short TXT _acme-challenge.example.com @8.8.8.8
```

## Summary

acme.sh provides a lightweight, dependency-free approach to ACME certificate management that fits well in server environments where you want precise control. The combination of DNS-01 validation for wildcard certificates, flexible deployment hooks for copying certificates to the right place, and automated renewal via cron makes it a solid alternative to Certbot for Ubuntu servers.
