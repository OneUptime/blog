# How to Reset Podman Configuration to Defaults

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Troubleshooting, Reset

Description: Learn how to reset Podman configuration and storage to factory defaults when troubleshooting issues or starting fresh.

---

> Resetting Podman to its defaults is the most effective way to recover from configuration errors, storage corruption, or when you need a clean starting point.

Configuration drift, corrupted storage, and conflicting settings can cause Podman to behave unpredictably. Knowing how to safely reset Podman to its default state is an essential troubleshooting skill. This guide covers multiple reset approaches, from partial resets to full factory resets, and how to back up your work before resetting.

---

## Understanding What Gets Reset

Know what is removed during different types of resets.

```bash
# Check current state before any reset

echo "=== Current Podman State ==="
echo "Images: $(podman images -q 2>/dev/null | wc -l)"
echo "Containers: $(podman ps -aq 2>/dev/null | wc -l)"
echo "Volumes: $(podman volume ls -q 2>/dev/null | wc -l)"
echo "Networks: $(podman network ls -q 2>/dev/null | wc -l)"
echo ""
echo "Storage Root: $(podman info --format '{{.Store.GraphRoot}}')"
echo "Storage Config File: $(podman info --format '{{.Store.ConfigFile}}')"
```

## Backing Up Before Reset

Save important data before resetting.

```bash
# Create a backup directory
BACKUP_DIR="$HOME/podman-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Back up configuration files
cp ~/.config/containers/containers.conf "$BACKUP_DIR/" 2>/dev/null
cp ~/.config/containers/storage.conf "$BACKUP_DIR/" 2>/dev/null
cp -r ~/.config/containers/containers.conf.d/ "$BACKUP_DIR/containers.conf.d/" 2>/dev/null
cp ~/.config/containers/registries.conf "$BACKUP_DIR/" 2>/dev/null

# Save important images
podman images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' > "$BACKUP_DIR/image-list.txt"

# Export specific images
# podman save -o "$BACKUP_DIR/my-image.tar" my-image:latest

# Export container data if needed
# podman export my-container > "$BACKUP_DIR/my-container.tar"

echo "Backup saved to: $BACKUP_DIR"
ls -la "$BACKUP_DIR/"
```

## Resetting Configuration Only

Remove custom configuration without touching storage.

```bash
# Remove user-level containers.conf
rm -f ~/.config/containers/containers.conf

# Remove user-level storage.conf
rm -f ~/.config/containers/storage.conf

# Remove drop-in configuration files
rm -rf ~/.config/containers/containers.conf.d/

# Remove registries configuration
rm -f ~/.config/containers/registries.conf

# Verify Podman falls back to system defaults
podman info --format '{{.Host.OCIRuntime.Name}}'
podman info --format '{{.Store.GraphDriverName}}'

# Check the storage configuration file now in use
podman info --format '{{.Store.ConfigFile}}'
```

## Full System Reset

Reset all Podman storage, containers, and images.

```bash
# WARNING: This removes ALL pods, containers, images, volumes, networks, build cache, and Podman machines

# Stop all running containers first
podman stop -a 2>/dev/null

# Perform a full system reset
podman system reset --force

# Verify the reset was successful
echo "Images after reset: $(podman images -q 2>/dev/null | wc -l)"
echo "Containers after reset: $(podman ps -aq 2>/dev/null | wc -l)"
echo "Volumes after reset: $(podman volume ls -q 2>/dev/null | wc -l)"

# Verify Podman is functional
podman run --rm alpine echo "Podman reset successful"
```

## Resetting Storage and Podman State Only

Reset storage and Podman state while preserving configuration.

```bash
# Back up configuration first
mkdir -p /tmp/podman-config-backup
cp ~/.config/containers/containers.conf /tmp/podman-config-backup/ 2>/dev/null
cp ~/.config/containers/storage.conf /tmp/podman-config-backup/ 2>/dev/null

# Reset everything
podman system reset --force

# Restore configuration
cp /tmp/podman-config-backup/containers.conf ~/.config/containers/ 2>/dev/null
cp /tmp/podman-config-backup/storage.conf ~/.config/containers/ 2>/dev/null

# Clean up backup
rm -rf /tmp/podman-config-backup

# Verify configuration is restored but storage is clean
podman info --format '{{.Host.OCIRuntime.Name}}'
echo "Images: $(podman images -q 2>/dev/null | wc -l)"
```

## Resetting Root Podman

Reset system-wide Podman configuration and storage.

```bash
# Reset root Podman storage
sudo podman system reset --force

# Optionally remove system-wide configuration
# sudo rm -f /etc/containers/containers.conf
# sudo rm -rf /etc/containers/containers.conf.d/

# Restore default configuration from vendor packages
# sudo cp /usr/share/containers/containers.conf /etc/containers/containers.conf

# Verify root Podman is functional
sudo podman info --format '{{.Store.GraphDriverName}}'
sudo podman run --rm alpine echo "Root Podman reset successful"
```

## Migrating Containers After Runtime or UID/GID Changes

Use system migrate when changing runtime settings or rootless user namespace mappings.

```bash
# podman system migrate updates containers for the current Podman version
# It also stops the rootless pause process so /etc/subuid and /etc/subgid changes can take effect
podman system migrate

# Migrate existing containers to a new OCI runtime if needed
# podman system migrate --new-runtime crun

# Verify the current runtime and storage driver
podman info --format '{{.Host.OCIRuntime.Name}}'
podman info --format '{{.Store.GraphDriverName}}'
```

## Restoring from Backup

Rebuild your environment after a reset.

```bash
# Restore configuration files from backup
BACKUP_DIR="$HOME/podman-backup-$(date +%Y%m%d)"

# Restore configuration
mkdir -p ~/.config/containers
cp "$BACKUP_DIR/containers.conf" ~/.config/containers/ 2>/dev/null
cp "$BACKUP_DIR/storage.conf" ~/.config/containers/ 2>/dev/null
cp -r "$BACKUP_DIR/containers.conf.d/" ~/.config/containers/ 2>/dev/null
cp "$BACKUP_DIR/registries.conf" ~/.config/containers/ 2>/dev/null

# Re-pull images from the saved list
if [ -f "$BACKUP_DIR/image-list.txt" ]; then
    while IFS= read -r image; do
        echo "Pulling: $image"
        podman pull "$image" 2>/dev/null
    done < "$BACKUP_DIR/image-list.txt"
fi

# Load saved image tarballs
# podman load -i "$BACKUP_DIR/my-image.tar"

# Verify restoration
podman images
podman info --format '{{.Host.OCIRuntime.Name}}'
```

## Creating a Clean Default Configuration

Start fresh with a well-structured default configuration.

```bash
# Create a clean, documented configuration
mkdir -p ~/.config/containers/containers.conf.d

# Minimal containers.conf with sensible defaults
cat > ~/.config/containers/containers.conf << 'EOF'
# Podman configuration - clean defaults

[containers]
tz = "local"
env = ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"]

[engine]
runtime = "crun"
pull_policy = "missing"

[network]
network_backend = "netavark"
EOF

# Minimal storage.conf
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mountopt = "nodev,metacopy=on"
ignore_chown_errors = "true"
EOF

# Verify the clean configuration
podman info > /dev/null 2>&1 && echo "Clean configuration applied"
podman run --rm alpine echo "Fresh Podman setup complete"
```

## Summary

Resetting Podman to defaults involves removing configuration files and using `podman system reset --force` to clear storage and Podman state. Always back up important images and configuration files before resetting. Use `podman system migrate` for Podman version, runtime, or rootless UID/GID mapping migrations when appropriate. After a reset, restore configuration from backups and re-pull needed images. A clean default configuration with documented settings provides a solid foundation for a fresh start.
