# How to Configure Automatic HTTPS with Traefik and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, HTTPS, Let's Encrypt, TLS

Description: Learn how to configure automatic HTTPS certificate management using Traefik's built-in ACME client alongside Portainer for zero-touch TLS on all your containerized services.

## Introduction

Traefik's built-in ACME (Automatic Certificate Management Environment) client integrates directly with Let's Encrypt to provision and renew TLS certificates automatically. When combined with Portainer, every service you deploy can get HTTPS with just a few labels - no manual certificate management required. This guide covers configuring Traefik's ACME resolver for HTTP and DNS challenges alongside Portainer.

## Prerequisites

- Docker and Docker Compose installed
- A domain name you control
- Port 80 and 443 open to the internet (for HTTP challenge) OR DNS provider API access (for DNS challenge)

## Step 1: Prepare the ACME Storage File

```bash
# Create directory structure

mkdir -p /opt/traefik/data

# Create the ACME certificate storage file with correct permissions
touch /opt/traefik/data/acme.json
chmod 600 /opt/traefik/data/acme.json    # Required by Traefik for ACME storage
```

## Step 2: Configure Traefik with HTTP Challenge

The HTTP challenge (httpChallenge) is the simplest method - Let's Encrypt sends a request to your server on port 80 to verify domain ownership.

```yaml
# /opt/traefik/traefik.yml
api:
  dashboard: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true    # 301 redirect
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com    # Used for renewal notifications
      storage: /data/acme.json
      httpChallenge:
        entryPoint: web    # Must be HTTP entrypoint on port 80

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: proxy

log:
  level: INFO
```

## Step 3: Configure DNS Challenge (Wildcard Certificates)

For wildcard certificates (`*.example.com`) or servers without port 80 access, use DNS challenge:

```yaml
# /opt/traefik/traefik.yml - DNS challenge variant
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /data/acme.json
      dnsChallenge:
        provider: cloudflare    # Your DNS provider
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
        delayBeforeCheck: 30    # Wait for DNS propagation
```

Supported DNS providers include Cloudflare, Route53, DigitalOcean, Namecheap, and many others. Each requires provider-specific environment variables.

## Step 4: Deploy Traefik and Portainer with ACME

```yaml
# /opt/traefik/docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    ports:
      - "80:80"
      - "443:443"
    # Uncomment for DNS challenge with Cloudflare:
    # environment:
    #   CF_API_EMAIL: your-email@example.com
    #   CF_API_KEY: your-cloudflare-api-key
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/traefik.yml:ro
      - /opt/traefik/data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls=true"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"    # Automatic cert
      - "traefik.http.routers.traefik.service=api@internal"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$xyz$$HASHHERE"
      - "traefik.http.routers.traefik.middlewares=auth"

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"    # Auto cert
      - "traefik.http.routers.portainer.service=portainer"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  proxy:
    name: proxy
    external: false

volumes:
  portainer_data:
```

## Step 5: Deploy and Verify Certificate Issuance

```bash
cd /opt/traefik

# Start the stack
docker compose up -d

# Watch Traefik logs for certificate issuance
docker logs traefik --follow 2>&1 | grep -i "acme\|cert\|letsencrypt"

# Expected output:
# time="..." level=info msg="Obtaining certificate for domains..."
# time="..." level=info msg="...acme: Obtained certificate..."
```

## Step 6: Configure Certificate for Multiple Domains (SANs)

To issue a single certificate covering multiple domains:

```yaml
labels:
  - "traefik.http.routers.myapp.tls.domains[0].main=example.com"
  - "traefik.http.routers.myapp.tls.domains[0].sans=www.example.com,api.example.com"
  - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
```

## Step 7: Use Staging Environment for Testing

Always test with Let's Encrypt staging to avoid rate limits:

```yaml
# traefik.yml - Staging resolver
certificatesResolvers:
  letsencrypt-staging:
    acme:
      email: your-email@example.com
      storage: /data/acme-staging.json
      caServer: https://acme-staging-v02.api.letsencrypt.org/directory    # Staging URL
      httpChallenge:
        entryPoint: web
```

```yaml
# In labels, use the staging resolver first
- "traefik.http.routers.portainer.tls.certresolver=letsencrypt-staging"

# Once confirmed working, switch to production resolver
- "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
```

## Step 8: Verify Certificate Details

```bash
# Check certificate is valid and from Let's Encrypt
echo | openssl s_client -servername portainer.example.com \
  -connect portainer.example.com:443 2>/dev/null | \
  openssl x509 -noout -dates -issuer -subject

# Check certificate renewal status in acme.json
cat /opt/traefik/data/acme.json | python3 -m json.tool | grep -A5 "portainer.example.com"

# Test HTTP to HTTPS redirect
curl -I http://portainer.example.com
# Expected: 301 Location: https://portainer.example.com
```

## Conclusion

Traefik's ACME integration makes automatic HTTPS a label-level concern for every service deployed through Portainer. The HTTP challenge works for internet-facing servers while the DNS challenge enables wildcard certificates and private deployments. Always test with the Let's Encrypt staging environment first to avoid production rate limits, and ensure your `acme.json` file has `chmod 600` permissions before starting Traefik.
