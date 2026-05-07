# How to Use RUN Instruction Best Practices in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, RUN, Best Practice, Container Optimization

Description: Learn best practices for using the RUN instruction in Podman Containerfiles, including layer optimization, caching strategies, and techniques for keeping images lean and secure.

---

> The RUN instruction executes commands during the image build process. How you use it determines your image size, build speed, and layer efficiency. Mastering RUN is essential for building production-quality container images.

The RUN instruction is where most of the work happens in a Containerfile. It installs packages, compiles code, configures the environment, and prepares everything your application needs. But each RUN instruction creates a new layer in your image, and careless usage leads to bloated images, slow builds, and wasted disk space.

This guide covers the best practices for using RUN effectively in Podman Containerfiles, from basic syntax to advanced optimization techniques.

---

## RUN Instruction Syntax

RUN supports two forms:

```dockerfile
# Shell form: runs command through /bin/sh -c

RUN apt-get update && apt-get install -y curl

# Exec form: runs command directly without shell
RUN ["apt-get", "update"]
RUN ["apt-get", "install", "-y", "curl"]
```

The shell form is more common because it supports shell features like pipes, variable expansion, and command chaining. The exec form is useful when you need to avoid shell processing or when the base image does not have a shell.

## Combining Commands to Reduce Layers

Every RUN instruction creates a new image layer. Combine related commands into a single RUN instruction to minimize layers and enable cleanup within the same layer.

```dockerfile
# Bad: 4 separate layers, package cache persists
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y make
RUN apt-get install -y libssl-dev

# Good: 1 layer with cleanup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        make \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*
```

The key insight is that deleting files in a later layer does not reduce the image size. The files still exist in the layer where they were created. By cleaning up in the same RUN instruction, the temporary files never make it into a committed layer.

```dockerfile
# Bad: Cleanup in a separate layer doesn't save space
RUN dnf install -y gcc make
RUN dnf clean all  # Files are still in the previous layer!

# Good: Cleanup in the same layer
RUN dnf install -y gcc make && \
    dnf clean all && \
    rm -rf /var/cache/dnf
```

## Package Installation Best Practices

When installing packages, follow these practices to keep images lean and builds reproducible.

### Pin Package Versions

```dockerfile
# Good: Pinned versions for reproducibility (Debian 12 example)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl=7.88.1-10+deb12u14 \
        ca-certificates=20230311+deb12u1 \
    && rm -rf /var/lib/apt/lists/*
```

### Skip Unnecessary Dependencies

```dockerfile
# Debian/Ubuntu: --no-install-recommends
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

# Alpine: --no-cache
RUN apk add --no-cache python3 py3-pip

# Fedora/RHEL: --setopt=install_weak_deps=False
RUN dnf install -y --setopt=install_weak_deps=False python3 && \
    dnf clean all
```

### Sort Packages Alphabetically

This makes the Containerfile easier to read, maintain, and diff:

```dockerfile
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        jq \
        openssl \
        wget \
    && rm -rf /var/lib/apt/lists/*
```

## Leveraging Build Cache

Podman caches each layer and reuses it if the instruction and all previous layers have not changed. Structure your RUN instructions to maximize cache hits.

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Layer 1: Install OS dependencies (rarely changes)
RUN apk add --no-cache tini

# Layer 2: Install app dependencies (changes when package.json changes)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Layer 3: Copy source code (changes frequently)
COPY . .
RUN npm run build
```

If you only change your source code, layers 1 and 2 are served from cache, and only the source copy and build run again.

### Disabling Cache When Needed

Sometimes you need a fresh build. Use `--no-cache` to force all layers to rebuild:

```bash
podman build --no-cache -t myapp .
```

Or invalidate cache from a specific point using a build argument:

```dockerfile
ARG CACHE_BUST=1
RUN echo "Cache bust: ${CACHE_BUST}" && \
    apt-get update && \
    apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
```

```bash
podman build --build-arg CACHE_BUST=$(date +%s) -t myapp .
```

## Handling Build Dependencies with Multi-Stage

Use separate build stages to keep build tools out of the final image:

```dockerfile
# Build stage with all development dependencies
FROM python:3.12-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Runtime stage with only what's needed
FROM python:3.12-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /install /usr/local
WORKDIR /app
COPY . .

USER 1001
CMD ["python", "app.py"]
```

The final image has the PostgreSQL client library but not the compiler or development headers used to build the Python packages.

## Using Heredocs for Readability

Modern Containerfiles support heredoc syntax for multi-line scripts, making complex RUN instructions more readable:

```dockerfile
RUN <<EOF
#!/bin/bash
set -e

apt-get update
apt-get install -y --no-install-recommends \
    curl \
    ca-certificates

curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

apt-get clean
rm -rf /var/lib/apt/lists/*
EOF
```

This is especially useful for inline configuration files:

```dockerfile
RUN <<EOF cat > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
}
EOF
```

## Running Commands with Different Shells

You can specify a different shell for the RUN instruction:

```dockerfile
# Use bash instead of sh
RUN ["/bin/bash", "-c", "source /opt/setup.sh && make build"]

# Or set the shell globally
SHELL ["/bin/bash", "-c"]
RUN source /opt/setup.sh && make build
```

## Security Considerations

Be careful about what you include in RUN instructions, as the contents of each layer are visible to anyone who can pull the image.

```dockerfile
# Bad: Secret is visible in image history
RUN curl -H "Authorization: Bearer my-secret-token" https://api.example.com/data > /app/data.json

# Good: Use build secrets (Podman supports --secret)
RUN --mount=type=secret,id=api_token \
    curl -H "Authorization: Bearer $(cat /run/secrets/api_token)" \
    https://api.example.com/data > /app/data.json
```

Build with secrets:

```bash
podman build --secret=id=api_token,src=./token.txt -t myapp .
```

## Using Cache Mounts

Cache mounts let you persist data across builds without including it in the image layers:

```dockerfile
# Cache pip downloads across builds
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Cache Go modules
RUN --mount=type=cache,target=/go/pkg/mod \
    go build -o server .

# Cache apt packages
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    apt-get update && apt-get install -y gcc
```

Cache mounts are especially effective for package managers that download large artifacts.

## Common Mistakes

```dockerfile
# Mistake 1: Forgetting to clean up in the same layer
RUN apt-get update && apt-get install -y build-essential
RUN rm -rf /var/lib/apt/lists/*  # Doesn't save space!

# Mistake 2: Running apt-get update in a separate cached layer
RUN apt-get update
RUN apt-get install -y curl  # May use stale package index

# Mistake 3: Not using set -e in shell scripts
RUN cd /nonexistent; echo "This still runs"  # Silent failure

# Fix: Use set -e or chain with &&
RUN set -e && cd /app && ./configure && make && make install
```

## Conclusion

The RUN instruction is the workhorse of your Containerfile, and using it effectively requires understanding how image layers work. Combine related commands into single RUN instructions, clean up in the same layer where you create temporary files, leverage the build cache by ordering instructions wisely, and use multi-stage builds to separate build-time from runtime dependencies. These practices will produce smaller, faster, and more secure container images that are ready for production deployment with Podman.
