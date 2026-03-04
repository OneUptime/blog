# How to Use ACME Clients (Certbot, Lego, acme.sh) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, TLS, ACME, Let's Encrypt, Certificates

Description: Compare and use the three major ACME clients - Certbot, Lego, and acme.sh - on Ubuntu to obtain and manage Let's Encrypt certificates for different use cases.

---

ACME (Automatic Certificate Management Environment) is the protocol used by Let's Encrypt and other CAs to automate certificate issuance and renewal. On Ubuntu, you have three widely used client implementations: Certbot (the official EFF client), Lego (written in Go, popular in automated environments), and acme.sh (a pure shell script, no runtime dependencies). Each has different strengths depending on your use case.

## Quick Comparison

| Feature | Certbot | Lego | acme.sh |
|---------|---------|------|---------|
| Language | Python | Go | Bash |
| Installation size | Large | Medium | Tiny (~50KB) |
| DNS providers built-in | ~50+ | 90+ | 150+ |
| Systemd integration | Excellent | Manual | Manual |
| Suitable for | Production web servers | CI/CD, containers | Anywhere |
| Root required | Sometimes | No | No |

## Certbot

Certbot is the EFF's recommended client and integrates tightly with Apache and Nginx on Ubuntu.

### Install Certbot

```bash
# Install from Ubuntu repositories
sudo apt-get install -y certbot python3-certbot-nginx python3-certbot-apache

# Or install the snap (more up to date)
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

### Obtain a Certificate - Webroot Method

Use the webroot method when Apache or Nginx is already running:

```bash
# Create the webroot challenge directory if needed
sudo mkdir -p /var/www/html/.well-known/acme-challenge

# Obtain the certificate
sudo certbot certonly --webroot \
    --webroot-path /var/www/html \
    -d example.com \
    -d www.example.com \
    --email admin@example.com \
    --agree-tos \
    --non-interactive

# Certificates stored in /etc/letsencrypt/live/example.com/
ls /etc/letsencrypt/live/example.com/
```

### Obtain a Certificate - Nginx Plugin

```bash
# Let certbot automatically configure Nginx
sudo certbot --nginx -d example.com -d www.example.com

# Or just obtain the cert without modifying Nginx config
sudo certbot --nginx certonly -d example.com
```

### DNS Challenge with Certbot

Use DNS validation for wildcard certificates or when port 80 is not accessible:

```bash
# Manual DNS challenge (requires manual TXT record creation)
sudo certbot certonly --manual --preferred-challenges dns \
    -d "*.example.com" \
    -d example.com \
    --email admin@example.com \
    --agree-tos

# Automated DNS challenge with a provider plugin
# (requires installing the appropriate plugin)
sudo apt-get install -y python3-certbot-dns-cloudflare

# Configure Cloudflare credentials
sudo nano /root/.cloudflare.ini
```

```ini
# Cloudflare API token
dns_cloudflare_api_token = YOUR_TOKEN_HERE
```

```bash
sudo chmod 600 /root/.cloudflare.ini

# Obtain wildcard cert via Cloudflare DNS
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /root/.cloudflare.ini \
    -d "*.example.com" \
    -d example.com \
    --email admin@example.com \
    --agree-tos
```

### Check and Renew Certbot Certificates

```bash
# List all managed certificates
sudo certbot certificates

# Test renewal (doesn't actually renew)
sudo certbot renew --dry-run

# Force renewal now
sudo certbot renew --force-renewal --cert-name example.com

# Check the automatic renewal timer
sudo systemctl status certbot.timer
```

## Lego

Lego is a Go-based ACME client that works well in Docker containers, CI/CD pipelines, and anywhere you need a single binary without system dependencies.

### Install Lego

```bash
# Download the latest Lego binary
LEGO_VERSION=4.14.2
wget https://github.com/go-acme/lego/releases/download/v${LEGO_VERSION}/lego_v${LEGO_VERSION}_linux_amd64.tar.gz

tar xzf lego_v${LEGO_VERSION}_linux_amd64.tar.gz

# Install to system
sudo install lego /usr/local/bin/lego

# Verify
lego --version
```

### Obtain a Certificate with Lego

```bash
# Create a directory for Lego certificates
sudo mkdir -p /etc/lego

# Obtain using HTTP challenge
sudo lego \
    --email admin@example.com \
    --domains example.com \
    --domains www.example.com \
    --http \
    --path /etc/lego \
    run

# Certificates stored in /etc/lego/certificates/
ls /etc/lego/certificates/
```

### Lego with DNS Challenge

```bash
# Lego supports 90+ DNS providers
# Example with Cloudflare
export CF_DNS_API_TOKEN="your_token"

sudo --preserve-env lego \
    --email admin@example.com \
    --domains "*.example.com" \
    --dns cloudflare \
    --path /etc/lego \
    run

# Check available DNS providers
lego dnshelp
```

### Renew with Lego

```bash
# Renew a certificate
sudo lego \
    --email admin@example.com \
    --domains example.com \
    --http \
    --path /etc/lego \
    renew

# Renew with a post-hook to reload Nginx
sudo lego \
    --email admin@example.com \
    --domains example.com \
    --http \
    --path /etc/lego \
    renew \
    --renew-hook "systemctl reload nginx"
```

### Automate Lego Renewal

```bash
sudo nano /etc/systemd/system/lego-renew.service
```

```ini
[Unit]
Description=Lego Certificate Renewal
After=network.target

[Service]
Type=oneshot
Environment="CF_DNS_API_TOKEN=your_token"
ExecStart=/usr/local/bin/lego \
    --email admin@example.com \
    --domains example.com \
    --dns cloudflare \
    --path /etc/lego \
    renew \
    --renew-hook "systemctl reload nginx"
```

```bash
sudo nano /etc/systemd/system/lego-renew.timer
```

```ini
[Unit]
Description=Run Lego certificate renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lego-renew.timer
```

## acme.sh

acme.sh is a pure shell script that requires no runtime dependencies. It is ideal for minimal environments, embedded systems, and servers where you prefer no Python or Go.

### Install acme.sh

```bash
# Install as root or a dedicated user
curl https://get.acme.sh | sh -s email=admin@example.com

# Reload shell to get the acme.sh alias
source ~/.bashrc

# Or run directly
~/.acme.sh/acme.sh --version
```

### Obtain a Certificate with acme.sh

```bash
# HTTP challenge (requires port 80)
~/.acme.sh/acme.sh --issue -d example.com -d www.example.com --webroot /var/www/html

# Or standalone mode (temporarily binds to port 80)
~/.acme.sh/acme.sh --issue -d example.com --standalone
```

### DNS Challenge with acme.sh

```bash
# acme.sh supports 150+ DNS providers
# Cloudflare example
export CF_Token="your_token"
export CF_Account_ID="your_account_id"

~/.acme.sh/acme.sh --issue --dns dns_cf -d example.com -d "*.example.com"

# Route53 (AWS)
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"

~/.acme.sh/acme.sh --issue --dns dns_aws -d example.com

# Check supported providers
~/.acme.sh/acme.sh --list-dns-providers 2>/dev/null | head -20
```

### Install Certificate to a Target Location

```bash
# acme.sh stores certs in ~/.acme.sh/ by default
# Install them to where your webserver expects them

~/.acme.sh/acme.sh --install-cert -d example.com \
    --cert-file /etc/ssl/certs/example.com.crt \
    --key-file /etc/ssl/private/example.com.key \
    --fullchain-file /etc/ssl/certs/example.com-fullchain.crt \
    --reloadcmd "systemctl reload nginx"
```

### List and Renew acme.sh Certificates

```bash
# List managed certificates
~/.acme.sh/acme.sh --list

# Manually renew a certificate
~/.acme.sh/acme.sh --renew -d example.com

# Force renewal
~/.acme.sh/acme.sh --renew -d example.com --force

# Check the renewal cron job (auto-installed)
crontab -l | grep acme
```

## Choosing the Right Client

**Use Certbot when:**
- Running Apache or Nginx and want automatic config editing
- You want deep Ubuntu system integration with systemd
- You are new to ACME and want good documentation and community support

**Use Lego when:**
- Deploying in Docker containers or CI/CD pipelines
- You want a single binary with no system dependencies
- You need a wide range of DNS providers in a clean API format

**Use acme.sh when:**
- Working on minimal servers without Python or Go available
- You want no package manager dependencies
- You need the largest selection of DNS providers
- You prefer shell script over compiled binaries for auditability

All three clients support the same ACME protocol, so certificates obtained by any of them work identically with any web server. The choice comes down to your operational preferences and environment constraints.

## Check Certificate Details (Any Client)

After obtaining a certificate with any client, verify it with standard OpenSSL tools:

```bash
# Check certificate from a file
sudo openssl x509 -in /etc/letsencrypt/live/example.com/cert.pem \
    -noout -text | grep -E 'Subject|DNS:|Not After'

# Check what the server is actually serving
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | \
    openssl x509 -noout -dates -subject

# Check days until expiry
EXPIRY=$(echo | openssl s_client -connect example.com:443 2>/dev/null | \
    openssl x509 -noout -enddate | cut -d= -f2)
echo "Expires: $EXPIRY"
echo "Days left: $(( ( $(date -d "$EXPIRY" +%s) - $(date +%s) ) / 86400 ))"
```
