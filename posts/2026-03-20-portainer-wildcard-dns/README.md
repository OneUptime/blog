# How to Set Up Wildcard DNS for Portainer Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DNS, Wildcard, Traefik, SSL

Description: Configure wildcard DNS records and wildcard SSL certificates to automatically cover all subdomains for Portainer-managed services.

## Introduction

Wildcard DNS allows a single DNS record (`*.example.com`) to match subdomains. Combined with a wildcard SSL certificate for `*.services.example.com`, this eliminates the need to create individual DNS records and certificates for each new service you deploy via Portainer. New services get automatic HTTPS access just by adding Traefik labels.

## How Wildcard DNS Works

A wildcard A record like `*.services.example.com → 192.168.1.50` means:
- `app.services.example.com` → resolves to `192.168.1.50`
- `db-admin.services.example.com` → resolves to `192.168.1.50`
- `new-service.services.example.com` → resolves to `192.168.1.50`

Your reverse proxy (Traefik) then routes each hostname to the correct container.

## Step 1: Create Wildcard DNS Record

```bash
# Using Cloudflare API

CF_ZONE_ID="your-zone-id"
CF_API_TOKEN="your-api-token"
SERVER_IP="203.0.113.10"

curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"A\",
    \"name\": \"*.services.example.com\",
    \"content\": \"$SERVER_IP\",
    \"ttl\": 300,
    \"proxied\": false
  }"

# Also add the root record because the wildcard does not cover services.example.com
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"A\",
    \"name\": \"services.example.com\",
    \"content\": \"$SERVER_IP\",
    \"ttl\": 300
  }"
```

## Step 2: Obtain Wildcard SSL Certificate

Let's Encrypt supports wildcard certificates via DNS-01 challenge. If Traefik is going to manage the certificate for you, create its ACME storage file first:

```bash
# Prepare persistent ACME storage for Traefik
mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json
```

Traefik requests the certificate automatically once the ACME resolver and `websecure` entry point below are configured.

## Step 3: Configure Traefik with Wildcard Certificates

```yaml
# traefik-stack.yml
version: '3.8'
services:
  traefik:
    image: traefik:v3.0
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      CF_DNS_API_TOKEN: "${CF_DNS_API_TOKEN}"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
      - ./traefik.yml:/etc/traefik/traefik.yml:ro
    networks:
      - proxy

networks:
  proxy:
    external: true
```

```yaml
# traefik.yml - static configuration
api:
  dashboard: true

providers:
  docker:
    exposedByDefault: false
    network: proxy

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: cloudflare
        domains:
          - main: services.example.com
            sans:
              - "*.services.example.com"

certificatesResolvers:
  cloudflare:
    acme:
      email: admin@example.com
      storage: /letsencrypt/acme.json
      dnsChallenge:
        provider: cloudflare
        resolvers:
          - "1.1.1.1:53"
          - "8.8.8.8:53"
```

## Step 4: Deploy Services Under Wildcard Domain

With wildcard DNS and certificates in place, deploying a new service is simple:

```yaml
# new-service-stack.yml
version: '3.8'
services:
  my-new-service:
    image: my-service:latest
    labels:
      - traefik.enable=true
      # Uses the wildcard cert configured on the websecure entry point
      - traefik.http.routers.my-service.rule=Host(`my-new-service.services.example.com`)
      - traefik.http.routers.my-service.entrypoints=websecure
      - traefik.http.services.my-service.loadbalancer.server.port=3000
    networks:
      - proxy

networks:
  proxy:
    external: true
```

## Step 5: Automatic Certificate Renewal

Traefik renews ACME certificates automatically. No separate `certbot` cron job or `systemd` timer is required when Traefik is handling certificate issuance and renewal.

## Testing Wildcard DNS

```bash
# Test DNS resolution
dig new-service.services.example.com
nslookup another-service.services.example.com

# Test HTTPS
curl -v https://new-service.services.example.com

# Verify certificate covers wildcard
echo | openssl s_client -servername new-service.services.example.com \
  -connect new-service.services.example.com:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -ext subjectAltName
```

## Conclusion

Wildcard DNS and certificates with Portainer and Traefik create a zero-configuration service discovery system. Every new service you deploy only needs a Traefik label with the desired subdomain-no DNS records to create, no certificates to request. This makes deploying new services a one-step process, perfect for rapid iteration and microservice architectures.
