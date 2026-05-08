# How to List Volumes with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Storage

Description: Learn how to list and filter Podman volumes using podman volume list with formatting options, filters, and scripting patterns.

---

> The podman volume list command gives you visibility into all persistent storage managed by Podman, with filters and format options for automation.

As your container environment grows, you accumulate volumes for databases, application data, logs, and caches. The `podman volume list` command helps you track what exists, filter by labels or usage, and output data in formats suitable for scripting.

---

## Basic Volume Listing

```bash
# List all volumes

podman volume list
```

Default output:

```text
DRIVER    VOLUME NAME
local     appdata
local     mydata
local     pgdata
```

## Formatting Output

Use Go templates to customize what is displayed:

```bash
# Show only volume names
podman volume list --format '{{.Name}}'

# Show name and driver
podman volume list --format 'table {{.Name}}\t{{.Driver}}'

# Show name and creation time
podman volume list --format '{{.Name}} created: {{.CreatedAt}}'

# JSON output for programmatic use
podman volume list --format json
```

## Filtering Volumes

Filter volumes by various criteria:

```bash
# Filter by label
podman volume list --filter label=project=webapp

# Filter by name (partial match)
podman volume list --filter name=app

# Filter by driver
podman volume list --filter driver=local

# Filter for dangling volumes (not used by any container)
podman volume list --filter dangling=true

# Combine filters
podman volume list --filter label=env=production --filter dangling=false
```

## Counting Volumes

```bash
# Count total volumes
podman volume list --format '{{.Name}}' | wc -l

# Count dangling volumes
podman volume list --filter dangling=true --format '{{.Name}}' | wc -l

# Count volumes by label
podman volume list --filter label=project=webapp --format '{{.Name}}' | wc -l
```

## Finding Volumes Used by a Container

```bash
# See which volumes a specific container uses
podman inspect mycontainer --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} -> {{.Destination}}{{"\n"}}{{end}}{{end}}'

# List all containers and their volume mounts
podman ps -a --format '{{.Names}}' | while read -r CONTAINER; do
    VOLS=$(podman inspect "${CONTAINER}" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}' 2>/dev/null)
    if [ -n "${VOLS}" ]; then
        echo "${CONTAINER}: ${VOLS}"
    fi
done
```

## Finding Unused Volumes

```bash
# List volumes not attached to any container
podman volume list --filter dangling=true

# Script to show volume usage status
podman volume list --format '{{.Name}}' | while read -r VOL; do
    # Check if any container uses this volume
    USERS=$(podman ps -a --filter volume="${VOL}" --format '{{.Names}}' 2>/dev/null)
    if [ -z "${USERS}" ]; then
        echo "[UNUSED] ${VOL}"
    else
        echo "[IN USE] ${VOL} -> ${USERS}"
    fi
done
```

## Volume Size Information

```bash
# Get disk usage for volumes
podman system df -v

# Get the mount point and check its size
podman volume list --format '{{.Name}}' | while read -r VOL; do
    MOUNTPOINT=$(podman volume inspect "${VOL}" --format '{{.Mountpoint}}')
    SIZE=$(du -sh "${MOUNTPOINT}" 2>/dev/null | awk '{print $1}')
    echo "${VOL}: ${SIZE:-unknown}"
done
```

## Monitoring Script

```bash
#!/bin/bash
# volume-report.sh - Generate a volume status report

echo "=== Podman Volume Report ==="
echo "Date: $(date)"
echo ""

TOTAL=$(podman volume list --format '{{.Name}}' | wc -l)
DANGLING=$(podman volume list --filter dangling=true --format '{{.Name}}' | wc -l)

echo "Total volumes: ${TOTAL}"
echo "Unused volumes: ${DANGLING}"
echo ""

echo "Volume Details:"
echo "---"

podman volume list --format '{{.Name}}' | while read -r VOL; do
    MOUNTPOINT=$(podman volume inspect "${VOL}" --format '{{.Mountpoint}}' 2>/dev/null)
    LABELS=$(podman volume inspect "${VOL}" --format '{{.Labels}}' 2>/dev/null)
    SIZE=$(du -sh "${MOUNTPOINT}" 2>/dev/null | awk '{print $1}')
    echo "  ${VOL}: size=${SIZE:-?} labels=${LABELS}"
done
```

## Summary

Use `podman volume list` to view all volumes, with `--filter` to narrow results by label, name, driver, or dangling status, and `--format` for custom output including JSON. Combine it with `podman volume inspect` and container inspection to get a complete picture of volume usage in your environment.
