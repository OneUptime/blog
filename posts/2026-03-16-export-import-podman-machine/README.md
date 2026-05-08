# How to Export and Import a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, Migration

Description: Learn how to export Podman machine disk images and configurations for backup, migration, and sharing with team members.

---

> Exporting and importing Podman machines lets you back up environments, share configurations with teammates, and migrate between workstations.

Podman does not have a built-in `machine export` command, but you can achieve machine portability by exporting the underlying disk images, configuration files, and container data. This guide shows you practical methods for backing up and restoring Podman machines.

---

## Understanding Machine Components

A Podman machine consists of several components that need to be captured:

```bash
# View the configuration directory

podman machine inspect my-machine | jq -r '.[0].ConfigDir.Path'

# View the machine's resource settings
podman machine inspect my-machine | jq '.[0] | {
    name: .Name,
    cpus: .Resources.CPUs,
    memory: .Resources.Memory,
    disk: .Resources.DiskSize,
    rootful: .Rootful
}'
```

## Exporting Machine Configuration

Save the machine configuration to a file for reference when recreating the machine.

```bash
# Export the full machine configuration
podman machine inspect my-machine > machine-config.json

# Export a simplified recreation script
podman machine inspect my-machine | jq -r '.[0] | "podman machine init \(.Name) --cpus \(.Resources.CPUs) --memory \(.Resources.Memory) --disk-size \(.Resources.DiskSize)" + (if .Rootful then " --rootful" else "" end)' > recreate-machine.sh

cat recreate-machine.sh
# Output: podman machine init my-machine --cpus 4 --memory 8192 --disk-size 100
```

## Exporting Container Images

Export the container images stored in the machine:

```bash
# List all images
podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>"

# Save all images to a tar archive
podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" | while read -r image; do
    filename=$(echo "$image" | tr '/:' '_')
    echo "Saving $image to ${filename}.tar"
    podman save -o "${filename}.tar" "$image"
done

# Or save multiple images in one archive
podman save --multi-image-archive -o all-images.tar $(podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" | tr '\n' ' ')
```

## Exporting Container Data

Export data from running containers:

```bash
# Export container filesystem
podman export my-container > container-backup.tar

# Export named volumes
podman volume ls --format "{{.Name}}" | while read -r vol; do
    echo "Exporting volume: $vol"
    podman run --rm -v "${vol}:/data" -v "$(pwd):/backup" alpine \
        tar czf "/backup/volume-${vol}.tar.gz" -C /data .
done
```

## Creating a Full Machine Backup Script

Here is a comprehensive backup script:

```bash
#!/bin/bash
# Full Podman machine backup

MACHINE="${1:-podman-machine-default}"
BACKUP_DIR="podman-backup-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "=== Backing up Podman machine: $MACHINE ==="

# 1. Save machine configuration
echo "Saving machine configuration..."
podman machine inspect "$MACHINE" > "$BACKUP_DIR/machine-config.json"

# 2. Save image list
echo "Saving image list..."
podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" > "$BACKUP_DIR/images.txt"

# 3. Save container list and details
echo "Saving container details..."
podman ps -a --format json > "$BACKUP_DIR/containers.json"

# 4. Save all images
echo "Saving container images..."
mkdir -p "$BACKUP_DIR/images"
while read -r image; do
    filename=$(echo "$image" | tr '/:' '_')
    podman save -o "$BACKUP_DIR/images/${filename}.tar" "$image" 2>/dev/null
    echo "  Saved: $image"
done < "$BACKUP_DIR/images.txt"

# 5. Save volumes
echo "Saving volumes..."
mkdir -p "$BACKUP_DIR/volumes"
podman volume ls --format "{{.Name}}" | while read -r vol; do
    podman run --rm -v "${vol}:/data" -v "$(pwd)/$BACKUP_DIR/volumes:/backup" alpine \
        tar czf "/backup/${vol}.tar.gz" -C /data . 2>/dev/null
    echo "  Saved volume: $vol"
done

# 6. Save network configurations
echo "Saving network configurations..."
podman network ls --format json > "$BACKUP_DIR/networks.json"

echo ""
echo "Backup complete: $BACKUP_DIR"
du -sh "$BACKUP_DIR"
```

## Importing on a New Machine

Restore from a backup on a new system:

```bash
#!/bin/bash
# Restore Podman machine from backup

BACKUP_DIR="${1:?Usage: $0 <backup-directory>}"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

echo "=== Restoring Podman Machine ==="

# 1. Recreate the machine from saved configuration
echo "Creating machine from configuration..."
cpus=$(jq '.[0].Resources.CPUs' "$BACKUP_DIR/machine-config.json")
memory=$(jq '.[0].Resources.Memory' "$BACKUP_DIR/machine-config.json")
disk=$(jq '.[0].Resources.DiskSize' "$BACKUP_DIR/machine-config.json")
name=$(jq -r '.[0].Name' "$BACKUP_DIR/machine-config.json")

podman machine init "$name" --cpus "$cpus" --memory "$memory" --disk-size "$disk"
podman machine start "$name"

# 2. Load images
echo "Loading images..."
for tarfile in "$BACKUP_DIR/images/"*.tar; do
    [ -f "$tarfile" ] || continue
    echo "  Loading: $(basename "$tarfile")"
    podman load -i "$tarfile"
done

# 3. Restore volumes
echo "Restoring volumes..."
for voltar in "$BACKUP_DIR/volumes/"*.tar.gz; do
    [ -f "$voltar" ] || continue
    volname=$(basename "$voltar" .tar.gz)
    echo "  Restoring volume: $volname"
    podman volume create "$volname"
    podman run --rm -v "${volname}:/data" -v "$(cd "$(dirname "$voltar")" && pwd):/backup:ro" alpine \
        tar xzf "/backup/$(basename "$voltar")" -C /data
done

# 4. Recreate networks
echo "Restoring networks..."
jq -r '.[] | select(.Name != "podman") | .Name' "$BACKUP_DIR/networks.json" | while read -r net; do
    podman network create "$net" 2>/dev/null
    echo "  Created network: $net"
done

echo ""
echo "Restore complete. Images and volumes have been restored."
echo "You may need to manually recreate containers with their original run commands."
```

## Quick Image Transfer Between Machines

For quick image transfers between Podman machines:

```bash
# Save an image from one machine
podman --connection machine-a save myapp:latest -o myapp.tar

# Load it on another machine
podman --connection machine-b load -i myapp.tar
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine inspect <name> > config.json` | Export configuration |
| `podman save -o image.tar <image>` | Export a container image |
| `podman load -i image.tar` | Import a container image |
| `podman export <container> > backup.tar` | Export container filesystem |

## Summary

While Podman does not have a single command to export a complete machine, you can achieve full portability by exporting the machine configuration, container images, volumes, and network settings separately. Use the backup and restore scripts in this guide as a starting point, and customize them for your specific workflow. This approach works for backups, team sharing, and migration between workstations.
