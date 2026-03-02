# How to Configure Proxy Cache for Container Registries on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Container Registry, Caching, DevOps

Description: Learn how to set up a registry proxy cache on Ubuntu to speed up container image pulls, reduce external bandwidth usage, and work around rate limits from Docker Hub and other registries.

---

Running Docker Hub pulls across a team or in a CI environment hits rate limits fast - especially on the free tier with anonymous pulls. A local registry proxy cache solves this by intercepting image pull requests, fetching from the upstream registry once, and serving subsequent requests from local storage. Your CI jobs get faster, bandwidth usage drops, and you're no longer blocked when Docker Hub is slow or rate-limiting your IP.

This guide sets up a registry proxy cache on Ubuntu using the official Docker Registry image, covering configuration for Docker Hub and other registries.

## How Registry Proxy Caching Works

When a Docker client is configured to use a mirror, it sends pull requests to the mirror first. If the mirror has the image cached, it serves it directly. If not, the mirror fetches it from the upstream registry, caches it locally, and serves it to the client. Subsequent pulls of the same image tag hit the cache until the cached content expires.

## Prerequisites

- Ubuntu 20.04 or later
- Docker installed on the machine that will serve as the cache
- Sufficient disk space for cached images (100GB+ recommended for a shared team cache)

```bash
# Install Docker if not already installed
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

## Setting Up a Docker Hub Proxy Cache

### Creating the Configuration

Create a directory for the registry configuration and data:

```bash
# Create directories for registry config and data
sudo mkdir -p /opt/registry-cache/config
sudo mkdir -p /opt/registry-cache/data
```

Create the registry configuration file:

```yaml
# /opt/registry-cache/config/config.yml
version: 0.1

log:
  level: info
  formatter: json

storage:
  filesystem:
    rootdirectory: /var/lib/registry
  # Delete old layers when disk space is low
  delete:
    enabled: true

http:
  addr: :5000
  # Optional: enable TLS (recommended for production)
  # tls:
  #   certificate: /certs/domain.crt
  #   key: /certs/domain.key

# Proxy configuration - points to Docker Hub
proxy:
  remoteurl: https://registry-1.docker.io
  # Optional: Docker Hub credentials to avoid rate limits
  # username: your-dockerhub-username
  # password: your-dockerhub-password-or-token

health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
```

Write this to the config file:

```bash
sudo tee /opt/registry-cache/config/config.yml << 'EOF'
version: 0.1

log:
  level: info
  formatter: json

storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true

http:
  addr: :5000

proxy:
  remoteurl: https://registry-1.docker.io

health:
  storagedriver:
    enabled: true
    interval: 10s
    threshold: 3
EOF
```

### Running the Registry Cache

```bash
# Run the registry cache as a Docker container
docker run -d \
  --name registry-cache \
  --restart unless-stopped \
  -p 5000:5000 \
  -v /opt/registry-cache/config/config.yml:/etc/docker/registry/config.yml:ro \
  -v /opt/registry-cache/data:/var/lib/registry \
  registry:2

# Verify it's running
docker ps | grep registry-cache
docker logs registry-cache
```

### Using Docker Compose

For easier management, use Docker Compose:

```yaml
# /opt/registry-cache/docker-compose.yml
version: '3.8'

services:
  registry-cache:
    image: registry:2
    container_name: registry-cache
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./config/config.yml:/etc/docker/registry/config.yml:ro
      - ./data:/var/lib/registry
    environment:
      # Override specific config values via environment variables
      REGISTRY_LOG_LEVEL: info
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:5000/v2/"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# Start with Docker Compose
cd /opt/registry-cache
sudo docker compose up -d

# Check status
sudo docker compose ps
sudo docker compose logs -f
```

## Configuring Docker Clients to Use the Cache

Docker clients need to be configured to use the registry mirror. On each client machine (or on the same machine running the cache):

```bash
# Edit or create Docker daemon configuration
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "http://192.168.1.100:5000"
  ]
}
EOF
# Replace 192.168.1.100 with your cache server's IP

# Restart Docker to apply changes
sudo systemctl restart docker

# Verify the mirror is configured
docker info | grep -A 5 "Registry Mirrors"
```

Test that caching works:

```bash
# Pull an image (first pull fetches from Docker Hub via cache)
docker pull nginx:alpine

# Remove local image
docker rmi nginx:alpine

# Pull again - should be significantly faster (served from cache)
docker pull nginx:alpine
```

## Caching Multiple Registries

The Docker Registry only supports proxying one upstream registry per instance. To cache multiple registries, run separate instances.

```yaml
# /opt/registry-cache/docker-compose.yml - Multiple registry caches
version: '3.8'

services:
  # Docker Hub cache - port 5000
  dockerhub-cache:
    image: registry:2
    container_name: dockerhub-cache
    restart: unless-stopped
    ports:
      - "5000:5000"
    volumes:
      - ./config/dockerhub.yml:/etc/docker/registry/config.yml:ro
      - ./data/dockerhub:/var/lib/registry

  # GitHub Container Registry cache - port 5001
  ghcr-cache:
    image: registry:2
    container_name: ghcr-cache
    restart: unless-stopped
    ports:
      - "5001:5000"
    volumes:
      - ./config/ghcr.yml:/etc/docker/registry/config.yml:ro
      - ./data/ghcr:/var/lib/registry

  # Quay.io cache - port 5002
  quay-cache:
    image: registry:2
    container_name: quay-cache
    restart: unless-stopped
    ports:
      - "5002:5000"
    volumes:
      - ./config/quay.yml:/etc/docker/registry/config.yml:ro
      - ./data/quay:/var/lib/registry
```

Create config files for each:

```bash
# GitHub Container Registry config
sudo tee /opt/registry-cache/config/ghcr.yml << 'EOF'
version: 0.1
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
proxy:
  remoteurl: https://ghcr.io
  # GitHub credentials for authenticated pulls
  # username: your-github-username
  # password: your-github-pat
EOF

# Quay.io config
sudo tee /opt/registry-cache/config/quay.yml << 'EOF'
version: 0.1
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  delete:
    enabled: true
http:
  addr: :5000
proxy:
  remoteurl: https://quay.io
EOF
```

Configure the Docker daemon to use all mirrors:

```json
{
  "registry-mirrors": [
    "http://192.168.1.100:5000"
  ],
  "insecure-registries": [
    "192.168.1.100:5001",
    "192.168.1.100:5002"
  ]
}
```

For GHCR and Quay, you configure the mirror differently since Docker's `registry-mirrors` only applies to Docker Hub. Use containerd's configuration instead for Kubernetes/containerd environments.

## Containerd Configuration for Kubernetes

If you're running Kubernetes with containerd, configure mirrors in containerd:

```bash
# Create containerd mirror configuration directory
sudo mkdir -p /etc/containerd/certs.d/docker.io

# Configure Docker Hub mirror
sudo tee /etc/containerd/certs.d/docker.io/hosts.toml << 'EOF'
server = "https://registry-1.docker.io"

[host."http://192.168.1.100:5000"]
  capabilities = ["pull", "resolve"]
EOF

# For GHCR
sudo mkdir -p /etc/containerd/certs.d/ghcr.io
sudo tee /etc/containerd/certs.d/ghcr.io/hosts.toml << 'EOF'
server = "https://ghcr.io"

[host."http://192.168.1.100:5001"]
  capabilities = ["pull", "resolve"]
EOF

# Restart containerd
sudo systemctl restart containerd
```

## Monitoring Cache Performance

```bash
# Check cache disk usage
du -sh /opt/registry-cache/data/

# Monitor cache logs for hits and misses
docker logs registry-cache --follow 2>&1 | grep -E "cached|miss|fetch"

# List cached repositories via API
curl -s http://localhost:5000/v2/_catalog | python3 -m json.tool

# List tags for a cached image
curl -s http://localhost:5000/v2/library/nginx/tags/list | python3 -m json.tool
```

## Setting Up Cache Cleanup

Cached images consume disk space. Set up periodic garbage collection:

```bash
# Create a garbage collection script
sudo tee /usr/local/bin/registry-gc.sh << 'EOF'
#!/bin/bash
# Run registry garbage collection to reclaim space from deleted layers

docker exec registry-cache registry garbage-collect \
  /etc/docker/registry/config.yml \
  --delete-untagged=true

echo "$(date): Garbage collection completed" >> /var/log/registry-gc.log
EOF

sudo chmod +x /usr/local/bin/registry-gc.sh

# Run weekly via cron
sudo crontab -e
# Add:
# 0 3 * * 0 /usr/local/bin/registry-gc.sh
```

A local registry proxy cache pays for itself quickly in CI environments where dozens of jobs pull the same base images repeatedly. Once configured, it's largely self-maintaining and significantly reduces both build times and external bandwidth costs.
