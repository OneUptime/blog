# How to Configure Docker Buildx with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Buildx, BuildKit, Multi-Platform, Build

Description: Configure Docker Buildx and BuildKit to build container images in environments with IPv6 connectivity, handle IPv6 network access during build steps, and set up multi-platform builders with IPv6...

## Introduction

Docker Buildx uses BuildKit for image builds, which runs build steps in containers. When builds need network access (e.g., `apt-get install`, `npm install`), those containers need IPv6 connectivity if the packages are resolved via IPv6 addresses. Configuring BuildKit with proper network settings ensures build-time network operations work correctly in IPv6 and dual-stack environments.

## Create Buildx Builder with IPv6 Network

```bash
# The default builder uses the BuildKit bundled with Docker Engine

# If you need custom network settings, create a docker-container builder

# Create a custom builder
docker buildx create \
    --name mybuilder \
    --driver docker-container \
    --driver-opt network=host \
    --buildkitd-flags '--allow-insecure-entitlement network.host' \
    --use

# Verify builder is using host networking
docker buildx inspect --bootstrap mybuilder

# Build with IPv6 access (host networking during build)
docker buildx build \
    --builder mybuilder \
    --allow network.host \
    --network host \
    --load \
    -t myapp:latest .
```

## Build with IPv6 Network Access

```dockerfile
# Dockerfile - IPv6-aware build steps

FROM ubuntu:22.04

# Build with --network=host and --allow network.host to inherit host IPv6
# Or ensure the build network has IPv6

# Install packages (may resolve over IPv6)
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download from IPv6-reachable server
RUN curl -6 -o /tmp/config.json https://config.example.com/config.json || \
    curl -4 -o /tmp/config.json https://config.example.com/config.json

# Test IPv6 connectivity during build
RUN curl -6 -s https://ipv6.icanhazip.com > /dev/null && \
    echo "IPv6 available in build" || \
    echo "IPv6 not available in build"
```

```bash
# Build with host network access (requires network.host entitlement)
docker buildx build \
    --allow network.host \
    --network=host \
    --load \
    -t myapp:latest .

# Alternatively, attach the builder to a specific IPv6-enabled network
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet fd00:100::/64 \
    build-net

docker buildx create \
    --name buildnetbuilder \
    --driver docker-container \
    --driver-opt network=build-net \
    --use

docker buildx build \
    --builder buildnetbuilder \
    --load \
    -t myapp:latest .
```

## Multi-Platform Build with IPv6

```bash
# Create multi-platform builder
docker buildx create \
    --name multiplatform \
    --driver docker-container \
    --platform linux/amd64,linux/arm64 \
    --driver-opt network=host \
    --buildkitd-flags '--allow-insecure-entitlement network.host' \
    --use

# Build for multiple platforms
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --allow network.host \
    --network host \
    -t registry.example.com/myapp:latest \
    --push .

# Inspect built manifest
docker buildx imagetools inspect registry.example.com/myapp:latest
```

## BuildKit Configuration for IPv6

```toml
# /etc/buildkit/buildkitd.toml - BuildKit daemon configuration

# Allow host networking for build steps
insecure-entitlements = ["network.host"]

[grpc]
  address = ["unix:///run/buildkit/buildkitd.sock"]

[worker.oci]
  # Set the default network mode for build execution
  networkMode = "host"

[registry."registry.example.com"]
  http = false
  insecure = false
```

```bash
# Create a builder that uses a custom BuildKit config
docker buildx create \
    --name ipv6builder \
    --driver docker-container \
    --buildkitd-config /etc/buildkit/buildkitd.toml \
    --use

# Or run BuildKit directly and connect Buildx with the remote driver
sudo buildkitd --group "$(id -gn)" \
    --config /etc/buildkit/buildkitd.toml \
    --addr unix://$HOME/buildkitd.sock &

docker buildx create \
    --name remote-ipv6builder \
    --driver remote \
    unix://$HOME/buildkitd.sock \
    --use
```

## Cache and IPv6 Registry

```bash
# Use IPv6 registry as build cache
docker buildx build \
    --cache-from type=registry,ref=[2001:db8::1]:5000/cache:myapp \
    --cache-to type=registry,ref=[2001:db8::1]:5000/cache:myapp,mode=max \
    --load \
    -t myapp:latest .

# Export build cache to local directory
docker buildx build \
    --cache-to type=local,dest=/tmp/buildcache \
    --load \
    -t myapp:latest .

# Use local cache in next build
docker buildx build \
    --cache-from type=local,src=/tmp/buildcache \
    --load \
    -t myapp:latest .
```

## Conclusion

Configure Docker Buildx for IPv6 by using a `docker-container` builder when you need custom networking. Use `--driver-opt network=host` or `--driver-opt network=<ipv6-network>` to choose the builder container's network, and use `docker buildx build --network=host` only when you want `RUN` instructions to use host networking. Host networking requires enabling the `network.host` entitlement in BuildKit and passing `--allow network.host` on the build command. For persistent BuildKit settings, use `--buildkitd-config` or `--buildkitd-flags`. When using the `docker-container` or `remote` driver for single-platform builds, add `--load` if you want the image to appear in the local Docker image store. When using IPv6 registries for cache or push, use bracket notation `[ipv6]:port/image` in image references. Multi-platform builds support the same IPv6 network options.
