# How to Inspect an Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image

Description: Learn how to inspect container images with Podman to view detailed metadata, configuration, layers, environment variables, and more.

---

> Inspecting an image reveals detailed metadata about how it was built and configured, which is essential for debugging and security auditing.

The `podman inspect` command provides detailed metadata about container images, including configuration, environment variables, exposed ports, volumes, labels, and layer information. This guide shows you how to use image inspection effectively for debugging, security auditing, and understanding image internals.

---

## Basic Image Inspection

View the full JSON metadata for an image.

```bash
# Inspect an image by name and tag

podman inspect nginx:1.25

# Inspect by image ID
podman inspect a3ed95caeb02

# Pretty-print the output
podman inspect nginx:1.25 | python3 -m json.tool

# Explicitly specify you're inspecting an image (not a container)
podman image inspect nginx:1.25
```

## Extracting Specific Fields

Use Go format templates to extract specific information.

```bash
# Get the image architecture
podman inspect nginx:1.25 --format '{{.Architecture}}'

# Get the operating system
podman inspect nginx:1.25 --format '{{.Os}}'

# Get the image digest
podman inspect nginx:1.25 --format '{{.Digest}}'

# Get the image ID
podman inspect nginx:1.25 --format '{{.Id}}'

# Get the creation date
podman inspect nginx:1.25 --format '{{.Created}}'
```

## Viewing Image Configuration

Inspect the runtime configuration embedded in the image.

```bash
# Get the default command (CMD)
podman inspect nginx:1.25 --format '{{.Config.Cmd}}'

# Get the entrypoint
podman inspect nginx:1.25 --format '{{.Config.Entrypoint}}'

# Get the working directory
podman inspect nginx:1.25 --format '{{.Config.WorkingDir}}'

# Get the user the container runs as
podman inspect nginx:1.25 --format '{{.Config.User}}'

# Get the stop signal
podman inspect nginx:1.25 --format '{{.Config.StopSignal}}'
```

## Viewing Environment Variables

List all environment variables set in the image.

```bash
# Get all environment variables
podman inspect nginx:1.25 --format '{{range .Config.Env}}{{println .}}{{end}}'

# Get environment variables as JSON
podman inspect nginx:1.25 --format '{{json .Config.Env}}' | python3 -m json.tool

# Search for a specific environment variable
podman inspect nginx:1.25 --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep PATH
```

## Viewing Exposed Ports

Check which ports the image declares as exposed.

```bash
# Get exposed ports
podman inspect nginx:1.25 --format '{{json .Config.ExposedPorts}}' | python3 -m json.tool

# List exposed ports in a readable format
podman inspect nginx:1.25 \
  --format '{{range $port, $_ := .Config.ExposedPorts}}{{$port}}{{"\n"}}{{end}}'
```

## Viewing Volumes

Check which volumes the image defines.

```bash
# Get defined volumes
podman inspect nginx:1.25 --format '{{json .Config.Volumes}}' | python3 -m json.tool

# List volume mount points
podman inspect nginx:1.25 \
  --format '{{range $vol, $_ := .Config.Volumes}}{{$vol}}{{"\n"}}{{end}}'
```

## Viewing Labels

Inspect all labels embedded in the image.

```bash
# Get all labels as JSON
podman inspect nginx:1.25 --format '{{json .Labels}}' | python3 -m json.tool

# Get a specific label
podman inspect nginx:1.25 --format '{{index .Labels "maintainer"}}'

# List all label keys and values
podman inspect nginx:1.25 \
  --format '{{range $key, $val := .Labels}}{{$key}}: {{$val}}{{"\n"}}{{end}}'
```

## Viewing Layer Information

Inspect the image layers that make up the filesystem.

```bash
# Get the list of layer digests
podman inspect nginx:1.25 --format '{{json .RootFS.Layers}}' | python3 -m json.tool

# Count the number of layers
podman inspect nginx:1.25 --format '{{len .RootFS.Layers}}'

# Get the root filesystem type
podman inspect nginx:1.25 --format '{{.RootFS.Type}}'
```

## Viewing Image Size Information

Get detailed size information.

```bash
# Get the virtual size
podman inspect nginx:1.25 --format '{{.VirtualSize}}'

# Get the size in a human-readable script
podman inspect nginx:1.25 --format '{{.VirtualSize}}' | \
  awk '{printf "%.2f MB\n", $1/1024/1024}'

# Compare sizes of multiple images
for img in nginx:1.25 alpine:3.19 python:3.12; do
  SIZE=$(podman inspect "$img" --format '{{.VirtualSize}}' 2>/dev/null)
  if [ -n "$SIZE" ]; then
    echo "$img: $(echo "$SIZE" | awk '{printf "%.2f MB", $1/1024/1024}')"
  fi
done
```

## Security Auditing with Inspect

Use inspection for security analysis.

```bash
#!/bin/bash
# Security audit script for container images

IMAGE="${1:?Usage: $0 <image>}"

echo "=== Security Audit: ${IMAGE} ==="
echo ""

echo "--- User ---"
USER=$(podman inspect "$IMAGE" --format '{{.Config.User}}')
echo "Runs as: ${USER:-root (default)}"
[ -z "$USER" ] && echo "WARNING: Image runs as root by default"

echo ""
echo "--- Exposed Ports ---"
podman inspect "$IMAGE" --format '{{json .Config.ExposedPorts}}' 2>/dev/null

echo ""
echo "--- Environment Variables ---"
podman inspect "$IMAGE" --format '{{range .Config.Env}}{{println .}}{{end}}'

echo ""
echo "--- Labels ---"
podman inspect "$IMAGE" --format '{{json .Labels}}' | python3 -m json.tool 2>/dev/null

echo ""
echo "--- Layer Count ---"
echo "$(podman inspect "$IMAGE" --format '{{len .RootFS.Layers}}') layers"
```

## Summary

The `podman inspect` command is your window into the internals of a container image. Use it to understand image configuration, debug runtime issues, audit security properties, and extract metadata for automation. Mastering format templates allows you to pull exactly the data you need from the rich metadata that every container image carries.
