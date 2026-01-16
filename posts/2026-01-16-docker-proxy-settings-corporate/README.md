# How to Configure Docker Proxy Settings for Corporate Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Proxy, Corporate, DevOps, Networking

Description: Learn how to configure Docker to work behind corporate proxies, including HTTP/HTTPS proxy settings for the Docker daemon, containers, and image pulls.

---

Corporate networks often require all traffic to pass through a proxy server. This creates challenges for Docker, which needs proxy configuration at multiple levels: the Docker daemon for pulling images, containers for runtime network access, and build processes for downloading dependencies.

## Understanding Docker Proxy Layers

Docker requires proxy configuration at three different levels:

| Level | Purpose | Configuration Location |
|-------|---------|----------------------|
| Docker Daemon | Pulling images from registries | systemd or daemon.json |
| Container Runtime | Containers accessing external networks | docker run or compose |
| Docker Build | Downloading dependencies during build | Build args or Dockerfile |

## Configuring the Docker Daemon

The daemon needs proxy settings to pull images from Docker Hub and other registries.

### Method 1: systemd Override (Linux)

This is the recommended approach for Linux systems using systemd.

```bash
# Create the systemd drop-in directory
sudo mkdir -p /etc/systemd/system/docker.service.d

# Create the proxy configuration file
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf > /dev/null <<EOF
[Service]
Environment="HTTP_PROXY=http://proxy.company.com:8080"
Environment="HTTPS_PROXY=http://proxy.company.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1,.company.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
EOF

# Reload systemd and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify the configuration
sudo systemctl show --property=Environment docker
```

### Method 2: daemon.json (All Platforms)

For Docker Desktop on Windows/Mac or as an alternative on Linux.

```json
{
  "proxies": {
    "http-proxy": "http://proxy.company.com:8080",
    "https-proxy": "http://proxy.company.com:8080",
    "no-proxy": "localhost,127.0.0.1,.company.com"
  }
}
```

Location of daemon.json:
- Linux: `/etc/docker/daemon.json`
- Windows: `C:\ProgramData\docker\config\daemon.json`
- macOS: `~/.docker/daemon.json` or via Docker Desktop UI

### Docker Desktop GUI Configuration

For Docker Desktop on Windows or macOS:

1. Open Docker Desktop Settings
2. Go to Resources > Proxies
3. Enable "Manual proxy configuration"
4. Enter HTTP and HTTPS proxy URLs
5. Add bypass hosts to "Bypass proxy settings for these hosts"
6. Apply & Restart

## Configuring Containers

Containers inherit proxy settings from the daemon in newer Docker versions, but you may need explicit configuration for older versions or specific requirements.

### Using Environment Variables

```bash
# Single container
docker run -e HTTP_PROXY=http://proxy.company.com:8080 \
           -e HTTPS_PROXY=http://proxy.company.com:8080 \
           -e NO_PROXY=localhost,127.0.0.1 \
           my-image

# Lowercase variants (some applications require these)
docker run -e http_proxy=http://proxy.company.com:8080 \
           -e https_proxy=http://proxy.company.com:8080 \
           -e no_proxy=localhost,127.0.0.1 \
           my-image
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  app:
    image: my-app
    environment:
      - HTTP_PROXY=http://proxy.company.com:8080
      - HTTPS_PROXY=http://proxy.company.com:8080
      - NO_PROXY=localhost,127.0.0.1,db,redis
      # Lowercase versions for compatibility
      - http_proxy=http://proxy.company.com:8080
      - https_proxy=http://proxy.company.com:8080
      - no_proxy=localhost,127.0.0.1,db,redis

  db:
    image: postgres
    # Database doesn't need internet access
```

### Using an .env File

Create a reusable environment file for proxy settings.

```bash
# .env.proxy
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
NO_PROXY=localhost,127.0.0.1
http_proxy=http://proxy.company.com:8080
https_proxy=http://proxy.company.com:8080
no_proxy=localhost,127.0.0.1
```

```bash
# Use with docker run
docker run --env-file .env.proxy my-image

# Use with docker-compose
docker-compose --env-file .env.proxy up
```

## Configuring Docker Build

Build processes often need to download dependencies from the internet.

### Build Arguments

```bash
# Pass proxy settings as build arguments
docker build \
  --build-arg HTTP_PROXY=http://proxy.company.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.company.com:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1 \
  -t my-image .
```

### Dockerfile Configuration

Reference build arguments in your Dockerfile. Note that these are available only during build, not at runtime.

```dockerfile
FROM node:18

# Accept build arguments (these are predefined, no ARG declaration needed)
# ARG HTTP_PROXY
# ARG HTTPS_PROXY
# ARG NO_PROXY

# Set as environment variables for the build process
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}

# Install dependencies (will use proxy)
WORKDIR /app
COPY package*.json ./
RUN npm install

# Clear proxy settings for runtime (optional but recommended)
ENV HTTP_PROXY=
ENV HTTPS_PROXY=
ENV NO_PROXY=

COPY . .
CMD ["npm", "start"]
```

### Docker Compose Build Configuration

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      args:
        - HTTP_PROXY=http://proxy.company.com:8080
        - HTTPS_PROXY=http://proxy.company.com:8080
        - NO_PROXY=localhost,127.0.0.1
```

## Proxy Authentication

Many corporate proxies require authentication.

### Basic Authentication in URL

```bash
# Include credentials in the proxy URL
HTTP_PROXY=http://username:password@proxy.company.com:8080
```

**Security Warning**: This exposes credentials in environment variables, process listings, and logs. Use more secure methods when possible.

### NTLM/Kerberos Authentication

For Windows-integrated authentication, use a local proxy like cntlm.

```bash
# Install cntlm
sudo apt-get install cntlm

# Configure /etc/cntlm.conf
Username    your-username
Domain      COMPANY
Password    your-password  # Or use PassNTLMv2 hash
Proxy       actual-proxy.company.com:8080
Listen      127.0.0.1:3128

# Start cntlm
sudo systemctl start cntlm

# Configure Docker to use local cntlm proxy
HTTP_PROXY=http://127.0.0.1:3128
HTTPS_PROXY=http://127.0.0.1:3128
```

## NO_PROXY Configuration

The NO_PROXY variable specifies addresses that should bypass the proxy.

### Common NO_PROXY Entries

```bash
NO_PROXY=localhost,127.0.0.1,::1,.company.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.local
```

| Entry | Purpose |
|-------|---------|
| `localhost` | Local machine |
| `127.0.0.1` | IPv4 loopback |
| `::1` | IPv6 loopback |
| `.company.com` | Internal company domains |
| `10.0.0.0/8` | Private network range |
| `172.16.0.0/12` | Docker's default bridge network |
| `192.168.0.0/16` | Private network range |
| `.local` | mDNS local addresses |

### Docker Service Names

When using Docker Compose, add service names to NO_PROXY so containers can communicate directly.

```yaml
services:
  app:
    environment:
      - NO_PROXY=localhost,127.0.0.1,db,redis,api
```

## SSL/TLS Interception (MITM Proxies)

Many corporate proxies perform SSL inspection, requiring you to trust their CA certificate.

### Adding Corporate CA Certificate to Images

```dockerfile
FROM ubuntu:22.04

# Copy corporate CA certificate
COPY corporate-ca.crt /usr/local/share/ca-certificates/

# Update CA certificates
RUN update-ca-certificates

# Now HTTPS connections through the proxy will work
```

### For Node.js Applications

```dockerfile
FROM node:18

COPY corporate-ca.crt /etc/ssl/certs/
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/corporate-ca.crt
```

### For Python Applications

```dockerfile
FROM python:3.11

COPY corporate-ca.crt /etc/ssl/certs/
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/corporate-ca.crt
ENV SSL_CERT_FILE=/etc/ssl/certs/corporate-ca.crt
```

## Troubleshooting

### Verify Daemon Proxy Settings

```bash
# Check systemd environment
sudo systemctl show --property=Environment docker

# Or check process environment
sudo cat /proc/$(pgrep -f dockerd)/environ | tr '\0' '\n' | grep -i proxy
```

### Test Image Pull

```bash
# Enable debug mode
docker pull alpine 2>&1 | grep -i proxy

# Or with verbose output
docker --debug pull alpine
```

### Test Container Network Access

```bash
# Run a test container
docker run --rm curlimages/curl -v https://google.com

# Check environment inside container
docker run --rm alpine env | grep -i proxy
```

### Common Issues

| Problem | Solution |
|---------|----------|
| `TLS handshake timeout` | Add corporate CA cert or check proxy URL |
| `407 Proxy Authentication Required` | Add credentials to proxy URL or use cntlm |
| `connection refused` | Check proxy URL and port |
| `no such host` | Add internal domains to NO_PROXY |
| Container can't reach another container | Add service name to NO_PROXY |

## Summary

Corporate proxy configuration requires settings at multiple levels:

1. **Docker Daemon** - For pulling images (systemd override or daemon.json)
2. **Container Runtime** - For containers accessing external services (env vars)
3. **Build Process** - For downloading dependencies (build args)
4. **CA Certificates** - For SSL-intercepting proxies

Always include internal addresses and Docker service names in NO_PROXY to ensure container-to-container communication works correctly. Test each layer independently when troubleshooting connectivity issues.
