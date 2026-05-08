# How to Optimize Podman Farm Build Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Farm, Performance, Multi-Architecture

Description: Learn techniques to speed up Podman farm builds, including reducing build context size, leveraging caching, optimizing Containerfiles, and tuning SSH connections.

---

> The biggest performance gains in Podman farm builds come from minimizing build context transfers and maximizing layer cache hits on remote nodes.

Podman farm builds involve network transfers, remote compilation, and image assembly. Each step offers optimization opportunities. This guide covers practical techniques to reduce build times and make your multi-architecture build pipeline faster.

---

## Minimize Build Context Size

The build context is transferred to every farm node over SSH. A smaller context means faster transfers:

```bash
# Check your current build context size

du -sh --exclude=.git .

# Create a thorough .containerignore
cat > .containerignore <<'EOF'
# Version control
.git
.gitignore

# Dependencies (rebuilt in container)
node_modules
vendor
__pycache__
*.pyc

# Build artifacts
dist
build
target
*.o
*.a

# Documentation and tests
docs
tests
*.md
LICENSE

# IDE and OS files
.vscode
.idea
*.swp
.DS_Store

# Environment and secrets
.env*
*.pem
*.key
EOF

# Verify the reduced context size
tar cf - . --exclude-from=.containerignore 2>/dev/null | wc -c | numfmt --to=iec
```

## Optimize Your Containerfile for Caching

Order instructions from least to most frequently changing:

```dockerfile
# Good: Dependencies change less often than source code
FROM docker.io/library/node:24-alpine

WORKDIR /app

# Layer 1: System dependencies (rarely changes)
RUN apk add --no-cache tini

# Layer 2: Package manifest (changes when deps change)
COPY package.json package-lock.json ./

# Layer 3: Install dependencies (cached if package files unchanged)
RUN npm ci --omit=dev

# Layer 4: Application code (changes most often)
COPY src/ ./src/

EXPOSE 3000
ENTRYPOINT ["tini", "--"]
CMD ["node", "src/server.js"]
```

## Use Multi-Stage Builds to Reduce Final Image Size

```dockerfile
# Stage 1: Build (includes compilers, dev tools)
FROM docker.io/library/golang:1.26-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app ./cmd/server

# Stage 2: Runtime (minimal image)
FROM scratch
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
```

Multi-stage builds reduce the amount of image data pushed from farm nodes to the registry.

## Pre-Warm Remote Caches

Pull base images on remote nodes before building:

```bash
#!/bin/bash
# prewarm-caches.sh - Pull base images on all farm nodes

BASE_IMAGES=("docker.io/library/golang:1.26-alpine" "docker.io/library/node:24-alpine" "docker.io/library/alpine:latest")
CONNECTIONS=("amd64-builder" "arm64-builder")

for CONN in "${CONNECTIONS[@]}"; do
    for IMAGE in "${BASE_IMAGES[@]}"; do
        echo "Pulling ${IMAGE} on ${CONN}..."
        podman --connection "${CONN}" pull "${IMAGE}" &
    done
done

# Wait for all pulls to complete
wait
echo "Cache pre-warming complete."
```

## Tune SSH for Faster Transfers

Configure SSH to reduce connection overhead:

```bash
# Add to ~/.ssh/config
cat >> ~/.ssh/config <<'EOF'

# Podman farm nodes - optimized for large transfers
Host *.build.example.com
    IdentityFile ~/.ssh/podman_farm
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 600
    Compression yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF

# Create the sockets directory
mkdir -p ~/.ssh/sockets

# Test the connection speed
time ssh builder@amd64.build.example.com "echo OK"
```

SSH connection multiplexing (`ControlMaster`) reuses existing connections, avoiding the overhead of SSH handshakes for each farm operation.

## Parallel Operations

Farm builds already parallelize across nodes, but you can optimize within each build:

```dockerfile
# Parallelize package installation where possible
FROM docker.io/library/node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./

# npm ci already uses parallel downloads
RUN npm ci --omit=dev

COPY . .
RUN npm run build
```

## Monitor and Benchmark

```bash
#!/bin/bash
# benchmark-farm-build.sh - Time each phase of a farm build

IMAGE="registry.example.com/myapp"
TAG="bench-$(date +%s)"

echo "=== Farm Build Benchmark ==="

# Time the full build
START=$(date +%s)
podman farm build --farm prod-farm -t "${IMAGE}:${TAG}" . 2>&1
END=$(date +%s)

TOTAL=$((END - START))
echo "Total build time: ${TOTAL}s"

# Clean up
podman manifest rm "${IMAGE}:${TAG}" 2>/dev/null
```

## Clean Remote Nodes Periodically

Stale images and build cache consume disk space and can slow builds:

```bash
#!/bin/bash
# clean-farm-nodes.sh - Clean up build artifacts on all nodes

CONNECTIONS=("amd64-builder" "arm64-builder" "ppc64le-builder")

for CONN in "${CONNECTIONS[@]}"; do
    echo "Cleaning ${CONN}..."

    # Remove dangling images
    podman --connection "${CONN}" image prune --force

    # Remove build cache older than 7 days
    podman --connection "${CONN}" system prune --force --filter "until=168h"

    # Show remaining disk usage
    podman --connection "${CONN}" system df
    echo ""
done
```

## Use a Registry Cache

Configure each farm node to use a local registry mirror:

```bash
# On each farm node, configure a registry mirror
# Edit /etc/containers/registries.conf.d/mirror.conf
cat <<'EOF'
[[registry]]
location = "docker.io"

[[registry.mirror]]
location = "registry-cache.internal:5000"
EOF

# This reduces internet bandwidth usage for base image pulls
```

## Summary

Optimize Podman farm builds by minimizing build context with `.containerignore`, ordering Containerfile instructions for maximum cache reuse, pre-warming caches on remote nodes, tuning SSH connections with multiplexing and compression, and periodically cleaning remote nodes. These techniques compound to significantly reduce multi-architecture build times.
