# How to Inspect a Volume with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Storage

Description: Learn how to use podman volume inspect to view detailed information about Podman volumes, including mount points, labels, options, and creation timestamps.

---

> The podman volume inspect command reveals everything about a volume: where it lives on disk, when it was created, what labels it carries, and how it was configured.

When troubleshooting storage issues or auditing your container environment, you need detailed information about volumes. The `podman volume inspect` command provides a complete view of a volume's configuration and metadata. This guide covers all the ways to extract useful information from it.

---

## Basic Inspection

```bash
# Inspect a volume by name

podman volume inspect mydata
```

Example output:

```json
[
    {
        "Name": "mydata",
        "Driver": "local",
        "Mountpoint": "/home/user/.local/share/containers/storage/volumes/mydata/_data",
        "CreatedAt": "2026-03-16T10:30:00Z",
        "Labels": {},
        "Scope": "local",
        "Options": {},
        "MountCount": 0,
        "NeedsCopyUp": true,
        "NeedsChown": true
    }
]
```

## Extracting Specific Fields

Use the `--format` flag with Go templates to extract individual fields:

```bash
# Get the mount point
podman volume inspect mydata --format '{{.Mountpoint}}'
# Output: /home/user/.local/share/containers/storage/volumes/mydata/_data

# Get the creation date
podman volume inspect mydata --format '{{.CreatedAt}}'

# Get the driver
podman volume inspect mydata --format '{{.Driver}}'

# Get labels
podman volume inspect mydata --format '{{.Labels}}'

# Get volume name
podman volume inspect mydata --format '{{.Name}}'
```

## Inspecting Multiple Volumes

```bash
# Inspect multiple volumes at once
podman volume inspect mydata pgdata appdata

# Format output for multiple volumes
podman volume inspect mydata pgdata --format '{{.Name}}: {{.Mountpoint}}'
```

## Checking Volume Contents

After finding the mount point, you can check what is stored in the volume:

```bash
# Get the mount point
MOUNTPOINT=$(podman volume inspect mydata --format '{{.Mountpoint}}')

# List files in the volume
ls -la "${MOUNTPOINT}"

# Check volume size
du -sh "${MOUNTPOINT}"

# Check available space on the filesystem
df -h "${MOUNTPOINT}"
```

## Inspecting Volume Labels

Labels help organize volumes by project, environment, or purpose:

```bash
# Create a labeled volume
podman volume create --label app=webapp --label tier=database dbvol

# Inspect labels
podman volume inspect dbvol --format '{{.Labels}}'
# Output: map[app:webapp tier:database]

# Get a specific label value
podman volume inspect dbvol --format '{{index .Labels "app"}}'
# Output: webapp
```

## Inspecting Volume Options

```bash
# Create a volume with options
podman volume create --opt device=tmpfs --opt type=tmpfs --opt o=size=256m tmpvol

# Inspect the options
podman volume inspect tmpvol --format '{{.Options}}'

# Check specific option
podman volume inspect tmpvol --format '{{index .Options "type"}}'
```

## Volume Audit Script

```bash
#!/bin/bash
# audit-volumes.sh - Detailed audit of all Podman volumes

echo "=== Volume Audit Report ==="
echo "Generated: $(date)"
echo ""

podman volume ls --format '{{.Name}}' | while read -r VOL; do
    echo "Volume: ${VOL}"
    echo "  Driver: $(podman volume inspect "${VOL}" --format '{{.Driver}}')"
    echo "  Mount: $(podman volume inspect "${VOL}" --format '{{.Mountpoint}}')"
    echo "  Created: $(podman volume inspect "${VOL}" --format '{{.CreatedAt}}')"

    MOUNTPOINT=$(podman volume inspect "${VOL}" --format '{{.Mountpoint}}')
    if [ -d "${MOUNTPOINT}" ]; then
        SIZE=$(du -sh "${MOUNTPOINT}" 2>/dev/null | awk '{print $1}')
        FILES=$(find "${MOUNTPOINT}" -type f 2>/dev/null | wc -l)
        echo "  Size: ${SIZE}"
        echo "  Files: ${FILES}"
    else
        echo "  Size: (mount point not accessible)"
    fi

    LABELS=$(podman volume inspect "${VOL}" --format '{{.Labels}}')
    echo "  Labels: ${LABELS}"
    echo ""
done
```

## Checking If a Container Uses a Volume

```bash
# Find which containers use a specific volume
VOLUME_NAME="pgdata"

podman ps -a --format '{{.Names}}' | while read -r CONTAINER; do
    podman inspect "${CONTAINER}" --format '{{range .Mounts}}{{if eq .Name "'"${VOLUME_NAME}"'"}}{{$.Name}} uses '"${VOLUME_NAME}"' at {{.Destination}}{{"\n"}}{{end}}{{end}}' 2>/dev/null
done
```

## JSON Output for Programmatic Use

```bash
# Full JSON output (default output is already JSON)
podman volume inspect mydata

# Parse with jq
podman volume inspect mydata | jq '.[0].Mountpoint'

# Extract multiple fields
podman volume inspect mydata | jq '.[0] | {name: .Name, mount: .Mountpoint, created: .CreatedAt}'
```

## Summary

The `podman volume inspect` command provides detailed metadata about volumes including mount points, creation timestamps, labels, and driver options. Use `--format` with Go templates to extract specific fields. Combine inspection with filesystem commands to audit volume contents and disk usage. This is essential for troubleshooting storage issues and auditing container environments.
