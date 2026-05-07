# How to Configure ACME DNS-01 Challenge with IPv6 DNS Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACME, DNS-01, IPv6, Let's Encrypt, TLS, DNS, Wildcard Certificate

Description: Configure ACME DNS-01 domain validation challenges using IPv6-capable DNS servers to obtain TLS certificates without requiring inbound HTTP access.

---

The DNS-01 challenge is the most flexible ACME validation method - it requires no inbound HTTP access, making it ideal for IPv6-only servers, internal services, and wildcard certificate issuance. Validation happens entirely through DNS TXT records.

## Why DNS-01 is Best for IPv6-Only Environments

```text
DNS-01 Validation Flow:
Client creates TXT record → Let's Encrypt queries DNS → Certificate issued
No inbound HTTP access needed → Useful for IPv6-only services
```

Unlike HTTP-01, Let's Encrypt validates control by querying DNS TXT records. Your application server needs no open inbound HTTP ports.

## Prerequisites: DNS Provider API Access

For automated issuance and renewal, DNS-01 requires programmatic DNS record creation. Gather your DNS provider API credentials:

```bash
# Example: Check installed certbot DNS plugins
certbot plugins

# Install the plugin for your provider
pip3 install certbot-dns-cloudflare    # Cloudflare
pip3 install certbot-dns-route53       # AWS Route 53
pip3 install certbot-dns-google        # Google Cloud DNS
pip3 install certbot-dns-digitalocean  # DigitalOcean
pip3 install certbot-dns-rfc2136       # RFC 2136 / BIND-compatible DNS
```

## Configuring Cloudflare DNS-01

Create an API token with DNS edit permissions for your zone:

```bash
# Store Cloudflare credentials securely
sudo mkdir -p /etc/letsencrypt/secrets
sudo tee /etc/letsencrypt/secrets/cloudflare.ini > /dev/null << 'EOF'
# Cloudflare API token with Zone:DNS:Edit permission
dns_cloudflare_api_token = your_cloudflare_api_token_here
EOF

# Restrict file permissions (certbot warns if this is too permissive)
sudo chmod 600 /etc/letsencrypt/secrets/cloudflare.ini
sudo chown root:root /etc/letsencrypt/secrets/cloudflare.ini
```

Obtain a certificate (including wildcard support):

```bash
# Standard certificate
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/secrets/cloudflare.ini \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos

# Wildcard certificate (DNS-01 only)
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/secrets/cloudflare.ini \
  --domain "*.yourdomain.example.com" \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos
```

## Configuring AWS Route 53 DNS-01

Route 53 uses IAM permissions rather than API keys:

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
      "Action": [
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "arn:aws:route53:::hostedzone/YOUR_ZONE_ID"
    }
  ]
}
```

```bash
# Configure AWS credentials for the account that will run certbot
sudo aws configure

# Obtain certificate via Route 53 DNS-01
sudo certbot certonly \
  --dns-route53 \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos
```

## Manual DNS-01 for Custom IPv6 DNS Servers

For custom or unsupported DNS providers, use manual mode:

```bash
# Run manual DNS-01 challenge
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  --domain yourdomain.example.com \
  --email admin@example.com \
  --agree-tos

# certbot will output something like:
# Please deploy a DNS TXT record under the name:
# _acme-challenge.yourdomain.example.com
# with the following value:
# <verification-token>
```

Create the TXT record on your IPv6 DNS server:

```text
# For BIND DNS server (named)
# Add to your zone file:
_acme-challenge.yourdomain.example.com. 300 IN TXT "verification-token-here"

# Reload the zone
sudo rndc reload yourdomain.example.com

# Verify the TXT record is visible
dig TXT _acme-challenge.yourdomain.example.com +short
```

## Using acme.sh with DNS-01 and IPv6

acme.sh is a lightweight alternative to certbot with built-in DNS API support:

```bash
# Install acme.sh
curl https://get.acme.sh | sh -s email=admin@example.com

# Set Cloudflare credentials
export CF_Token="your_cloudflare_api_token"

# Issue Let's Encrypt certificate via DNS-01
~/.acme.sh/acme.sh --issue \
  --server letsencrypt \
  --dns dns_cf \
  --domain yourdomain.example.com \
  --domain "*.yourdomain.example.com"

# acme.sh automatically handles renewal via cron
```

## Verifying DNS Propagation Before Validation

DNS-01 challenges can fail if DNS hasn't propagated when Let's Encrypt checks:

```bash
# Manually check TXT record through public IPv6 resolvers
# Google's DNS (IPv6 capable)
dig TXT _acme-challenge.yourdomain.example.com @2001:4860:4860::8888

# Cloudflare's DNS (IPv6 capable)
dig TXT _acme-challenge.yourdomain.example.com @2606:4700:4700::1111

# Add DNS propagation delay to certbot (default: 10 seconds)
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/secrets/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 60 \
  --domain yourdomain.example.com
```

DNS-01 challenges work independently of your server's IP version, making them the most reliable method for IPv6-only infrastructure and a requirement for wildcard certificate issuance.
