# How to Configure Automatic HTTPS with Traefik and Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, HTTPS, Let's Encrypt, TLS

Description: Learn how to configure automatic HTTPS certificate management using Traefik's ACME integration so Portainer and all your containers get valid TLS certificates automatically.

## Overview

Traefik integrates with Let's Encrypt to automatically issue and renew TLS certificates for all your containerized services. Combined with Portainer, you get a management dashboard that's accessible only over HTTPS without any manual certificate work.

## How Traefik ACME Works

```text
Browser → Traefik (443) → Checks certificate store
                        → If missing: ACME challenge → Let's Encrypt
                        → Issues cert → Stores in acme.json
                        → Proxies to backend service
```

## ACME Challenge Methods

Traefik supports multiple ACME challenge types. The two most common for this setup are:

| Method | Requirements | Use Case |
|--------|-------------|----------|
| HTTP Challenge | Port 80 accessible from internet | Most common, simple setup |
| DNS Challenge | DNS API access | Wildcard certs, servers behind NAT |

## HTTP Challenge Configuration

```yaml
# traefik.yml

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /data/acme.json
      httpChallenge:
        entryPoint: web    # Use port 80 for the challenge
```

## DNS Challenge Configuration (for Wildcard Certs)

```yaml
# traefik.yml - DNS challenge with Cloudflare
certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@yourdomain.com
      storage: /data/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

```yaml
# docker-compose.yml - pass Cloudflare credentials
services:
  traefik:
    image: traefik:v3.0
    environment:
      - CF_API_EMAIL=admin@yourdomain.com
      - CF_API_KEY=${CLOUDFLARE_API_KEY}
    volumes:
      - /opt/traefik/data:/data
```

## Configuring Portainer for HTTPS

Apply these labels to the Portainer container:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.yourdomain.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      # Enable TLS
      - "traefik.http.routers.portainer.tls=true"
      # Use the ACME resolver
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
```

## Wildcard Certificate for All Subdomains

```yaml
labels:
  # Single wildcard cert covers all subdomains
  - "traefik.http.routers.portainer.tls.domains[0].main=yourdomain.com"
  - "traefik.http.routers.portainer.tls.domains[0].sans=*.yourdomain.com"
```

## Verifying Certificate Issuance

```bash
# Watch Traefik logs for certificate activity
docker logs traefik --follow | grep -i "acme\|certificate\|error"

# Check acme.json has been populated
cat /opt/traefik/data/acme.json | jq '.letsencrypt.Certificates | length'

# Verify certificate details
echo | openssl s_client -servername portainer.yourdomain.com \
  -connect portainer.yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer
```

## Automatic Renewal

Traefik automatically renews certificates 30 days before expiration. No cron jobs or manual intervention required.

```bash
# Check certificate expiration
echo | openssl s_client -servername portainer.yourdomain.com \
  -connect portainer.yourdomain.com:443 2>/dev/null | \
  openssl x509 -noout -enddate
# notAfter=Jun 17 00:00:00 2026 GMT
```

## Troubleshooting Certificate Issues

```bash
# Check for ACME rate limiting (for example, 50 certificates per registered domain every 7 days)
docker logs traefik 2>&1 | grep -i "rate limit"

# Use Let's Encrypt staging for testing
# caServer: https://acme-staging-v02.api.letsencrypt.org/directory

# Verify port 80 is accessible
curl -I http://portainer.yourdomain.com
```

## Conclusion

Traefik's ACME integration eliminates manual certificate management entirely. Once configured, every service deployed through Portainer can get a valid HTTPS certificate by simply adding a `tls.certresolver` label - no certificate renewal reminders, no manual uploads, and no expired certificates.
