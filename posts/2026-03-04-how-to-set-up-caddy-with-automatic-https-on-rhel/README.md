# How to Set Up Caddy with Automatic HTTPS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Caddy, HTTPS, TLS, Let's Encrypt, Web Server

Description: Learn how to configure Caddy on RHEL for automatic HTTPS with Let's Encrypt, including wildcard certificates and custom certificate authorities.

---

Caddy's standout feature is automatic HTTPS. By default, every site configured with a domain name gets a TLS certificate from Let's Encrypt without any extra configuration. This post covers how to set up and customize this behavior.

## Installing Caddy

```bash
# Add the Caddy COPR repository
sudo dnf install -y dnf-plugins-core
sudo dnf copr enable @caddy/caddy -y
sudo dnf install -y caddy
```

## Basic Automatic HTTPS

Simply specify a domain name in your Caddyfile:

```bash
# /etc/caddy/Caddyfile
myapp.example.com {
    reverse_proxy localhost:3000
}
```

Caddy will automatically:
1. Obtain a TLS certificate from Let's Encrypt
2. Redirect HTTP to HTTPS
3. Renew the certificate before it expires

## DNS Challenge for Wildcard Certificates

For wildcard certificates, use the DNS challenge:

```bash
# Install Caddy with the Cloudflare DNS plugin
sudo caddy add-package github.com/caddy-dns/cloudflare
```

```bash
# /etc/caddy/Caddyfile
*.example.com {
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
    reverse_proxy localhost:3000
}
```

```bash
# Set the Cloudflare API token as an environment variable
# Add to /etc/systemd/system/caddy.service.d/override.conf
sudo mkdir -p /etc/systemd/system/caddy.service.d
cat << 'OVERRIDE' | sudo tee /etc/systemd/system/caddy.service.d/override.conf
[Service]
Environment="CF_API_TOKEN=your-cloudflare-api-token"
OVERRIDE

sudo systemctl daemon-reload
sudo systemctl restart caddy
```

## Using a Staging CA for Testing

```bash
# /etc/caddy/Caddyfile
myapp.example.com {
    tls {
        ca https://acme-staging-v02.api.letsencrypt.org/directory
    }
    reverse_proxy localhost:3000
}
```

## Internal HTTPS with Self-Signed Certificates

For internal services that do not need public certificates:

```bash
# /etc/caddy/Caddyfile
internal.local {
    tls internal
    reverse_proxy localhost:3000
}
```

## Verifying Certificate Status

```bash
# Check the certificate for a domain
curl -vI https://myapp.example.com 2>&1 | grep -A 5 "Server certificate"

# View Caddy's certificate storage
sudo ls /var/lib/caddy/.local/share/caddy/certificates/
```

## Firewall Requirements

```bash
# Ports 80 and 443 must be open for ACME challenges
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

Caddy stores certificates in `/var/lib/caddy/.local/share/caddy/`. The ACME HTTP challenge requires port 80 to be accessible from the internet. If port 80 is blocked, use the DNS challenge instead.
