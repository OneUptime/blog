# How to Install Portainer Using Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker-compose, Installation, Docker, Infrastructure-as-Code

Description: A guide to installing Portainer CE and Portainer Business Edition using Docker Compose for a reproducible, version-controlled deployment.

## Overview

Using Docker Compose to deploy Portainer provides a reproducible, version-controlled deployment that can be easily shared and managed as code. This guide covers Docker Compose configurations for Portainer CE, including custom TLS certificates, reverse proxy deployments, and environment-specific customizations.

## Prerequisites

- Docker Engine installed
- Docker Compose v2 (included with Docker Desktop and docker-compose-plugin)
- Basic Docker Compose knowledge

## Basic Portainer CE Docker Compose

```yaml
# docker-compose.yml

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"     # Optional Edge tunnel port
      - "9443:9443"     # HTTPS UI
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
    driver: local
```

```bash
# Deploy with Docker Compose
docker compose up -d

# View logs
docker compose logs -f portainer

# Check status
docker compose ps
```

## Portainer CE with HTTP Enabled

```yaml
# docker-compose.yml - with HTTP enabled

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command:
      - --http-enabled    # Enable HTTP port 9000
    ports:
      - "8000:8000"
      - "9000:9000"     # HTTP
      - "9443:9443"     # HTTPS
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Portainer with Custom TLS Certificates

```yaml
# docker-compose.yml - with custom certificates

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command:
      - --sslcert=/certs/portainer.crt
      - --sslkey=/certs/portainer.key
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - ./certs:/certs:ro     # Mount certificate directory

volumes:
  portainer_data:
```

```bash
# Create certificate directory and generate self-signed cert
mkdir -p ./certs

openssl req -x509 -newkey rsa:4096 \
  -keyout ./certs/portainer.key \
  -out ./certs/portainer.crt \
  -days 365 \
  -noenc \
  -subj "/CN=portainer.example.com" \
  -addext "subjectAltName=DNS:portainer.example.com,IP:192.168.1.100"

# Deploy
docker compose up -d
```

## Portainer with Nginx Reverse Proxy

```yaml
# docker-compose.yml - Portainer behind Nginx
services:
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: always
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - portainer

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    command:
      - --http-enabled
    expose:
      - "9000"     # Internal HTTP UI for Nginx
    ports:
      - "8000:8000"   # Optional Edge tunnel port
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

```nginx
# nginx/nginx.conf
events {}
http {
    server {
        listen 443 ssl;
        server_name portainer.example.com;

        ssl_certificate /etc/nginx/certs/cert.pem;
        ssl_certificate_key /etc/nginx/certs/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;

        location / {
            proxy_pass http://portainer:9000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    server {
        listen 80;
        return 301 https://$host$request_uri;
    }
}
```

## Portainer CE with Environment Variables

```yaml
# docker-compose.yml with environment variables
services:
  portainer:
    image: portainer/portainer-ce:${PORTAINER_VERSION:-latest}
    container_name: portainer
    restart: always
    ports:
      - "${PORTAINER_HTTPS_PORT:-9443}:9443"
      - "${PORTAINER_TUNNEL_PORT:-8000}:8000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

```bash
# .env file
PORTAINER_VERSION=2.39.0
PORTAINER_HTTPS_PORT=9443
PORTAINER_TUNNEL_PORT=8000
```

## Managing the Deployment

```bash
# Start Portainer
docker compose up -d

# Stop Portainer
docker compose down

# Update to latest version
docker compose pull
docker compose up -d

# View logs
docker compose logs portainer

# Restart
docker compose restart portainer
```

## Conclusion

Using Docker Compose for Portainer deployments provides reproducibility, version control, and easy management. You can commit your docker-compose.yml to Git to track configuration changes. The compose file format is readable and can be shared across team members for consistent deployments. For production environments, keep sensitive values out of the compose file and use `.env` files that are excluded from version control.
