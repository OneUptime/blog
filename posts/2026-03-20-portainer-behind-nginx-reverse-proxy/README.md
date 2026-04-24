# How to Set Up Portainer Behind Nginx Reverse Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Nginx, Reverse Proxy, HTTPS

Description: Learn how to configure Nginx as a reverse proxy for Portainer, enabling secure HTTPS access and clean domain-based routing.

## Introduction

Running Portainer behind an Nginx reverse proxy is a common production pattern. It lets you serve Portainer over a custom domain, handle SSL termination in one place, and keep port 9443 off the public internet. This guide walks through the complete setup using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- A domain name pointing to your server (e.g., `portainer.example.com`)
- SSL certificate (self-signed or from Let's Encrypt)

## Step 1: Create the Docker Compose File

Create a `docker-compose.yml` that launches both Portainer and Nginx in the same network:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    # Do NOT expose ports to host; Nginx will proxy internally
    networks:
      - proxy

  nginx:
    image: nginx:latest
    container_name: nginx-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    networks:
      - proxy

networks:
  proxy:
    driver: bridge

volumes:
  portainer_data:
```

## Step 2: Create the Nginx Configuration

Create `nginx/conf.d/portainer.conf`:

```nginx
# Redirect HTTP to HTTPS

server {
    listen 80;
    server_name portainer.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name portainer.example.com;

    # SSL certificate paths
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # Recommended SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass https://portainer:9443;

        # Required headers for Portainer to function correctly
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (required for Portainer's terminal feature)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Disable SSL verification for Portainer's self-signed cert
        proxy_ssl_verify off;
    }
}
```

## Step 3: Configure Trusted Origins in Portainer

If you see an `"Origin invalid"` error when accessing Portainer through the reverse proxy, configure trusted origins with the domain you use to reach Portainer. Do not use `--http-enabled` for this.

```yaml
  portainer:
    image: portainer/portainer-ce:latest
    environment:
      - TRUSTED_ORIGINS=portainer.example.com
```

## Step 4: Deploy the Stack

```bash
# Create required directories
mkdir -p nginx/conf.d nginx/certs

# Copy your SSL certificates
cp /path/to/fullchain.pem nginx/certs/
cp /path/to/privkey.pem nginx/certs/

# Start the stack
docker compose up -d

# Verify both containers are running
docker compose ps
```

## Step 5: Verify the Configuration

```bash
# Test Nginx config syntax
docker exec nginx-proxy nginx -t

# Reload Nginx without downtime
docker exec nginx-proxy nginx -s reload

# Check Portainer logs for errors
docker logs portainer --tail 50
```

## Troubleshooting Common Issues

**"Origin Invalid" error**: Add `TRUSTED_ORIGINS=portainer.example.com` to the Portainer service, or use `--trusted-origins portainer.example.com`.

**WebSocket errors in terminal**: Ensure `Upgrade` and `Connection` headers are set in the Nginx config.

**502 Bad Gateway**: Verify that both containers are on the same Docker network and the `proxy_pass` hostname matches the Portainer service name.

## Conclusion

With Nginx acting as a reverse proxy, Portainer is now accessible over HTTPS on a clean domain. This pattern is easy to extend - you can add rate limiting, IP allowlists, or Basic Auth at the Nginx level without touching Portainer's configuration. For automatic certificate management, consider pairing this setup with Certbot or switching to Traefik.
