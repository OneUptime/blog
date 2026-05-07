# How to Sync Images Between Registries with Skopeo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Registry, Image Sync, Mirroring

Description: Learn how to use Skopeo sync to keep container images synchronized between registries for disaster recovery and multi-environment workflows.

---

> Skopeo sync copies entire repositories or filtered sets of images between registries in a single command, making registry mirroring straightforward.

Keeping container images synchronized across multiple registries is critical for disaster recovery, air-gapped environments, and multi-region deployments. Skopeo provides a dedicated `sync` command that goes beyond simple copy operations. It can synchronize entire repositories, filter by tags, and work with YAML configuration files for complex setups. This guide walks you through using Skopeo sync effectively alongside Podman.

---

## Installing Skopeo

Make sure Skopeo is installed and up to date on your system.

```bash
# Install on Fedora/RHEL

sudo dnf install -y skopeo

# Install on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y skopeo

# Verify the installed version
skopeo --version
```

## Basic Sync from Registry to Registry

The `skopeo sync` command copies all tags from a source repository to a destination registry.

```bash
# Sync all tags of an image from Docker Hub to a private registry
skopeo sync \
  --src docker \
  --dest docker \
  docker.io/library/nginx \
  registry.internal.com

# This copies all tags of nginx to registry.internal.com/nginx
```

## Sync from Registry to Local Directory

You can sync images to a local directory for offline storage or transfer to air-gapped environments.

```bash
# Sync all tags of an image to a local directory
skopeo sync \
  --src docker \
  --dest dir \
  docker.io/library/alpine \
  /opt/image-mirror/

# The directory will contain one image directory per tag
ls /opt/image-mirror/
```

## Sync from Local Directory to Registry

After transferring images to an air-gapped environment, push them from the local directory to the target registry.

```bash
# Sync one image tag from the local directory back to a registry
skopeo sync \
  --src dir \
  --dest docker \
  /opt/image-mirror/alpine:latest \
  airgapped-registry.internal.com
```

## Using YAML Configuration for Complex Syncs

For production setups, define your sync configuration in a YAML file to manage multiple repositories and tag filters.

```yaml
# sync-config.yaml - Define which images and tags to sync
registry.source.com:
  images:
    nginx:
      - "1.25"
      - "1.24"
      - "latest"
    redis:
      - "7"
      - "7.2"
    postgres:
      - "16"
      - "15"
docker.io:
  images-by-tag-regex:
    library/python: "^3\\.12"
```

```bash
# Run the sync using the YAML configuration
skopeo sync \
  --src yaml \
  --dest docker \
  sync-config.yaml \
  registry.destination.com
```

## Syncing with Authentication

When syncing between private registries, use Podman's authentication or pass credentials directly.

```bash
# Log in to both registries using Podman
podman login source-registry.example.com
podman login dest-registry.example.com

# Sync using the shared auth file
skopeo sync \
  --src docker \
  --dest docker \
  --authfile "${XDG_RUNTIME_DIR}/containers/auth.json" \
  source-registry.example.com/myorg/myapp \
  dest-registry.example.com/myorg

# Or pass source and destination credentials separately
skopeo sync \
  --src docker \
  --dest docker \
  --src-creds "user1:pass1" \
  --dest-creds "user2:pass2" \
  source-registry.example.com/myorg/myapp \
  dest-registry.example.com/myorg
```

## Syncing Multi-Architecture Images

Use the `--all` flag to sync all platform variants of multi-architecture images.

```bash
# Sync all architectures of an image
skopeo sync \
  --all \
  --src docker \
  --dest docker \
  docker.io/library/node \
  registry.internal.com
```

## Automating Periodic Syncs with Cron

Set up a cron job or systemd timer to keep registries synchronized automatically.

```bash
#!/bin/bash
# registry-sync.sh - Automated registry sync script

LOG_FILE="/var/log/registry-sync.log"
CONFIG_FILE="/etc/skopeo/sync-config.yaml"
DEST_REGISTRY="registry.internal.com"

echo "$(date): Starting registry sync" >> "$LOG_FILE"

# Run the sync with the YAML configuration
skopeo sync \
  --src yaml \
  --dest docker \
  --authfile /etc/containers/auth.json \
  "$CONFIG_FILE" \
  "$DEST_REGISTRY" >> "$LOG_FILE" 2>&1

# Log the result
if [ $? -eq 0 ]; then
  echo "$(date): Sync completed successfully" >> "$LOG_FILE"
else
  echo "$(date): Sync failed" >> "$LOG_FILE"
fi
```

```bash
# Add a cron job to run the sync every 6 hours
crontab -e
# Add this line:
# 0 */6 * * * /usr/local/bin/registry-sync.sh
```

## Handling Insecure Registries During Sync

For development or internal registries without valid TLS certificates, disable TLS verification.

```bash
# Sync to an insecure destination registry
skopeo sync \
  --src docker \
  --dest docker \
  --dest-tls-verify=false \
  docker.io/library/redis \
  localhost:5000
```

## Summary

Skopeo sync is the right tool for keeping container images in sync across registries. It handles entire repositories with all their tags, supports YAML-based configuration for managing complex multi-image syncs, and works seamlessly with Podman authentication. Whether you are mirroring images for disaster recovery, supplying air-gapped environments, or maintaining consistency across regions, Skopeo sync simplifies the process into a repeatable and automatable workflow.
