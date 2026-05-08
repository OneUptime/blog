# How to Check Volume Disk Usage with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Disk Usage, Storage, Monitoring

Description: Learn how to check and monitor volume disk usage in Podman to manage storage effectively.

---

> Monitoring volume disk usage helps prevent storage exhaustion and identifies containers or volumes consuming excessive space.

Podman volumes can grow over time as applications write data. Tracking disk usage across volumes helps you manage storage proactively, plan capacity, and identify volumes that need cleanup or migration.

---

## Checking Overall System Disk Usage

```bash
# Get a summary of Podman disk usage including volumes

podman system df

# Get detailed per-item breakdown
podman system df -v
```

## Checking Individual Volume Size

```bash
# Get the mountpoint of a specific volume
podman volume inspect mydata --format '{{ .Mountpoint }}'

# Check disk usage of the volume directory
du -sh $(podman volume inspect mydata --format '{{ .Mountpoint }}')

# List files and their sizes in the volume
du -ah $(podman volume inspect mydata --format '{{ .Mountpoint }}') | sort -rh | head -20
```

## Checking All Volume Sizes

```bash
# List all volumes with their sizes
for vol in $(podman volume ls --format '{{ .Name }}'); do
  mountpoint=$(podman volume inspect "$vol" --format '{{ .Mountpoint }}')
  size=$(du -sh "$mountpoint" 2>/dev/null | cut -f1)
  echo "$vol: $size"
done
```

## Checking Disk Usage from Inside a Container

```bash
# Check disk usage inside a running container
podman exec myapp df -h /app/data

# List largest files in the mounted volume
podman exec myapp du -ah /app/data | sort -rh | head -10

# Check specific directory usage
podman exec myapp du -sh /app/data/logs /app/data/cache /app/data/uploads
```

## Using podman system df

```bash
# Summary view
podman system df
# TYPE           TOTAL   ACTIVE  SIZE     RECLAIMABLE
# Images         15      5       4.2GB    2.8GB (66%)
# Containers     8       3       150MB    100MB (66%)
# Local Volumes  6       4       1.2GB    300MB (25%)

# Verbose view showing each volume
podman system df -v
# Local Volumes space usage:
# VOLUME NAME   LINKS   SIZE
# dbdata        1       850MB
# appdata       1       200MB
# cache         0       150MB
```

## Finding Large or Unused Volumes

```bash
# Find volumes not attached to any container
podman volume ls --filter dangling=true

# Check sizes of dangling volumes
for vol in $(podman volume ls --filter dangling=true --format '{{ .Name }}'); do
  mountpoint=$(podman volume inspect "$vol" --format '{{ .Mountpoint }}')
  size=$(du -sh "$mountpoint" 2>/dev/null | cut -f1)
  echo "UNUSED - $vol: $size"
done
```

## Cleaning Up Volume Disk Space

```bash
# Remove all unused (dangling) volumes
podman volume prune

# Remove specific unused volumes
podman volume rm old-cache temp-data

# Clean up unused resources including unused volumes
podman system prune --volumes
```

## Monitoring Volume Growth

```bash
# Create a simple monitoring script
cat > /home/user/scripts/check-volume-sizes.sh << 'EOF'
#!/bin/bash
echo "=== Podman Volume Disk Usage Report ==="
echo "Date: $(date)"
echo ""
for vol in $(podman volume ls --format '{{ .Name }}'); do
  mountpoint=$(podman volume inspect "$vol" --format '{{ .Mountpoint }}')
  size=$(du -sh "$mountpoint" 2>/dev/null | cut -f1)
  printf "%-30s %s\n" "$vol" "$size"
done
echo ""
echo "=== System Summary ==="
podman system df
EOF

chmod +x /home/user/scripts/check-volume-sizes.sh
```

## Summary

Monitor Podman volume disk usage with `podman system df` for an overview and `du` on individual volume mountpoints for detailed analysis. Identify unused volumes with the `dangling=true` filter and reclaim space with `podman volume prune`. Regular monitoring prevents storage exhaustion and helps maintain a clean container environment.
