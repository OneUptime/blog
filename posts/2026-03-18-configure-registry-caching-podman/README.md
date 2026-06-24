# How to Configure Registry Caching with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Caching, Performance, Mirror

Description: Learn how to set up registry caching in Podman to speed up image pulls, reduce bandwidth usage, and enable offline container workflows.

---

> Registry caching dramatically reduces image pull times and network bandwidth by storing copies of remote images locally.

Pulling container images from remote registries can be slow, especially for large images or when network bandwidth is limited. Registry caching solves this by running a local pull-through cache that intercepts image pulls, stores them locally, and serves subsequent requests from the cache. This guide covers how to set up and configure registry caching with Podman.

---

## Understanding Pull-Through Caching

A pull-through cache acts as a transparent proxy between Podman and a remote registry.

```bash
# Without caching:

# podman pull -> internet -> docker.io -> download image

# With caching:
# First pull:  podman pull -> local cache -> internet -> docker.io -> download + cache
# Second pull: podman pull -> local cache -> serve from cache (fast!)
```

## Setting Up a Pull-Through Cache for Docker Hub

Run a local registry configured as a pull-through cache.

```bash
# Create a volume for cached images
podman volume create registry-cache

# Start the pull-through cache for Docker Hub
podman run -d \
  --name docker-cache \
  -p 5000:5000 \
  -v registry-cache:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  --restart always \
  docker.io/library/registry:2

# Verify the cache is running
curl -s http://localhost:5000/v2/_catalog
```

## Configuring Podman to Use the Cache

Point Podman to the local cache as a mirror.

```bash
# Edit the registries configuration
sudo tee /etc/containers/registries.conf <<'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

# Use the local cache as a mirror for Docker Hub
[[registry.mirror]]
location = "localhost:5000"
insecure = true
EOF
```

```bash
# Test the caching setup

# First pull (goes through cache to Docker Hub)
time podman pull docker.io/library/nginx:latest

# Remove the local image
podman rmi docker.io/library/nginx:latest

# Second pull (served from cache - much faster)
time podman pull docker.io/library/nginx:latest

# Verify the image was cached
curl -s http://localhost:5000/v2/_catalog
```

## Caching Multiple Registries

Set up separate caches for different registries.

```bash
# Cache for Docker Hub
podman run -d \
  --name cache-dockerhub \
  -p 5001:5000 \
  -v cache-dockerhub:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  docker.io/library/registry:2

# Cache for Quay.io
podman run -d \
  --name cache-quay \
  -p 5002:5000 \
  -v cache-quay:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://quay.io \
  docker.io/library/registry:2

# Cache for ghcr.io
podman run -d \
  --name cache-ghcr \
  -p 5003:5000 \
  -v cache-ghcr:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://ghcr.io \
  docker.io/library/registry:2
```

```toml
# /etc/containers/registries.conf

unqualified-search-registries = ["docker.io", "quay.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"
[[registry.mirror]]
location = "localhost:5001"
insecure = true

[[registry]]
prefix = "quay.io"
location = "quay.io"
[[registry.mirror]]
location = "localhost:5002"
insecure = true

[[registry]]
prefix = "ghcr.io"
location = "ghcr.io"
[[registry.mirror]]
location = "localhost:5003"
insecure = true
```

## Advanced Cache Configuration

Use a configuration file for fine-tuned cache behavior.

```bash
# Create the cache configuration
mkdir -p /opt/registry-cache/config

cat > /opt/registry-cache/config/config.yml <<'EOF'
version: 0.1
log:
  level: info
storage:
  filesystem:
    rootdirectory: /var/lib/registry
  maintenance:
    uploadpurging:
      enabled: true
      age: 168h
      interval: 24h
      dryrun: false
  delete:
    enabled: true
proxy:
  remoteurl: https://registry-1.docker.io
  ttl: 168h
http:
  addr: :5000
  headers:
    X-Content-Type-Options: [nosniff]
EOF

# Start the cache with the custom configuration
podman run -d \
  --name docker-cache-advanced \
  -p 5000:5000 \
  -v registry-cache:/var/lib/registry \
  -v /opt/registry-cache/config/config.yml:/etc/docker/registry/config.yml:ro \
  --restart always \
  docker.io/library/registry:2
```

## Monitoring Cache Usage

Track cache size and usage statistics.

```bash
# Check the cache size
podman exec docker-cache du -sh /var/lib/registry
# Or check the volume size
podman volume inspect registry-cache --format '{{.Mountpoint}}' | \
  xargs du -sh

# View cached repositories
curl -s http://localhost:5000/v2/_catalog | python3 -m json.tool

# View cached tags for a specific image
curl -s http://localhost:5000/v2/library/nginx/tags/list | python3 -m json.tool

# View cache container logs for pull statistics
podman logs --tail 20 docker-cache
```

## Cache Cleanup and Maintenance

Manage disk space used by the cache.

```bash
# Stop the cache before garbage collection to avoid writes during cleanup
podman stop docker-cache

# Run garbage collection in dry-run mode first
podman run --rm \
  -v registry-cache:/var/lib/registry \
  docker.io/library/registry:2 \
  /bin/registry garbage-collect --dry-run /etc/docker/registry/config.yml

# Run garbage collection on the cache
podman run --rm \
  -v registry-cache:/var/lib/registry \
  docker.io/library/registry:2 \
  /bin/registry garbage-collect /etc/docker/registry/config.yml

# Restart the cache
podman start docker-cache

# Clear the entire cache (start fresh)
podman stop docker-cache
podman rm docker-cache
podman volume rm registry-cache
podman volume create registry-cache
# Then restart the cache container
```

## Running the Cache as a Systemd Service

Ensure the cache starts automatically on boot.

```bash
# Create a Quadlet unit for the cache
mkdir -p ~/.config/containers/systemd

cat > ~/.config/containers/systemd/docker-cache.container <<'EOF'
[Unit]
Description=Podman Docker Hub registry cache
After=network-online.target
Wants=network-online.target

[Container]
ContainerName=docker-cache
Image=docker.io/library/registry:2
PublishPort=5000:5000
Volume=registry-cache:/var/lib/registry
Environment=REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Remove the manually started container if it already exists; the volume is kept
podman rm -f docker-cache

# Enable and start the service
systemctl --user daemon-reload
systemctl --user enable --now docker-cache.service

# Keep the user service running after logout and allow it to start at boot
loginctl enable-linger "$USER"

# Check the status
systemctl --user status docker-cache.service
```

## Cache with Authenticated Upstream

Configure the cache to authenticate with the upstream registry.

```bash
# Start a cache that authenticates with Docker Hub
podman run -d \
  --name docker-cache-auth \
  -p 5000:5000 \
  -v registry-cache:/var/lib/registry \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -e REGISTRY_PROXY_USERNAME=yourdockerhubuser \
  -e REGISTRY_PROXY_PASSWORD=yourdockerhubtoken \
  --restart always \
  docker.io/library/registry:2

# This uses authenticated Docker Hub pulls, which can provide higher pull limits
```

## Summary

Registry caching in Podman is implemented by running local pull-through cache registries and configuring them as mirrors in `registries.conf`. This approach reduces pull times for previously fetched images, saves network bandwidth, and reduces repeated pulls against public registries. You can cache multiple upstream registries independently, configure TTL and cleanup policies, and run the cache as a systemd service for automatic startup. Authenticated upstream configurations can provide higher pull limits on registries like Docker Hub.
