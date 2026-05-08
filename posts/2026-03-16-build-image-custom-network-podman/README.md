# How to Build an Image with Custom Network Settings with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Network, Configuration

Description: Learn how to configure custom network settings during Podman image builds, including host networking, custom DNS, and proxy configuration.

---

> Custom network settings during builds let you access internal registries, private DNS, and corporate proxies.

Container builds often need network access for downloading dependencies, cloning repositories, and pulling packages. By default, Podman builds use the default network configuration, but many environments require custom settings. This guide covers configuring network access during Podman builds, including host networking, proxy settings, and custom network configurations.

---

## Default Build Networking

By default, Podman builds use the default build network mode, which provides isolated outbound network access for `RUN` instructions.

```bash
# Build with default networking

podman build -t myapp:latest .

# Verify network access during build
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest
RUN apk add --no-cache curl && curl -s https://httpbin.org/ip
CMD ["sh"]
EOF

podman build -t network-test:latest .
```

## Using Host Network During Build

The `--network=host` flag gives the build process direct access to the host's network stack.

```bash
# Build with host networking
podman build --network=host -t myapp:latest .
```

This is useful when you need to access services running on the host machine or on the local network that are not reachable through the default container network.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

RUN apk add --no-cache curl

# Access a service running on the host machine
RUN curl -s http://localhost:8080/api/health || echo "Host service not available"

# Access internal corporate registry
RUN curl -s https://internal-registry.corp.example.com/v2/ || echo "Registry not available"

CMD ["sh"]
EOF

podman build --network=host -t myapp:latest .
```

## Configuring Proxy Settings

Pass proxy settings to the build process for environments behind corporate proxies.

```bash
# Set proxy via build arguments
podman build \
  --build-arg HTTP_PROXY=http://proxy.corp.example.com:8080 \
  --build-arg HTTPS_PROXY=http://proxy.corp.example.com:8080 \
  --build-arg NO_PROXY=localhost,127.0.0.1,.corp.example.com \
  -t myapp:latest .
```

```bash
# Or set proxy via environment variables before building
export HTTP_PROXY=http://proxy.corp.example.com:8080
export HTTPS_PROXY=http://proxy.corp.example.com:8080
export NO_PROXY=localhost,127.0.0.1,.corp.example.com

podman build -t myapp:latest .
```

## Proxy-Aware Containerfile

Write Containerfiles that work with and without proxy settings.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

# Podman passes proxy environment variables into RUN steps by default when they are set
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

# Configure pip to use proxy if set
WORKDIR /app
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["python", "app.py"]
EOF
```

## Using a Custom Network

Create and use a custom Podman network for rootful builds.

```bash
# Create a custom network
podman network create build-network

# Build using the custom network (only supported for rootful builds)
podman build --network=build-network -t myapp:latest .

# Clean up the network
podman network rm build-network
```

## Accessing Internal Package Registries

Configure builds to access internal package registries that require specific network access.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/node:20-alpine

WORKDIR /app

# Configure npm to use internal registry
RUN npm config set registry https://npm.internal.corp.example.com/

COPY package*.json ./
RUN npm ci

COPY . .
CMD ["node", "server.js"]
EOF

# Build with host network to access internal registry
podman build --network=host -t myapp:latest .
```

## Build with Custom /etc/hosts Entries

Add custom host entries for the build process.

```bash
# Use --add-host to add DNS entries during build
podman build \
  --add-host=registry.internal:192.168.1.100 \
  --add-host=api.internal:192.168.1.101 \
  -t myapp:latest .
```

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:latest

# These custom hosts are available during build
RUN apk add --no-cache curl && \
    curl -s http://registry.internal:5000/v2/ && \
    echo "Internal registry accessible"

CMD ["sh"]
EOF

podman build \
  --add-host=registry.internal:192.168.1.100 \
  -t myapp:latest .
```

## Network Configuration for Multi-Stage Builds

Different stages may have different network needs, but `--network` applies to `RUN` instructions across the whole build.

```bash
cat > Containerfile << 'EOF'
# Build stage: needs network for downloading dependencies
FROM docker.io/library/golang:1.22 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app .

# Runtime stage: no network needed
FROM docker.io/library/alpine:latest
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Build with host networking for dependency downloads
podman build --network=host -t myapp:latest .
```

## Build with Custom DNS

Configure DNS resolution for the build process.

```bash
# Use custom DNS servers during build
podman build \
  --dns=10.0.0.1 \
  --dns=10.0.0.2 \
  --dns-search=corp.example.com \
  -t myapp:latest .
```

## Troubleshooting Network Issues

Debug network problems during builds.

```bash
# Test network access in a build step
cat > Containerfile.debug << 'EOF'
FROM docker.io/library/alpine:latest
RUN apk add --no-cache curl bind-tools

# Test DNS resolution
RUN nslookup google.com || echo "DNS failed"

# Test HTTP connectivity
RUN curl -v --connect-timeout 5 https://registry.npmjs.org/ || echo "HTTPS failed"

# Test internal services
RUN curl -v --connect-timeout 5 http://internal-service:8080/ || echo "Internal service not reachable"

# Show network configuration
RUN ip addr show 2>/dev/null || ifconfig 2>/dev/null || echo "No network tools"
RUN cat /etc/resolv.conf

CMD ["sh"]
EOF

# Try with default networking
podman build -f Containerfile.debug -t net-debug:default .

# Try with host networking
podman build -f Containerfile.debug --network=host -t net-debug:host .
```

## Summary

Custom network settings during Podman builds solve common problems with corporate proxies, internal registries, and private DNS. Use `--network=host` for direct host network access, configure proxy settings via build arguments, and use `--add-host` and `--dns` for custom DNS resolution. Always test network configuration in debug builds before troubleshooting dependency download failures.
