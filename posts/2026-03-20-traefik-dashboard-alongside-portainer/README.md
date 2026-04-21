# How to Run the Traefik Dashboard Alongside Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Traefik, Portainer, Docker, Dashboard, Reverse Proxy, Monitoring

Description: Learn how to deploy Traefik as a reverse proxy with its dashboard enabled alongside Portainer, securing both interfaces with authentication and HTTPS.

## Introduction

Running the Traefik dashboard alongside Portainer gives you visibility into your reverse proxy routing alongside your container management interface. This guide shows how to configure both services in a single Docker Compose stack.

## Docker Compose Configuration

```yaml
services:
  traefik:
    image: traefik:v3.6
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/certs
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.example.com`) && (PathPrefix(`/api`) || PathPrefix(`/dashboard`))"
      - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
      - "traefik.http.routers.traefik-dashboard.tls=true"
      - "traefik.http.routers.traefik-dashboard.service=api@internal"
      - "traefik.http.routers.traefik-dashboard.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$H6uskkkW$$bt.NuB5KexSb229ZuoK13/"
    networks:
      - proxy

  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"
    networks:
      - proxy

volumes:
  portainer_data:
  traefik_certs:

networks:
  proxy:
    driver: bridge
```

## Generating htpasswd for Dashboard Auth

```bash
# Install apache2-utils if needed

apt install apache2-utils

# Generate hashed password
htpasswd -nbm admin yourpassword
# Output: admin:$apr1$...

# In docker-compose, escape $ as $$
```

## Starting the Stack

```bash
docker compose up -d
```

## Accessing the Dashboards

- Traefik Dashboard: `https://traefik.example.com/dashboard/`
- Portainer: `https://portainer.example.com`

## Verifying Routes

The Traefik dashboard shows all configured routes. After startup, navigate to the HTTP Routers section to verify both `traefik-dashboard` and `portainer` routes appear as expected.

## Adding Let's Encrypt SSL

```yaml
command:
  - "--certificatesresolvers.letsencrypt.acme.email=you@example.com"
  - "--certificatesresolvers.letsencrypt.acme.storage=/certs/acme.json"
  - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
```

Then add to each router label:

```yaml
- "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
- "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
```

## Conclusion

Running Traefik's dashboard alongside Portainer in the same Docker Compose stack gives you a complete management interface for both your reverse proxy and containers. Securing the Traefik dashboard with basic auth and HTTPS prevents unauthorized access to your routing configuration.
