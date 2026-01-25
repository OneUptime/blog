# How to Set Up Docker Proxy Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Proxy, Corporate Network, DevOps, Configuration

Description: Configure Docker to work behind corporate proxies, including daemon configuration, build-time proxy settings, and container runtime proxy handling for seamless operation in restricted networks.

---

Working with Docker behind corporate proxies requires configuration at multiple levels: the Docker daemon for pulling images, build-time settings for downloading dependencies, and runtime configuration for containers that need external access. Missing any layer causes frustrating timeouts and connection failures.

## Understanding Proxy Layers

Docker needs proxy configuration in three places:

1. **Docker daemon**: For pulling images from registries
2. **Docker build**: For downloading packages during image builds
3. **Container runtime**: For applications making external requests

Each layer requires separate configuration.

## Configuring the Docker Daemon

The daemon needs proxy settings to pull images from Docker Hub and other registries.

### On Linux (systemd)

Create a systemd override file:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d

sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1,.example.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
EOF

# Reload and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify settings
sudo systemctl show --property=Environment docker
```

### Using daemon.json

Alternative approach using daemon configuration:

```json
// /etc/docker/daemon.json
{
  "proxies": {
    "http-proxy": "http://proxy.example.com:8080",
    "https-proxy": "http://proxy.example.com:8080",
    "no-proxy": "localhost,127.0.0.1,.example.com,10.0.0.0/8"
  }
}
```

### On Docker Desktop (Mac/Windows)

Configure through Docker Desktop settings:

1. Open Docker Desktop
2. Go to Settings (gear icon)
3. Select "Resources" then "Proxies"
4. Enable "Manual proxy configuration"
5. Enter proxy details

Or edit the configuration file directly:

```json
// ~/.docker/config.json (for Docker Desktop)
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:8080",
      "httpsProxy": "http://proxy.example.com:8080",
      "noProxy": "localhost,127.0.0.1,.example.com"
    }
  }
}
```

## Build-Time Proxy Configuration

Proxy settings for building images that need to download packages.

### Using Build Arguments

```dockerfile
FROM node:20-alpine

# Accept proxy settings as build arguments
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# Set environment variables for package managers
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

# Now package installations use the proxy
RUN npm install -g typescript

# Clear proxy from final image (optional but recommended)
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV NO_PROXY=
```

Build with proxy arguments:

```bash
docker build \
  --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.example.com:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t myapp .
```

### Automatic Proxy Injection

Configure Docker to automatically inject proxy variables:

```json
// ~/.docker/config.json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.example.com:8080",
      "httpsProxy": "http://proxy.example.com:8080",
      "noProxy": "localhost,127.0.0.1"
    }
  }
}
```

Now every build automatically receives these as build arguments.

### Multi-Stage Build Proxy Handling

Clear proxy settings in the final stage:

```dockerfile
# Build stage with proxy
FROM node:20-alpine AS builder

ARG HTTP_PROXY
ARG HTTPS_PROXY

ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage without proxy variables
FROM node:20-alpine AS production

WORKDIR /app
# Only copy built artifacts, no proxy variables
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/index.js"]
```

## Container Runtime Proxy

For containers that need to access external services through a proxy.

### Environment Variables

```bash
docker run -d \
  -e HTTP_PROXY=http://proxy.example.com:8080 \
  -e HTTPS_PROXY=http://proxy.example.com:8080 \
  -e NO_PROXY=localhost,127.0.0.1 \
  myapp:latest
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    environment:
      - HTTP_PROXY=http://proxy.example.com:8080
      - HTTPS_PROXY=http://proxy.example.com:8080
      - NO_PROXY=localhost,127.0.0.1,database,redis
      # Include service names in NO_PROXY

  database:
    image: postgres:16
    # No proxy needed for database
```

### Using Environment File

```bash
# proxy.env
HTTP_PROXY=http://proxy.example.com:8080
HTTPS_PROXY=http://proxy.example.com:8080
NO_PROXY=localhost,127.0.0.1
```

```yaml
services:
  app:
    image: myapp:latest
    env_file:
      - proxy.env
```

## Proxy Authentication

For proxies requiring authentication:

```bash
# URL-encoded credentials in proxy URL
HTTP_PROXY=http://username:password@proxy.example.com:8080

# Special characters need URL encoding
# @ = %40, : = %3A, etc.
HTTP_PROXY=http://user%40domain.com:p%40ssword@proxy.example.com:8080
```

For NTLM proxies, consider using a local proxy like cntlm:

```bash
# Install cntlm locally
apt-get install cntlm

# Configure cntlm with NTLM credentials
# /etc/cntlm.conf
Username    youruser
Domain      YOURDOMAIN
Password    yourpassword
Proxy       corporate-proxy.example.com:8080
Listen      3128

# Point Docker at cntlm
HTTP_PROXY=http://localhost:3128
```

## Certificate Issues with Proxies

Corporate proxies often perform SSL inspection, requiring custom CA certificates.

### Adding CA Certificates to Images

```dockerfile
FROM ubuntu:22.04

# Copy corporate CA certificate
COPY corporate-ca.crt /usr/local/share/ca-certificates/

# Update certificate store
RUN update-ca-certificates

# Now HTTPS through proxy works
RUN apt-get update && apt-get install -y curl
```

### For Alpine-Based Images

```dockerfile
FROM alpine:3.20

# Install ca-certificates package first
RUN apk add --no-cache ca-certificates

# Add corporate CA
COPY corporate-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates
```

### Node.js Specific

```dockerfile
FROM node:20-alpine

COPY corporate-ca.crt /usr/local/share/ca-certificates/
RUN apk add --no-cache ca-certificates && update-ca-certificates

# Tell Node.js to use system certificates
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt
```

### Python Specific

```dockerfile
FROM python:3.12-slim

COPY corporate-ca.crt /usr/local/share/ca-certificates/
RUN update-ca-certificates

# Tell Python/pip to use the certificate bundle
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
```

## Debugging Proxy Issues

### Verify Daemon Proxy Settings

```bash
# Check if daemon received proxy settings
docker info | grep -i proxy

# Test image pull
docker pull hello-world
```

### Test Build Proxy

```bash
# Build with verbose output
docker build --progress=plain -t test .

# Create a test Dockerfile
cat > Dockerfile.test <<EOF
FROM alpine:3.20
RUN apk add --no-cache curl
RUN curl -v https://www.google.com
EOF

docker build -f Dockerfile.test \
  --build-arg HTTP_PROXY=$HTTP_PROXY \
  --build-arg HTTPS_PROXY=$HTTPS_PROXY \
  -t proxy-test .
```

### Test Container Runtime Proxy

```bash
# Test external connectivity
docker run --rm \
  -e HTTP_PROXY=http://proxy.example.com:8080 \
  -e HTTPS_PROXY=http://proxy.example.com:8080 \
  alpine:3.20 \
  wget -O- https://www.google.com
```

### Common Issues

**Timeouts during image pull:**
- Docker daemon proxy not configured
- Proxy URL incorrect

**Build downloads fail:**
- Build arguments not passed
- Proxy not in NO_PROXY for internal registries

**Container cannot reach external services:**
- Runtime environment variables missing
- NO_PROXY not including internal services

## Best Practices

1. **Keep proxy configuration in environment files**, not hardcoded
2. **Always configure NO_PROXY** to exclude internal services and registries
3. **Clear proxy variables in production images** to avoid leaking internal network details
4. **Use multi-stage builds** to separate build-time and runtime configurations
5. **Document proxy requirements** in your project README

```yaml
# docker-compose.yml with conditional proxy
services:
  app:
    image: myapp:latest
    environment:
      - HTTP_PROXY=${HTTP_PROXY:-}
      - HTTPS_PROXY=${HTTPS_PROXY:-}
      - NO_PROXY=${NO_PROXY:-localhost,127.0.0.1}
```

---

Docker proxy configuration requires attention at daemon, build, and runtime levels. Configure the daemon for image pulls, use build arguments for package downloads during builds, and set environment variables for runtime connectivity. Always include internal services in NO_PROXY and handle SSL inspection certificates when working with corporate proxies.
