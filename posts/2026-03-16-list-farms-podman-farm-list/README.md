# How to List Farms with podman farm list

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Multi-Architecture, Build Farm

Description: Learn how to use the podman farm list command to view all configured build farms, their connections, and status information.

---

> The podman farm list command gives you a quick overview of all your build farms and their associated connections.

When managing multiple build farms for different projects or environments, you need a way to see what is configured. The `podman farm list` command displays all defined farms along with their system connections. This guide covers the command and its formatting options.

---

## Basic Usage

```bash
# List all configured farms

podman farm list
```

Default output:

```text
Name            Connections                                    Default  ReadWrite
dev-farm        [amd64-builder]                                false    true
prod-farm       [amd64-builder arm64-builder ppc64le-builder]  true     true
arm-test-farm   [arm64-builder]                                false    true
```

## Formatting Output

Use the `--format` flag with Go templates to customize the output:

```bash
# Show only farm names
podman farm list --format '{{.Name}}'

# Show names and connections in a custom format
podman farm list --format 'Farm: {{.Name}} | Nodes: {{.Connections}}'

# JSON output for scripting
podman farm list --format json
```

Example JSON output:

```json
[
  {
    "Name": "dev-farm",
    "Connections": [
      "amd64-builder"
    ],
    "Default": false,
    "ReadWrite": true
  },
  {
    "Name": "prod-farm",
    "Connections": [
      "amd64-builder",
      "arm64-builder",
      "ppc64le-builder"
    ],
    "Default": true,
    "ReadWrite": true
  }
]
```

## Checking If a Specific Farm Exists

```bash
# Check if a farm exists by name
if podman farm list --format '{{.Name}}' | grep -q "^prod-farm$"; then
    echo "prod-farm exists"
else
    echo "prod-farm not found"
fi
```

## Counting Farms

```bash
# Count the number of configured farms
podman farm list --format '{{.Name}}' | wc -l

# Count farms with more than one connection
podman farm list --format '{{range .Connections}}{{.}} {{end}}' | \
    awk 'NF > 1' | wc -l
```

## Listing Connections for a Specific Farm

```bash
# Get connections for a specific farm
podman farm list --format '{{.Name}} {{range .Connections}}{{.}} {{end}}' | \
    grep "^prod-farm " | \
    cut -d' ' -f2- | \
    tr ' ' '\n' | \
    sed '/^$/d'
```

Output:

```text
amd64-builder
arm64-builder
ppc64le-builder
```

## Scripting with podman farm list

```bash
#!/bin/bash
# list-farm-status.sh - Show farm status with connection health

echo "=== Podman Build Farms ==="
echo ""

# Get all farm names
FARMS=$(podman farm list --format '{{.Name}}')

if [ -z "${FARMS}" ]; then
    echo "No farms configured."
    exit 0
fi

for FARM in ${FARMS}; do
    # Get connections for this farm
    CONNECTIONS=$(podman farm list --format '{{.Name}} {{range .Connections}}{{.}} {{end}}' | \
        awk -v farm="${FARM}" '$1 == farm {for (i=2; i<=NF; i++) print $i}')

    echo "Farm: ${FARM}"
    echo "  Connections:"

    for CONN in ${CONNECTIONS}; do
        # Test each connection
        if podman --connection "${CONN}" info >/dev/null 2>&1; then
            ARCH=$(podman --connection "${CONN}" info --format '{{.Host.Arch}}')
            echo "    ${CONN}: OK (${ARCH})"
        else
            echo "    ${CONN}: UNREACHABLE"
        fi
    done
    echo ""
done
```

## Verifying Farm Configuration Before Builds

```bash
#!/bin/bash
# pre-build-check.sh - Verify farm is ready for building

FARM_NAME="${1:-prod-farm}"

echo "Checking farm: ${FARM_NAME}"

# Verify the farm exists
if ! podman farm list --format '{{.Name}}' | grep -q "^${FARM_NAME}$"; then
    echo "ERROR: Farm '${FARM_NAME}' does not exist."
    echo "Available farms:"
    podman farm list
    exit 1
fi

echo "Farm '${FARM_NAME}' found. Ready to build."
```

## When the List Is Empty

If no farms are configured, the command returns an empty table:

```bash
# If no farms exist
podman farm list
# Name    Connections  Default  ReadWrite
# (empty)

# Check programmatically
FARM_COUNT=$(podman farm list --format '{{.Name}}' | wc -l)
if [ "${FARM_COUNT}" -eq 0 ]; then
    echo "No farms configured. Create one with: podman farm create <name> <connections...>"
fi
```

## Summary

Use `podman farm list` to view all configured build farms and their associated system connections. The `--format` flag supports Go templates and JSON output for scripting. Combine it with connection health checks to verify your farm is ready before triggering builds.
