# How to Set Up Certbot with DNS Validation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Certbot, SSL, DNS, Let's Encrypt

Description: Configure Certbot on Ubuntu to use DNS-01 validation for obtaining wildcard SSL certificates and certificates without a running web server.

---

Certbot's DNS validation mode is the right choice when you need wildcard certificates, when your server isn't publicly accessible on port 80, or when you want to obtain certificates without touching your web server configuration at all. DNS-01 validation works by having Certbot add a TXT record to your DNS zone - the CA verifies you control the domain by looking up that record.

## Why DNS Validation

HTTP validation (the default Certbot mode) has limitations:

- Requires port 80 to be accessible from the internet
- Cannot issue wildcard certificates (`*.example.com`)
- Requires the web server to be running and serving from the right directory
- Doesn't work for internal services or development environments

DNS-01 validation solves all of these problems at the cost of requiring either API access to your DNS provider or a manual step to add TXT records.

## Installing Certbot

The snap version of Certbot is the current recommended installation method:

```bash
# Remove any apt-installed certbot first
sudo apt remove certbot

# Install via snap
sudo snap install --classic certbot

# Create symlink
sudo ln -s /snap/bin/certbot /usr/bin/certbot

# Verify
certbot --version
```

Alternatively, install from PPA for apt-managed installation:

```bash
sudo apt update
sudo apt install software-properties-common
sudo add-apt-repository ppa:certbot/certbot
sudo apt install certbot
```

## Manual DNS Validation

For a one-time certificate or when you don't have API access, use manual DNS validation:

```bash
certbot certonly \
    --manual \
    --preferred-challenges dns \
    -d example.com \
    -d '*.example.com'
```

Certbot will display a TXT record to add:

```
Please deploy a DNS TXT record under the name:

_acme-challenge.example.com

with the following value:

xKHFBXkLX9mGzNl-...

Press Enter to Continue
```

Add the TXT record in your DNS provider's control panel, wait for propagation, then press Enter. Verify propagation before proceeding:

```bash
# Verify TXT record is visible
dig +short TXT _acme-challenge.example.com
nslookup -type=TXT _acme-challenge.example.com 8.8.8.8
```

## Automated DNS Validation with DNS Plugins

Certbot has official plugins for major DNS providers. These plugins use provider APIs to add and remove TXT records automatically, enabling fully automated renewal.

### Cloudflare

```bash
# Install the Cloudflare plugin
sudo snap install certbot-dns-cloudflare

# Or via pip if using apt certbot
sudo apt install python3-certbot-dns-cloudflare
```

Create a credentials file:

```bash
sudo mkdir -p /etc/letsencrypt/
sudo nano /etc/letsencrypt/cloudflare.ini
```

```ini
# Cloudflare API token with Zone:DNS:Edit permissions
dns_cloudflare_api_token = your-api-token-here
```

```bash
sudo chmod 600 /etc/letsencrypt/cloudflare.ini
```

Issue the certificate:

```bash
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    -d example.com \
    -d '*.example.com' \
    --email admin@example.com \
    --agree-tos \
    --no-eff-email
```

### Route53 (AWS)

```bash
# Install plugin
sudo snap install certbot-dns-route53
# Or: sudo apt install python3-certbot-dns-route53
```

Configure AWS credentials:

```bash
sudo mkdir -p /root/.aws
sudo nano /root/.aws/credentials
```

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

The IAM policy for the Route53 user needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "route53:ListHostedZones",
                "route53:GetChange"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "route53:ChangeResourceRecordSets",
            "Resource": "arn:aws:route53:::hostedzone/YOUR_ZONE_ID"
        }
    ]
}
```

Issue the certificate:

```bash
sudo certbot certonly \
    --dns-route53 \
    -d example.com \
    -d '*.example.com' \
    --email admin@example.com \
    --agree-tos
```

### DigitalOcean

```bash
sudo snap install certbot-dns-digitalocean
# Or: sudo apt install python3-certbot-dns-digitalocean

sudo nano /etc/letsencrypt/digitalocean.ini
```

```ini
dns_digitalocean_token = your-digitalocean-api-token
```

```bash
sudo chmod 600 /etc/letsencrypt/digitalocean.ini

sudo certbot certonly \
    --dns-digitalocean \
    --dns-digitalocean-credentials /etc/letsencrypt/digitalocean.ini \
    -d example.com \
    -d '*.example.com'
```

### Other Providers

Certbot has official plugins for many providers:

```bash
# List available DNS plugins
snap find certbot-dns

# Common ones:
# certbot-dns-google (Google Cloud DNS)
# certbot-dns-azure (Azure DNS)
# certbot-dns-linode (Linode/Akamai)
# certbot-dns-ovh (OVH)
# certbot-dns-nsone (NS1)
```

## DNS Propagation Wait Time

Some DNS providers are slow to propagate. Certbot's DNS plugins default to waiting 10 seconds before checking. Increase this for slow providers:

```bash
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    --dns-cloudflare-propagation-seconds 30 \
    -d example.com \
    -d '*.example.com'
```

## Certificate Locations

After successful issuance, certificates are in `/etc/letsencrypt/live/example.com/`:

```bash
ls -la /etc/letsencrypt/live/example.com/
```

```
cert.pem        -> ../../archive/example.com/cert1.pem
chain.pem       -> ../../archive/example.com/chain1.pem
fullchain.pem   -> ../../archive/example.com/fullchain1.pem
privkey.pem     -> ../../archive/example.com/privkey1.pem
```

- `fullchain.pem`: Use this for most web servers (certificate + intermediate chain)
- `privkey.pem`: Private key - keep permissions strict (mode 600)
- `cert.pem`: Certificate only (rarely used directly)

## Configuring Nginx to Use the Certificate

```nginx
server {
    listen 443 ssl;
    server_name example.com *.example.com;

    # Certificate files
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Recommended SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    location / {
        # Your application config
    }
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Setting Up Automatic Renewal

Certbot installs a systemd timer for automatic renewal:

```bash
# Check timer status
sudo systemctl status snap.certbot.renew.timer
# Or for apt-installed certbot:
sudo systemctl status certbot.timer

# Test renewal dry run
sudo certbot renew --dry-run
```

For renewals to also reload your web server, add a deploy hook:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
#!/bin/bash
# Reload nginx after certificate renewal
systemctl reload nginx
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

The `deploy/` hook directory runs after each successful renewal. There's also:
- `pre/`: Runs before renewal attempt
- `post/`: Runs after renewal attempt (even if failed)

## Managing Multiple Certificates

```bash
# List all certificates
sudo certbot certificates

# Expand an existing certificate to add domains
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    --expand \
    -d example.com \
    -d www.example.com \
    -d api.example.com

# Revoke a certificate
sudo certbot revoke --cert-name example.com

# Delete a certificate (without revoking)
sudo certbot delete --cert-name example.com
```

## Troubleshooting

**Rate limit hit:**

Let's Encrypt allows 5 duplicate certificates per week. Use staging for testing:

```bash
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
    --staging \
    -d example.com \
    -d '*.example.com'
```

Staging certificates aren't trusted by browsers but don't count against rate limits.

**DNS TXT record not seen:**

```bash
# Check from multiple resolvers
dig +short TXT _acme-challenge.example.com @1.1.1.1
dig +short TXT _acme-challenge.example.com @8.8.8.8
```

**Check renewal logs:**

```bash
sudo journalctl -u snap.certbot.renew -n 50
# Or:
sudo cat /var/log/letsencrypt/letsencrypt.log | tail -100
```

## Summary

Certbot's DNS validation mode provides flexible certificate issuance that works independently of your web server configuration. With a DNS provider plugin, the entire process - including renewals - becomes fully automated. The wildcard certificate support is particularly valuable for infrastructure with many subdomains, as a single certificate covers all of them rather than requiring individual certificates for each service.
