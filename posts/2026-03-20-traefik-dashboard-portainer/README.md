# How to Set Up Traefik Dashboard Alongside Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Dashboard, Monitoring, Security

Description: Learn how to enable and secure the Traefik dashboard alongside Portainer, giving you visibility into routes, services, middlewares, and certificate status.

## What the Traefik Dashboard Shows

The Traefik dashboard provides real-time visibility into:

- Active routers and their rules
- Backend services and health status
- Middlewares in use
- TLS certificates and their domains
- Entry points and their configurations

## Enabling the Dashboard

In your Traefik static configuration:

```yaml
# traefik.yml

api:
  dashboard: true   # Enable the dashboard
  insecure: false   # Never expose without authentication
```

Or via CLI flags:

```bash
--api.dashboard=true
--api.insecure=false
```

## Securing the Dashboard with Basic Auth

Always protect the dashboard behind authentication. Generate a bcrypt password hash:

```bash
# Install htpasswd (apache2-utils)
apt install apache2-utils

# Generate bcrypt password hash (replace 'admin')
htpasswd -nB admin
# Output: admin:$2y$05$xyz...

# Escape $ signs in Docker labels by doubling them: $ → $$
```

## Dashboard Labels for Docker Compose

```yaml
# docker-compose.yml
services:
  traefik:
    image: traefik:v3.0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/traefik/traefik.yml:/traefik.yml:ro
      - /opt/traefik/data:/data
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      # Dashboard router
      - "traefik.http.routers.dashboard.rule=Host(`traefik.yourdomain.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls=true"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.dashboard.service=api@internal"
      # Basic auth middleware
      - "traefik.http.middlewares.dashboard-auth.basicauth.users=admin:$$2y$$05$$HASHHERE"
      - "traefik.http.routers.dashboard.middlewares=dashboard-auth"
```

## IP Allowlist for Extra Security

Restrict dashboard access to specific IP ranges:

```yaml
labels:
  # Allow only these IPs
  - "traefik.http.middlewares.ip-allowlist.ipallowlist.sourcerange=192.168.1.0/24,10.0.0.0/8"
  # Chain auth + ip-allowlist
  - "traefik.http.routers.dashboard.middlewares=dashboard-auth,ip-allowlist"
```

## Portainer and Traefik Dashboard Side by Side

```yaml
# Both accessible via clean subdomains
services:
  traefik:
    image: traefik:v3.0
    # ... (configuration above)

  portainer:
    image: portainer/portainer-ce:latest
    networks:
      - proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.yourdomain.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  proxy:
    name: proxy

volumes:
  portainer_data:
```

## Accessing the Dashboard

Once deployed:

1. Visit `https://traefik.yourdomain.com/dashboard/` - Traefik dashboard
2. Visit `https://portainer.yourdomain.com` - Portainer UI
3. Both are HTTPS with valid Let's Encrypt certificates

## Checking Dashboard via API

```bash
# List all HTTP routers (requires dashboard auth)
curl -u admin:yourpassword https://traefik.yourdomain.com/api/http/routers | jq '.[] | .name'

# Check a specific service
curl -u admin:yourpassword https://traefik.yourdomain.com/api/http/services/portainer@docker
```

## Conclusion

The Traefik dashboard is a valuable companion to Portainer - while Portainer shows you the container state, the Traefik dashboard shows you the network routing state. Securing both behind basic auth and HTTPS ensures your management plane is protected from unauthorized access.
