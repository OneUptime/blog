# How to Set Up Let's Encrypt ACME with Traefik for Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Let's Encrypt, ACME, TLS

Description: Learn how to configure Traefik's ACME client to obtain and auto-renew Let's Encrypt certificates for Portainer, covering both HTTP and DNS challenge methods with rate limit awareness.

## Introduction

Let's Encrypt provides free, trusted TLS certificates that Traefik can obtain and renew automatically through its built-in ACME client. This eliminates manual certificate management and ensures your Portainer installation and all managed services always have valid HTTPS. This guide covers the full ACME setup including multiple resolvers, DNS challenge providers, and rate limit strategies.

## Prerequisites

- Traefik deployed with a writable volume for certificate storage
- Domain DNS pointing to your server
- Port 80 accessible from the internet (HTTP challenge) OR DNS provider API credentials (DNS challenge)
- Valid email address for Let's Encrypt registration

## Step 1: Understanding ACME Challenge Types

Let's Encrypt verifies domain ownership using challenges:

```text
HTTP Challenge (httpChallenge):
  - Let's Encrypt sends GET /.well-known/acme-challenge/{token} to your server on port 80
  - Requires port 80 open to the internet
  - Works for non-wildcard certificates (including multi-domain certs)
  - Simplest to set up

DNS Challenge (dnsChallenge):
  - Traefik creates a TXT record _acme-challenge.example.com in your DNS
  - Works for wildcard certificates (*.example.com)
  - Works for private/internal servers (no port 80 needed)
  - Requires DNS provider API credentials
```

## Step 2: Configure Multiple Certificate Resolvers

Define both staging and production resolvers to avoid rate limits during testing:

```yaml
# traefik.yml

certificatesResolvers:
  # Staging resolver for testing (much higher rate limits, certs not trusted)
  letsencrypt-staging:
    acme:
      email: admin@example.com
      storage: /data/acme-staging.json
      caServer: "https://acme-staging-v02.api.letsencrypt.org/directory"
      httpChallenge:
        entryPoint: web

  # Production resolver (subject to Let's Encrypt production rate limits)
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /data/acme.json
      httpChallenge:
        entryPoint: web

  # DNS challenge resolver for wildcards
  letsencrypt-dns:
    acme:
      email: admin@example.com
      storage: /data/acme-dns.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
        delayBeforeCheck: 30    # Seconds to wait for DNS propagation
```

## Step 3: DNS Challenge Provider Configuration

Set environment variables for your DNS provider. Traefik supports many DNS providers:

```yaml
# docker-compose.yml - Cloudflare DNS provider
services:
  traefik:
    image: traefik:v3.0
    environment:
      # Cloudflare (recommended: use API Token, not Global Key)
      CF_DNS_API_TOKEN: "your-cloudflare-api-token"
      # CF_API_EMAIL: "admin@example.com"    # Needed for Global Key only
      # CF_API_KEY: "your-global-api-key"    # Use API Token instead

      # AWS Route53 alternative
      # AWS_ACCESS_KEY_ID: "your-key-id"
      # AWS_SECRET_ACCESS_KEY: "your-secret"
      # AWS_REGION: "us-east-1"

      # DigitalOcean alternative
      # DO_AUTH_TOKEN: "your-do-token"
```

```bash
# Create minimal Cloudflare API Token with:
#   - Zone / Zone / Read
#   - Zone / DNS / Edit
# Go to: cloudflare.com → My Profile → API Tokens → Create Token
# Template: Edit zone DNS
# Zone Resources: Include → Specific zone → your-domain.com
```

## Step 4: Wildcard Certificate Configuration

```yaml
# Portainer service with wildcard certificate
services:
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt-dns"    # DNS resolver required for wildcards
      # Request wildcard certificate
      - "traefik.http.routers.portainer.tls.domains[0].main=example.com"
      - "traefik.http.routers.portainer.tls.domains[0].sans=*.example.com"
```

## Step 5: Certificate Storage and Backup

```bash
# The acme.json file contains all certificates and private keys
# Protect it carefully

# Set required permissions
chmod 600 /opt/traefik/data/acme.json

# Back up certificates regularly
cp /opt/traefik/data/acme.json /backup/acme-$(date +%Y%m%d).json

# View certificate contents (for debugging)
cat /opt/traefik/data/acme.json | python3 -c "
import sys, json, base64
data = json.load(sys.stdin)
for resolver, certs in data.items():
    for cert in certs.get('Certificates', []):
        print(f\"Domain: {cert['domain']['main']}\")
        cert_bytes = base64.b64decode(cert['certificate'])
        print(f\"Cert length: {len(cert_bytes)} bytes\")
"
```

## Step 6: Handle Certificate Renewal

Traefik renews certificates automatically 30 days before expiry. Verify renewal is working:

```bash
# Check certificate expiry
echo | openssl s_client -servername portainer.example.com \
  -connect portainer.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected: notAfter is 90 days from issuance (Let's Encrypt cert lifetime)
# Traefik renews at 30 days remaining

# Force re-issuance (for testing - use staging)
# Stop Traefik, delete the cert entry from acme.json, restart Traefik
docker stop traefik
# Edit acme.json and remove the certificate entry for your domain
docker start traefik
# Traefik will request it again if the router still needs it
```

## Step 7: Troubleshoot ACME Issues

```bash
# Enable debug logging for ACME
# In traefik.yml:
log:
  level: DEBUG

# Watch for ACME-related log messages
docker logs traefik 2>&1 | grep -i "acme\|certificate\|challenge\|error"

# Common issues:
# "Unable to obtain certificate" → Port 80 blocked or DNS not propagated
# "Too many certificates" → Hit rate limit, wait or use staging
# "Connection refused" → Traefik not reachable on port 80 for HTTP challenge
# "File not found" → acme.json permissions wrong or directory not mounted

# Test HTTP challenge manually
curl http://portainer.example.com/.well-known/acme-challenge/test
# Should return a Traefik HTTP response such as 404 or a redirect, not connection refused
```

## Conclusion

Traefik's ACME client with Let's Encrypt eliminates manual TLS certificate management for Portainer and all managed services. Use the staging ACME server during initial setup to avoid rate limits, graduate to production once verified, and use DNS challenge when you need wildcards or work with private servers. Regular backups of the `acme.json` file ensure you can restore certificates if needed, though Traefik will automatically re-obtain new ones if the file is lost.
