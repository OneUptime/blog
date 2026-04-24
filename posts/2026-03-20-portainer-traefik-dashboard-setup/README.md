# How to Set Up Traefik Dashboard Alongside Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Dashboard, Monitoring, Security

Description: Learn how to deploy the Traefik dashboard alongside Portainer with secure authentication, HTTPS access, and IP-based access restrictions to monitor your reverse proxy configuration.

## Introduction

The Traefik dashboard provides a real-time view of your routers, services, middlewares, and providers - an essential tool when running Traefik alongside Portainer. The dashboard must be secured before exposing it, as it reveals your full routing configuration. This guide covers deploying the Traefik dashboard with basic auth, HTTPS, and optional IP restrictions.

## Prerequisites

- Traefik deployed with the proxy Docker network
- Portainer deployed on the same host
- A domain name for the Traefik dashboard (e.g., `traefik.example.com`)

## Step 1: Enable the Traefik Dashboard

```yaml
# traefik.yml

api:
  dashboard: true    # Enable the dashboard
  insecure: false    # Never use insecure mode in production (exposes on port 8080 without auth)
```

## Step 2: Generate Basic Auth Credentials

```bash
# Method 1: Using htpasswd (Apache tools)
sudo apt-get install -y apache2-utils
htpasswd -nb admin your-secure-password
# Output: admin:$apr1$xyz$HASHEDPASSWORD

# Method 2: Using Docker
docker run --rm httpd:alpine htpasswd -nbB admin your-secure-password
# Output: admin:$2y$05$BCRYPT_HASH

# Method 3: Using openssl
openssl passwd -apr1 your-secure-password
# Output: $apr1$xyz$HASHEDPASSWORD

# Note: In Docker Compose labels, escape $ signs with $$
# admin:$apr1$xyz$HASH → admin:$$apr1$$xyz$$HASH
```

## Step 3: Deploy Traefik with Dashboard Labels

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.6
    container_name: traefik
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    networks:
      - proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/localtime:/etc/localtime:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/traefik.yml:ro
      - /opt/traefik/data:/data
    labels:
      - "traefik.enable=true"

      # Dashboard router - HTTPS only
      - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.example.com`)"
      - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
      - "traefik.http.routers.traefik-dashboard.tls=true"
      - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"

      # Route to the internal Traefik API service
      - "traefik.http.routers.traefik-dashboard.service=api@internal"

      # Apply basic auth middleware
      - "traefik.http.routers.traefik-dashboard.middlewares=dashboard-auth"

      # Basic auth credentials (escape $ with $$)
      - "traefik.http.middlewares.dashboard-auth.basicauth.users=admin:$$apr1$$xyz$$HASHEDPASSWORD"

networks:
  proxy:
    name: proxy
    external: true
```

## Step 4: Add IP Allowlist for Additional Security

Restrict dashboard access to specific IP addresses or subnets:

```yaml
labels:
  # ... previous labels ...

  # Apply both auth and IP allowlist
  - "traefik.http.routers.traefik-dashboard.middlewares=dashboard-auth,ip-allowlist"

  # Allow only specific IPs (your office/VPN IP)
  - "traefik.http.middlewares.ip-allowlist.ipallowlist.sourcerange=192.168.1.0/24,10.0.0.0/8,203.0.113.50/32"
```

## Step 5: Deploy and Access the Dashboard

```bash
cd /opt/traefik
docker compose up -d

# Watch Traefik start
docker logs traefik --follow

# Test dashboard access
curl -u admin:your-secure-password https://traefik.example.com/dashboard/

# Expected: Traefik dashboard HTML
```

## Step 6: Dashboard Features Overview

The Traefik dashboard shows:

```bash
HTTP Section:
  Routers    - All configured routing rules with their status (enabled/warning/disabled)
  Services   - Backend services and their load balancer configuration
  Middlewares - Auth, rate limiting, header manipulation, etc.

TCP Section:
  Routers    - TCP routing rules (for non-HTTP services)
  Services   - TCP backend services

UDP Section:
  Routers, Services (UDP routing)

Providers:
  Docker    - Containers discovered via Docker socket
  File      - Dynamic configuration from the file provider
  Kubernetes - K8s Ingress/CRD resources (if applicable)
```

## Step 7: Access Dashboard API for Automation

```bash
TRAEFIK_URL="https://traefik.example.com"
AUTH="admin:your-secure-password"

# List all HTTP routers
curl -s -u "$AUTH" "${TRAEFIK_URL}/api/http/routers" | jq '.[] | {name: .name, rule: .rule, status: .status}'

# Find routers with warnings or errors
curl -s -u "$AUTH" "${TRAEFIK_URL}/api/http/routers" | jq '.[] | select(.status != "enabled") | {name: .name, status: .status, error: .error}'

# List all services
curl -s -u "$AUTH" "${TRAEFIK_URL}/api/http/services" | jq '.[].name'

# Check enabled providers
curl -s -u "$AUTH" "${TRAEFIK_URL}/api/overview" | jq '.providers'
```

## Conclusion

The Traefik dashboard is a critical observability tool when running Traefik alongside Portainer. Secure it with basic auth at minimum, add IP allowlisting for additional protection, and always serve it over HTTPS. The dashboard API is also useful for automated monitoring - you can script alerts when routers leave the enabled state or when expected services are missing from the routing table.
