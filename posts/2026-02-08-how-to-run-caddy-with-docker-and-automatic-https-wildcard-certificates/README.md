# How to Run Caddy with Docker and Automatic HTTPS (Wildcard Certificates)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Caddy, Web Servers, HTTPS, SSL, DevOps, Reverse Proxy

Description: Learn how to deploy Caddy web server in Docker with automatic HTTPS and wildcard certificate provisioning using Let's Encrypt and DNS challenges.

---

Caddy is a modern web server that handles HTTPS automatically. Unlike Nginx or Apache, Caddy provisions and renews TLS certificates without any manual intervention. When you combine Caddy with Docker, you get a portable, secure web server that can serve multiple domains with zero certificate management overhead.

This guide walks through running Caddy in Docker, configuring automatic HTTPS, and setting up wildcard certificates using DNS challenges.

## Why Caddy for HTTPS?

Most web servers require you to set up certbot, write renewal cron jobs, and configure certificate paths manually. Caddy does all of this out of the box. It integrates directly with Let's Encrypt (and ZeroSSL) to obtain certificates the moment a domain is requested.

Wildcard certificates cover all subdomains under a domain (e.g., `*.example.com`). These require DNS-01 challenges rather than HTTP-01 challenges, which means Caddy needs to create DNS records to prove domain ownership. Caddy supports this through DNS provider plugins.

## Running Caddy with Docker - Basic Setup

Start with a simple Caddy container that serves static files over HTTPS.

Create the project directory structure:

```bash
# Create project directories for Caddy configuration and site files
mkdir -p caddy-docker/{site,data,config}
cd caddy-docker
```

Create a basic Caddyfile that enables automatic HTTPS:

```
# Caddyfile - Caddy configuration for a single domain
example.com {
    root * /srv
    file_server
    encode gzip
}
```

Now set up the Docker Compose file to run Caddy:

```yaml
# docker-compose.yml - Basic Caddy setup with persistent certificate storage
version: "3.8"

services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"  # HTTP/3 support
    volumes:
      # Mount the Caddyfile configuration
      - ./Caddyfile:/etc/caddy/Caddyfile
      # Mount the site files to serve
      - ./site:/srv
      # Persist certificate data across container restarts
      - ./data:/data
      # Persist Caddy configuration state
      - ./config:/config
```

Start the container:

```bash
# Launch Caddy in detached mode
docker compose up -d
```

Caddy will automatically obtain a TLS certificate for `example.com` when the first request arrives. The certificates persist in the `./data` volume, so restarts do not trigger re-issuance.

## Building a Custom Caddy Image with DNS Provider Plugins

Wildcard certificates need DNS-01 challenges. The official Caddy Docker image does not include DNS provider modules, so you need to build a custom image.

Here is a Dockerfile that adds the Cloudflare DNS plugin:

```dockerfile
# Dockerfile - Custom Caddy build with Cloudflare DNS module
FROM caddy:2-builder AS builder

# Build Caddy with the Cloudflare DNS provider plugin
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

# Use the official Caddy image as the runtime base
FROM caddy:2-alpine

# Copy the custom-built Caddy binary
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

Build the custom image:

```bash
# Build the custom Caddy image with DNS plugin support
docker build -t caddy-cloudflare .
```

## Configuring Wildcard Certificates

With the DNS plugin in place, configure the Caddyfile for wildcard certificates:

```
# Caddyfile - Wildcard certificate configuration using Cloudflare DNS
# Define a reusable TLS configuration snippet
(cloudflare) {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
}

# Wildcard domain - matches all subdomains
*.example.com {
    import cloudflare

    # Route traffic based on subdomain
    @app host app.example.com
    handle @app {
        reverse_proxy app-service:3000
    }

    @api host api.example.com
    handle @api {
        reverse_proxy api-service:8080
    }

    # Default handler for unmatched subdomains
    handle {
        respond "Not found" 404
    }
}

# Also serve the apex domain
example.com {
    import cloudflare
    reverse_proxy web-service:3000
}
```

Update the Docker Compose file to use the custom image and pass the API token:

```yaml
# docker-compose.yml - Caddy with wildcard certificates via Cloudflare DNS
version: "3.8"

services:
  caddy:
    build: .
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      # Cloudflare API token with Zone:DNS:Edit permissions
      CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config

  # Example backend services
  app-service:
    image: node:20-alpine
    command: node server.js
    volumes:
      - ./app:/app
    working_dir: /app

  api-service:
    image: node:20-alpine
    command: node api.js
    volumes:
      - ./api:/app
    working_dir: /app

volumes:
  caddy_data:
  caddy_config:
```

Create a `.env` file with your Cloudflare API token:

```bash
# .env - Store sensitive tokens outside of version control
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token_here
```

## Using Other DNS Providers

Caddy supports many DNS providers. Here are the build commands for popular ones:

```dockerfile
# Dockerfile examples for different DNS providers

# For AWS Route53
RUN xcaddy build \
    --with github.com/caddy-dns/route53

# For DigitalOcean
RUN xcaddy build \
    --with github.com/caddy-dns/digitalocean

# For Google Cloud DNS
RUN xcaddy build \
    --with github.com/caddy-dns/googleclouddns
```

The Caddyfile syntax changes slightly for each provider. For Route53:

```
# Caddyfile snippet for AWS Route53 DNS challenge
*.example.com {
    tls {
        dns route53 {
            access_key_id {env.AWS_ACCESS_KEY_ID}
            secret_access_key {env.AWS_SECRET_ACCESS_KEY}
            region us-east-1
        }
    }
    # ... handlers here
}
```

## Reverse Proxy with Automatic HTTPS

One of the most common use cases for Caddy in Docker is as a reverse proxy for multiple services. Here is a complete production-ready setup:

```yaml
# docker-compose.yml - Full reverse proxy setup with multiple backend services
version: "3.8"

services:
  caddy:
    build: .
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    environment:
      CLOUDFLARE_API_TOKEN: ${CLOUDFLARE_API_TOKEN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - proxy

  wordpress:
    image: wordpress:6-apache
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_PASSWORD: ${DB_PASSWORD}
    networks:
      - proxy
      - backend

  grafana:
    image: grafana/grafana:latest
    networks:
      - proxy

  db:
    image: mariadb:11
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - backend

networks:
  proxy:
  backend:

volumes:
  caddy_data:
  caddy_config:
  db_data:
```

The corresponding Caddyfile:

```
# Caddyfile - Multi-service reverse proxy with wildcard cert
*.example.com {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }

    @blog host blog.example.com
    handle @blog {
        reverse_proxy wordpress:80
    }

    @monitoring host monitoring.example.com
    handle @monitoring {
        reverse_proxy grafana:3000
    }
}
```

## Health Checks and Monitoring

Add health checks to your Caddy container to make sure it stays responsive:

```yaml
# Health check configuration for the Caddy service
services:
  caddy:
    # ... other config
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:80"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

## Verifying Certificate Issuance

After starting the stack, verify that certificates were obtained:

```bash
# Check Caddy logs for certificate acquisition messages
docker compose logs caddy | grep -i "certificate"

# Test HTTPS connectivity with curl
curl -vI https://app.example.com 2>&1 | grep "subject:"

# Inspect the certificate details
echo | openssl s_client -connect app.example.com:443 -servername app.example.com 2>/dev/null | openssl x509 -noout -text | grep "DNS:"
```

## Troubleshooting Common Issues

If certificates fail to provision, check these common problems:

1. **DNS propagation delays** - DNS changes can take minutes to propagate. Caddy retries automatically, but check your DNS provider dashboard to confirm records are created.

2. **API token permissions** - For Cloudflare, your token needs `Zone:DNS:Edit` permissions on the target zone.

3. **Port conflicts** - Ports 80 and 443 must be available. Check with `docker ps` or `ss -tlnp`.

4. **Rate limits** - Let's Encrypt has rate limits (50 certificates per domain per week). Use the staging endpoint for testing:

```
# Caddyfile - Use Let's Encrypt staging for testing
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

## Summary

Caddy with Docker provides the simplest path to automatic HTTPS for your services. The combination of Caddy's built-in certificate management, DNS challenge support for wildcards, and Docker's portability makes it an excellent choice for both development and production deployments. The key steps are building a custom image with your DNS provider plugin, configuring the Caddyfile with your domain structure, and mounting persistent volumes so certificates survive container restarts.
