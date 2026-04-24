# How to Set Up Split DNS for Portainer Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DNS, Networking, Split DNS, Infrastructure

Description: Configure split DNS to allow Portainer-managed services to resolve differently for internal and external users using the same domain names.

## Introduction

Split DNS (also called split-horizon DNS) allows the same hostname to resolve to different IP addresses depending on the client's location. For Portainer-managed services, this means internal users get private IPs while external users get public IPs-without changing application URLs.

## Prerequisites

- Portainer managing Docker or Kubernetes workloads
- An internal DNS server (Pi-hole, AdGuard, BIND, or Windows DNS)
- A public DNS provider (Cloudflare, Route53, etc.)
- Reverse proxy (Nginx, Traefik, or Caddy)

## Architecture

```text
External Users → Public DNS → Public IP → Reverse Proxy → Container
Internal Users → Private DNS → Private IP → Reverse Proxy → Container
```

## Step 1: Set Up Internal DNS

### Using BIND9

```bash
# Install BIND9

sudo apt-get install -y bind9 bind9utils

# Create internal zone file
sudo mkdir -p /etc/bind/zones
sudo tee /etc/bind/zones/db.example.com << 'EOF'
$TTL    3600
@       IN      SOA     ns1.example.com. admin.example.com. (
                     2026032001  ; Serial
                         3600    ; Refresh
                          900    ; Retry
                        86400    ; Expire
                          300 )  ; Negative Cache TTL

; Name servers
@       IN      NS      ns1.example.com.
ns1     IN      A       192.168.1.10

; Portainer and services - internal IPs
portainer       IN      A       192.168.1.50
app             IN      A       192.168.1.51
api             IN      A       192.168.1.52
db-admin        IN      A       192.168.1.53

; Wildcard for all services
*               IN      A       192.168.1.50
EOF

# Configure BIND to serve internal zone
sudo tee -a /etc/bind/named.conf.local << 'EOF'
zone "example.com" {
    type master;
    file "/etc/bind/zones/db.example.com";
};
EOF

sudo systemctl restart bind9
```

### Using Pi-hole for Internal DNS

```bash
# Add local DNS records in Pi-hole
# In the Pi-hole web interface, add local DNS records for:

# portainer.example.com -> 192.168.1.50
# app.example.com -> 192.168.1.51

# Or add via the Pi-hole CLI
sudo pihole-FTL --config dns.hosts '[ "192.168.1.50 portainer.example.com", "192.168.1.51 app.example.com" ]'
```

## Step 2: Configure Public DNS

```bash
# In Cloudflare (or your DNS provider):
# portainer.example.com -> PUBLIC-IP (A record)
# app.example.com -> PUBLIC-IP (A record)

# Using Cloudflare API
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "A",
    "name": "portainer.example.com",
    "content": "PUBLIC_IP",
    "ttl": 300,
    "proxied": false
  }'
```

## Step 3: Configure Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/portainer-services
# This config runs on both internal and external servers

server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate /etc/ssl/certs/portainer.crt;
    ssl_certificate_key /etc/ssl/private/portainer.key;

    location / {
        proxy_pass https://127.0.0.1:9443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_certificate /etc/ssl/certs/app.crt;
    ssl_certificate_key /etc/ssl/private/app.key;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Step 4: Configure Internal Network Resolution in Containers

Portainer-managed containers can resolve internal services:

```yaml
# compose.yaml with custom DNS
services:
  app:
    image: myapp:latest
    dns:
      - 192.168.1.10   # Internal DNS server
      - 8.8.8.8        # Fallback to public DNS
    environment:
      - API_URL=https://api.example.com
```

## Step 5: Configure Docker's Default DNS

```bash
# Set default DNS for all Docker containers
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "dns": ["192.168.1.10", "8.8.8.8"],
  "dns-search": ["example.com"]
}
EOF

sudo systemctl restart docker
```

## Testing Split DNS

```bash
# From internal network - should return private IP
dig portainer.example.com @192.168.1.10

# From external network - should return public IP
dig portainer.example.com @8.8.8.8

# Test from inside a container
docker run --rm alpine nslookup portainer.example.com
```

## Conclusion

Split DNS for Portainer services ensures optimal routing for both internal and external users while keeping URLs consistent. Internal users get direct access to private IPs (lower latency, no bandwidth costs), while external users route through the public internet. Combine with TLS certificates for a complete, secure multi-network setup.
