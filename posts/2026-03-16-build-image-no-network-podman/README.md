# How to Build an Image with No Network Access with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Network, Security, Offline

Description: Learn how to build container images without network access using Podman for reproducible builds, security hardening, and air-gapped environments.

---

> Building without network access helps ensure that build steps do not fetch external resources, making builds more reproducible and easier to audit.

Disabling network access during container builds is a security best practice that helps builds avoid dependencies on external services. It also reduces supply chain risk from build steps that could download malicious code. Podman supports disabling networking for `RUN` instructions through the `--network=none` flag. To avoid pulling base images during the build, make sure they are already present locally or add `--pull=never`. This guide covers the setup and practical patterns.

---

## Why Build Without Network

There are several important reasons to disable network during builds.

- **Reproducibility**: Builds do not depend on network state when all inputs are pinned and available locally.
- **Security**: Prevents exfiltration of build secrets and supply chain injection.
- **Air-gapped compliance**: Required in high-security environments.
- **Faster builds**: No DNS lookups or network timeouts.

## The --network=none Flag

Disable network access for `RUN` instructions during the build process.

```bash
# Build with no network access

podman build --pull=never --network=none -t myapp:latest .
```

Any `RUN` instruction that attempts network access will fail.

## Preparing for Offline Builds

When building without network, all dependencies must be included in the build context or pre-installed in the base image.

```bash
# Step 1: Download dependencies locally first
mkdir -p vendor

# For Python
pip download -r requirements.txt -d vendor/

# For Node.js
npm ci
tar -czf node_modules.tar.gz node_modules/

# For Go
go mod vendor
```

## Python Offline Build

```bash
# First, download all packages locally
pip download -r requirements.txt -d ./wheels/

cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

WORKDIR /app

# Copy pre-downloaded wheels
COPY wheels/ /tmp/wheels/
COPY requirements.txt .

# Install from local wheels only, no network needed
RUN pip install --no-cache-dir --no-index --find-links=/tmp/wheels/ -r requirements.txt && \
    rm -rf /tmp/wheels/

COPY . .
CMD ["python", "app.py"]
EOF

# Build with no network
podman build --pull=never --network=none -t myapp:latest .
```

## Node.js Offline Build

```bash
# First, install dependencies and pack them
npm ci
tar -czf node_modules.tar.gz node_modules/

cat > Containerfile << 'EOF'
FROM docker.io/library/node:20-alpine

WORKDIR /app

# Copy pre-packed node_modules
COPY node_modules.tar.gz .
RUN tar -xzf node_modules.tar.gz && rm node_modules.tar.gz

COPY package.json .
COPY src/ ./src/

CMD ["node", "src/server.js"]
EOF

podman build --pull=never --network=none -t myapp:latest .
```

## Go Offline Build with Vendored Dependencies

```bash
# Vendor all Go dependencies
go mod vendor

cat > Containerfile << 'EOF'
FROM docker.io/library/golang:1.22

WORKDIR /src

# Copy the entire project including vendor directory
COPY . .

# Build using vendored dependencies (no network needed)
RUN CGO_ENABLED=0 go build -mod=vendor -o /app .

FROM docker.io/library/alpine:latest
COPY --from=0 /app /usr/local/bin/app
CMD ["app"]
EOF

podman build --pull=never --network=none -t myapp:latest .
```

## Rust Offline Build

```bash
# Pre-download Rust dependencies
cargo vendor

# Create a cargo config to use vendored dependencies
mkdir -p .cargo
cat > .cargo/config.toml << 'EOF'
[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "vendor"
EOF

cat > Containerfile << 'EOF'
FROM docker.io/library/rust:1.77

WORKDIR /usr/src/app
COPY . .

# Build with vendored dependencies
RUN cargo build --release

FROM docker.io/library/debian:bookworm-slim
COPY --from=0 /usr/src/app/target/release/myapp /usr/local/bin/
CMD ["myapp"]
EOF

podman build --pull=never --network=none -t myapp:latest .
```

## System Packages in Offline Builds

For system packages, pre-download them and include in the build context.

```bash
# Download deb packages on an internet-connected machine
mkdir -p debs
apt-get clean
apt-get update
apt-get install --download-only -y curl ca-certificates
cp /var/cache/apt/archives/*.deb debs/

cat > Containerfile << 'EOF'
FROM docker.io/library/debian:bookworm-slim

# Copy pre-downloaded packages
COPY debs/ /tmp/debs/

# Install from local packages
RUN dpkg -i /tmp/debs/*.deb && \
    rm -rf /tmp/debs/

CMD ["bash"]
EOF

podman build --pull=never --network=none -t offline-base:latest .
```

## Verifying No Network Access

Test that your build truly works without network.

```bash
# This should fail if any step needs network
podman build --pull=never --network=none -t myapp:latest .

# Add a verification step to your Containerfile
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

# This will fail if network is disabled (which is what we want)
RUN if wget -q --spider http://google.com 2>/dev/null; then \
      echo "ERROR: Network is accessible" && exit 1; \
    else \
      echo "PASS: No network access confirmed"; \
    fi

COPY . /app
CMD ["sh"]
EOF

podman build --pull=never --network=none -t secure-app:latest .
```

## Hybrid Approach: Network in Some Stages

In multi-stage builds, you can use network in the first stage to download dependencies, then make later package installation steps use only local files.

```bash
cat > Containerfile << 'EOF'
# Stage 1: Download dependencies (needs network)
FROM docker.io/library/python:3.12-slim AS deps
WORKDIR /app
COPY requirements.txt .
RUN pip download -r requirements.txt -d /wheels

# Stage 2: Install only from local files
FROM docker.io/library/python:3.12-slim AS builder
WORKDIR /app
COPY --from=deps /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt
COPY . .
CMD ["python", "app.py"]
EOF

# Build normally (stage 1 uses network; the package install step is isolated)
podman build -t myapp:latest .
```

## CI/CD Integration

Use offline builds as a security gate in your pipeline.

```bash
#!/bin/bash
# secure-build.sh

set -e

echo "Step 1: Download dependencies (with network)"
pip download -r requirements.txt -d ./wheels/

echo "Step 2: Build application (without network)"
podman build --pull=never --network=none -t myapp:latest .

echo "Secure offline build completed successfully"
```

## Summary

Building with `--network=none` is a security and reproducibility measure that prevents `RUN` instructions from fetching external resources during the build. This requires pre-downloading all dependencies and including them in the build context, and using local base images when paired with `--pull=never`. Use vendored dependencies for Go and Rust, pre-downloaded wheels for Python, and packed node_modules for Node.js. Verify your offline builds work by testing with the `--network=none` flag, and consider a hybrid approach using multi-stage builds where the dependency-download stage is the only stage that needs network access.
