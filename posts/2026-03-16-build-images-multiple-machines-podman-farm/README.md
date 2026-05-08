# How to Build Images Across Multiple Machines with podman farm build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Multi-Architecture, Build Farm

Description: Learn how to use podman farm build to distribute container image builds across multiple machines, producing native multi-architecture images with a single command.

---

> The podman farm build command sends your build context to every node in the farm, builds natively on each architecture, and assembles the results into a manifest list.

Building container images natively on each target architecture produces faster, more reliable results than cross-compilation. The `podman farm build` command orchestrates this entire process. It connects to each system connection in your farm, runs the build, and combines the results. This guide covers the command in detail.

---

## Prerequisites

You need a configured farm with reachable system connections:

```bash
# Verify your farm exists and has connections

podman farm list

# Test connectivity to all nodes
podman farm list --format '{{range .Connections}}{{.}}{{"\n"}}{{end}}' | while read -r CONN; do
    echo -n "${CONN}: "
    podman --connection "${CONN}" info --format '{{.Host.Arch}}' 2>/dev/null || echo "UNREACHABLE"
done
```

## Basic Farm Build

```bash
# Build an image across all farm nodes
# Note: podman farm build requires a full registry path in the -t flag
podman farm build --farm my-farm -t registry.example.com/myapp:latest .
```

This command:
1. Sends the build context (current directory) to each node
2. Runs `podman build` on each node natively
3. Pushes the built images directly to the registry
4. Creates a manifest list and pushes it to the registry as well

## Specifying a Containerfile

```bash
# Use a specific Containerfile
podman farm build --farm my-farm \
    -f docker/Containerfile.prod \
    -t registry.example.com/myapp:v1.0 \
    .
```

## Using Build Arguments

```bash
# Pass build arguments to all nodes
podman farm build --farm my-farm \
    --build-arg VERSION=1.0.0 \
    --build-arg COMMIT_SHA=$(git rev-parse HEAD) \
    -t registry.example.com/myapp:v1.0 \
    .
```

## Tagging for a Registry

```bash
# Build and tag for pushing to a registry
podman farm build --farm prod-farm \
    -t registry.example.com/myapp:latest \
    -t registry.example.com/myapp:v2.0 \
    .

# No separate podman manifest push command is needed
```

## Build with Local Architecture Included

If your local machine is also a build target, use `--local`:

```bash
# Build on the local machine as well as farm nodes
podman farm build --farm my-farm --local -t registry.example.com/myapp:latest .
```

## Monitoring Build Progress

The build command shows output from each node as it progresses:

```bash
# Verbose output shows per-node build progress
podman farm build --farm my-farm -t registry.example.com/myapp:latest . 2>&1 | tee build.log

# Check the log for any errors
grep -i "error" build.log
```

## Complete Build-and-Push Workflow

```bash
#!/bin/bash
# farm-build-push.sh - Build on farm and push to registry
set -euo pipefail

IMAGE="${1:?Usage: $0 <image:tag>}"
FARM="${FARM:-prod-farm}"

echo "Building ${IMAGE} on farm ${FARM}..."

# Log in to registry before building (farm build pushes directly to registry)
podman login registry.example.com

# Build across all farm nodes (images and manifest are pushed to registry automatically)
podman farm build --farm "${FARM}" -t "${IMAGE}" .

echo "Successfully built and pushed ${IMAGE}"
```

## Handling Build Failures

If a build fails on one node, the entire farm build fails:

```bash
# Check which node failed by examining the output
podman farm build --farm my-farm -t registry.example.com/myapp:latest . 2>&1

# Test building on individual nodes
podman --connection amd64-builder build -t myapp:test .
podman --connection arm64-builder build -t myapp:test .

# If one node is problematic, temporarily remove it
podman farm update --remove broken-node my-farm
podman farm build --farm my-farm -t registry.example.com/myapp:latest .
```

## Using .containerignore for Smaller Contexts

Reduce build context size to speed up transfers to remote nodes:

```bash
# Create a .containerignore file
cat > .containerignore <<'EOF'
.git
node_modules
*.md
tests/
docs/
.env*
EOF

# Build with reduced context
podman farm build --farm my-farm -t registry.example.com/myapp:latest .
```

## Performance Tips

```bash
# Use multi-stage builds to minimize what gets built on each node
# Keep the build context small with .containerignore
# Use fast SSH connections between nodes

# Monitor transfer speeds
time podman farm build --farm my-farm -t registry.example.com/myapp:latest .
```

## Summary

The `podman farm build` command distributes your container build across every node in a farm. The built images are pushed directly to the registry specified in the `--tag` flag, and a manifest list is created and pushed as well. The `-t` flag must specify a full registry path in the format `registry/repository/imageName[:tag]`. Use it for production multi-arch builds where QEMU emulation is too slow or unreliable. Keep build contexts small with `.containerignore` and test individual node connectivity before running farm builds.
