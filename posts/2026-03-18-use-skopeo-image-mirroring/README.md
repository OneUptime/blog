# How to Use Skopeo for Image Mirroring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Mirroring, Registry, High Availability

Description: Learn how to use Skopeo to set up and maintain container image mirrors for high availability, performance, and air-gapped environments.

---

> Image mirroring with Skopeo ensures your container infrastructure remains available even when upstream registries experience downtime or rate limiting.

Registry outages, rate limits, and network latency can all disrupt container deployments. Mirroring images to a local or regional registry protects against these issues by providing a reliable, fast source for your container images. Skopeo is the ideal tool for setting up and maintaining image mirrors because it copies images directly between registries without requiring local storage. This guide shows you how to build a robust mirroring strategy.

---

## Why Mirror Container Images

There are several compelling reasons to mirror container images:

- Protection against upstream registry outages
- Avoiding Docker Hub rate limits in CI/CD
- Faster pull times from a local or regional mirror
- Compliance with air-gapped or restricted network requirements
- Consistent image availability across environments

## Setting Up a Local Mirror Registry

First, run a local registry that will serve as your mirror.

```bash
# Start a local registry with Podman

podman run -d \
  --name mirror-registry \
  -p 5000:5000 \
  -v mirror-data:/var/lib/registry \
  --restart always \
  docker.io/library/registry:2

# Verify the registry is running
curl -s http://localhost:5000/v2/_catalog | jq .
```

## Mirroring Individual Images

Use Skopeo to copy specific images from upstream to your mirror.

```bash
# Mirror nginx from Docker Hub to local registry
skopeo copy \
  --all \
  --dest-tls-verify=false \
  docker://docker.io/library/nginx:1.25 \
  docker://localhost:5000/library/nginx:1.25

# Mirror a multi-arch image with all platforms
skopeo copy \
  --all \
  --dest-tls-verify=false \
  docker://docker.io/library/python:3.12-slim \
  docker://localhost:5000/library/python:3.12-slim

# Verify the mirror has the image
skopeo inspect \
  --tls-verify=false \
  docker://localhost:5000/library/nginx:1.25 | jq '.Digest'
```

## Comprehensive Mirror Script

Create a script to mirror all the images your organization depends on.

```bash
#!/bin/bash
# mirror-images.sh - Mirror a curated set of images to a local registry

MIRROR_REGISTRY="mirror.internal.com:5000"
LOG_FILE="/var/log/image-mirror.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Define images to mirror (source -> destination tag)
declare -A IMAGES=(
  ["docker.io/library/nginx:1.25"]="nginx:1.25"
  ["docker.io/library/redis:7"]="redis:7"
  ["docker.io/library/postgres:16"]="postgres:16"
  ["docker.io/library/node:20-alpine"]="node:20-alpine"
  ["docker.io/library/python:3.12-slim"]="python:3.12-slim"
  ["quay.io/prometheus/prometheus:latest"]="prometheus:latest"
  ["quay.io/prometheus/alertmanager:latest"]="alertmanager:latest"
)

echo "${TIMESTAMP}: Starting mirror sync" >> "$LOG_FILE"

FAILED=0
SUCCESS=0

for SOURCE in "${!IMAGES[@]}"; do
  DEST="${IMAGES[$SOURCE]}"
  echo "Mirroring ${SOURCE} -> ${MIRROR_REGISTRY}/${DEST}"

  skopeo copy \
    --all \
    "docker://${SOURCE}" \
    "docker://${MIRROR_REGISTRY}/${DEST}" >> "$LOG_FILE" 2>&1

  if [ $? -eq 0 ]; then
    ((SUCCESS++))
    echo "  OK"
  else
    ((FAILED++))
    echo "  FAILED" >&2
  fi
done

echo "${TIMESTAMP}: Mirror complete. Success: ${SUCCESS}, Failed: ${FAILED}" >> "$LOG_FILE"
echo "Mirror sync finished. ${SUCCESS} succeeded, ${FAILED} failed."
```

## Using Skopeo Sync for Full Repository Mirroring

For mirroring entire repositories with all tags, use `skopeo sync`.

```bash
# Mirror all tags of nginx to the local registry
skopeo sync \
  --src docker \
  --dest docker \
  --dest-tls-verify=false \
  docker.io/library/nginx \
  localhost:5000/library

# Use a YAML config for multi-repository mirroring
cat > /etc/skopeo/mirror-config.yaml << 'EOF'
docker.io:
  images:
    library/nginx:
      - "1.25"
      - "1.24"
      - "latest"
    library/redis:
      - "7"
      - "7.2"
      - "latest"
    library/postgres:
      - "16"
      - "15"
      - "latest"
EOF

# Run the sync
skopeo sync \
  --src yaml \
  --dest docker \
  --dest-tls-verify=false \
  /etc/skopeo/mirror-config.yaml \
  localhost:5000
```

## Configuring Podman to Use the Mirror

Tell Podman to pull from your mirror instead of upstream registries.

```bash
# Edit the registries configuration
sudo tee /etc/containers/registries.conf.d/mirror.conf << 'EOF'
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.internal.com:5000"
insecure = true
EOF

# Now Podman will try the mirror first, then fall back to Docker Hub
podman pull docker.io/library/nginx:1.25
# This tries mirror.internal.com:5000/library/nginx:1.25 first
```

## Scheduling Automatic Mirror Updates

Keep your mirror current with a systemd timer or cron job.

```bash
# Create a systemd service for the mirror sync
sudo tee /etc/systemd/system/mirror-sync.service << 'EOF'
[Unit]
Description=Container Image Mirror Sync
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/mirror-images.sh
User=root
EOF

# Create a timer to run every 4 hours
sudo tee /etc/systemd/system/mirror-sync.timer << 'EOF'
[Unit]
Description=Run container image mirror sync every 4 hours

[Timer]
OnCalendar=*-*-* 0/4:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable --now mirror-sync.timer

# Check the timer status
systemctl list-timers mirror-sync.timer
```

## Verifying Mirror Integrity

Periodically verify that mirrored images match their upstream sources.

```bash
#!/bin/bash
# verify-mirror.sh - Compare mirror digests with upstream

MIRROR="mirror.internal.com:5000"
IMAGES=("library/nginx:1.25" "library/redis:7" "library/postgres:16")

for IMG in "${IMAGES[@]}"; do
  UPSTREAM=$(skopeo inspect "docker://docker.io/${IMG}" | jq -r '.Digest')
  MIRROR_D=$(skopeo inspect --tls-verify=false "docker://${MIRROR}/${IMG}" | jq -r '.Digest')

  if [ "$UPSTREAM" = "$MIRROR_D" ]; then
    echo "MATCH: ${IMG}"
  else
    echo "MISMATCH: ${IMG} - upstream=${UPSTREAM} mirror=${MIRROR_D}"
  fi
done
```

## Summary

Image mirroring with Skopeo provides resilience, speed, and control over your container image supply chain. By setting up a local mirror registry, scripting regular sync operations, and configuring Podman to use the mirror as a primary source, you create a self-sufficient container infrastructure. Whether you need to avoid rate limits, reduce latency, or operate in air-gapped environments, Skopeo makes mirroring straightforward and automatable.
