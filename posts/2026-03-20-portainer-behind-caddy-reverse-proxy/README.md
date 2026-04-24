# How to Set Up Portainer Behind Caddy Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Caddy, Reverse Proxy, HTTPS

Description: Use Caddy as a reverse proxy for Portainer with automatic HTTPS certificate management and a minimal configuration file.

## Introduction

Caddy is renowned for its simplicity - it automatically obtains and renews TLS certificates from Let's Encrypt with zero configuration. Setting up Portainer behind Caddy takes just a few lines in a Caddyfile, making it an excellent choice for teams who want HTTPS without complexity.

## Prerequisites

- Docker and Docker Compose installed
- A domain pointing to your server (Caddy uses it for ACME challenges)
- Ports 80 and 443 open

## Step 1: Create the Caddyfile

Create `caddy/Caddyfile`:

```caddyfile
# Caddy automatically handles HTTPS - just provide the domain

portainer.example.com {
    # Reverse proxy to Portainer's HTTPS port
    reverse_proxy portainer:9443 {
        # Skip verification of Portainer's self-signed upstream certificate
        transport http {
            tls_insecure_skip_verify
        }
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
    }
}
```

Alternatively, if Portainer is started with `--http-enabled`:

```caddyfile
portainer.example.com {
    # Proxy to HTTP port - simpler, no TLS verification needed
    reverse_proxy portainer:9000
}
```

## Step 2: Create the Docker Compose File

```yaml
services:
  caddy:
    image: caddy:2-alpine
    container_name: caddy
    restart: always
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"   # HTTP/3 support
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data       # Stores certificates
      - caddy_config:/config   # Stores Caddy config
    networks:
      - proxy

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - proxy
    command:
      - "--trusted-origins=portainer.example.com"

networks:
  proxy:
    driver: bridge

volumes:
  portainer_data:
  caddy_data:
  caddy_config:
```

## Step 3: Deploy the Stack

```bash
# Start both services
docker compose up -d

# Watch Caddy obtain the certificate (takes 30-60 seconds)
docker logs caddy --follow

# Once you see "certificate obtained", verify HTTPS
curl -I https://portainer.example.com
```

## Step 4: Validate the Setup

```bash
# Validate the Caddyfile syntax
docker exec caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile

# Reload Caddy config without restart
docker exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile

# View Caddy runtime logs
docker logs caddy --tail 50
```

## Using Caddy with Docker Labels (Automatic Discovery)

For a more dynamic setup, use a `caddy-docker-proxy` image instead of plain `caddy:2-alpine`, then add labels like:

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    labels:
      caddy: portainer.example.com
      caddy.reverse_proxy: "{{upstreams 9443}}"
      caddy.reverse_proxy.transport: http
      caddy.reverse_proxy.transport.tls_insecure_skip_verify: ""
```

## Troubleshooting

**Certificate not obtained**: Ensure DNS is pointing to your server and ports 80/443 are accessible. Caddy's automatic HTTPS can use the HTTP-01 challenge on port 80 and the TLS-ALPN-01 challenge on port 443.

**Trusted origins error**: Add `--trusted-origins=portainer.example.com` to Portainer's command.

**Caddy using staging certificates**: Check the Caddy logs for ACME errors. During retries with Let's Encrypt, Caddy can switch to the staging environment to avoid rate-limit problems, so fix the underlying issuance issue and let Caddy retry.

## Conclusion

Caddy makes HTTPS with reverse proxying trivially simple. A three-line Caddyfile gives you automatic certificate management, HTTP/2, and proper proxy headers. For teams wanting the simplest possible setup with automatic TLS, Caddy is often the best choice.
