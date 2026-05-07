# How to Configure Additional Image Stores in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Storage, Image Management, Multi-User

Description: Learn how to configure additional image stores in Podman to share read-only base images across multiple users and reduce disk usage.

---

> Additional image stores let multiple Podman users share a common set of base images in read-only mode, dramatically reducing disk usage on multi-user systems.

In environments where many users run the same container images, each user's storage can consume gigabytes of duplicate data. Podman's additional image stores feature solves this by allowing users to reference a shared, read-only image store while maintaining their own writable storage for containers. This guide covers setup and management of shared image stores.

---

## Understanding Additional Image Stores

Additional image stores provide read-only access to shared images.

```bash
# View the current storage configuration

podman info --format '{{.Store.GraphRoot}}'

# Additional image stores are read-only container image stores
# that Podman checks before pulling from a registry

# How it works:
# 1. Admin populates a shared store with common images
# 2. Users configure the shared store as an additional store
# 3. Podman checks the shared store before pulling remotely
# 4. Users get fast access without duplicating images
```

## Creating a Shared Image Store

Set up a centralized image store that multiple users can access.

```bash
# Create the shared store directory (as root)
sudo mkdir -p /shared/containers/storage

# Pull images into the shared store using root Podman
# Configure root Podman to use the shared location
sudo tee /tmp/shared-storage.conf > /dev/null << 'EOF'
[storage]
driver = "overlay"
graphroot = "/shared/containers/storage"
runroot = "/run/shared-containers"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
mountopt = "nodev"
force_mask = "shared"
EOF

# Pull common base images into the shared store
sudo CONTAINERS_STORAGE_CONF=/tmp/shared-storage.conf podman pull alpine:latest
sudo CONTAINERS_STORAGE_CONF=/tmp/shared-storage.conf podman pull nginx:latest
sudo CONTAINERS_STORAGE_CONF=/tmp/shared-storage.conf podman pull python:3-slim
sudo CONTAINERS_STORAGE_CONF=/tmp/shared-storage.conf podman pull node:lts-alpine

# Clean up temporary config
sudo rm /tmp/shared-storage.conf
```

## Configuring Users to Access the Shared Store

Point user-level storage to the shared image store.

```bash
# Create user storage configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

# User's own writable storage (for containers and custom images)
graphroot = "$HOME/.local/share/containers/storage"
runroot = "$XDG_RUNTIME_DIR/containers"

[storage.options]
# Reference the shared read-only image store
# Podman checks these stores before pulling from registry
additionalimagestores = [
    "/shared/containers/storage"
]

[storage.options.overlay]
mountopt = "nodev"
EOF

# Start a new Podman command to pick up the new configuration
# If you are changing the storage driver for initialized storage, follow the
# podman system reset documentation before editing storage.conf.
# Do not run podman system reset unless you intend to remove local containers,
# images, volumes, and storage directories.

# Verify the additional store is configured
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
store = info.get('store', {})
print('Graph Root:', store.get('graphRoot'))
print('Image Store Count:', store.get('imageStore', {}).get('number', 0))
"
```

## Verifying Shared Image Access

Confirm users can access images from the shared store.

```bash
# List available images (should include shared store images)
podman images

# Run a container from a shared image
# This should not trigger a download if the image is in the shared store
podman run --rm alpine echo "Running from shared store"

# Verify the image can be inspected from local storage
podman image inspect alpine:latest --format '{{.Id}}' 2>/dev/null

# Confirm the user's writable store stayed small
du -sh ~/.local/share/containers/storage/ 2>/dev/null
```

## Managing Multiple Additional Stores

Configure access to multiple shared image stores.

```bash
# Configure multiple additional stores
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options]
# Multiple additional stores (checked in order)
additionalimagestores = [
    "/shared/containers/base-images",
    "/shared/containers/dev-images",
    "/shared/containers/team-images"
]

[storage.options.overlay]
mountopt = "nodev"
EOF

# Podman checks stores in the listed order:
# 1. User's own graphroot (writable)
# 2. /shared/containers/base-images (read-only)
# 3. /shared/containers/dev-images (read-only)
# 4. /shared/containers/team-images (read-only)
# 5. Remote registry (if not found locally)
```

## Updating the Shared Store

Keep the shared image store current with latest versions.

```bash
# Update images in the shared store (as root)
# Create an update script
sudo tee /usr/local/bin/update-shared-images.sh > /dev/null << 'SCRIPT'
#!/bin/bash
# Update shared container images

STORAGE_CONF="/tmp/shared-storage.conf"

cat > "$STORAGE_CONF" << EOF
[storage]
driver = "overlay"
graphroot = "/shared/containers/storage"
runroot = "/run/shared-containers"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
mountopt = "nodev"
force_mask = "shared"
EOF

# Pull latest versions of base images
IMAGES=(
    "alpine:latest"
    "nginx:latest"
    "python:3-slim"
    "node:lts-alpine"
)

for img in "${IMAGES[@]}"; do
    echo "Updating $img..."
    CONTAINERS_STORAGE_CONF="$STORAGE_CONF" podman pull "$img"
done

# Clean up old unused images
CONTAINERS_STORAGE_CONF="$STORAGE_CONF" podman image prune -f

rm "$STORAGE_CONF"
echo "Shared image store updated."
SCRIPT

sudo chmod +x /usr/local/bin/update-shared-images.sh

# Run manually or schedule with cron
# sudo /usr/local/bin/update-shared-images.sh
```

## Troubleshooting Shared Stores

Fix common issues with additional image stores.

```bash
# Issue: Images from shared store not visible
# Check permissions on the shared store
ls -la /shared/containers/storage/ 2>/dev/null

# Ensure the user can read the shared store
test -r /shared/containers/storage && echo "Readable" || echo "Not readable"

# Issue: Driver mismatch between stores
# Both stores must use the same storage driver
podman info --format '{{.Store.GraphDriverName}}'

# Issue: Configuration not loading
podman --log-level=debug info 2>&1 | grep -i "additional\|store" | head -10

# Verify the configuration file syntax
podman info > /dev/null 2>&1 && echo "Config valid" || echo "Config error"

# If you intentionally want to remove all local Podman storage, reset and retry
# podman system reset --force
podman images
```

## Summary

Additional image stores in Podman enable efficient sharing of base images across multiple users through read-only stores. Set up a centralized shared store populated by an administrator, then configure users to reference it via `additionalimagestores` in `storage.conf`. This reduces disk usage by avoiding duplicate image downloads and speeds up container startup for shared images. Ensure consistent storage drivers across all stores and maintain proper read permissions.
