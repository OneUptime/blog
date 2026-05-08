# How to Speed Up Podman Builds with Layer Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Performance, Caching

Description: Learn how to leverage Podman's layer caching mechanisms to dramatically speed up container image builds by reusing previously built layers.

---

> Effective layer caching can reduce build times from minutes to seconds by reusing unchanged layers from previous builds.

Podman caches each layer of your container image build. When a layer's inputs have not changed, Podman reuses the cached version instead of rebuilding it. Understanding how this cache works and how to optimize for it is one of the most impactful things you can do for build performance.

---

## How Layer Caching Works

Podman evaluates each instruction in your Containerfile sequentially. For each instruction, it checks whether it has a cached layer from a previous build with the same parent layer and the same instruction. If it finds a match, it uses the cache. If any instruction invalidates the cache, all subsequent instructions also miss the cache.

```bash
# First build: all layers are built from scratch

podman build -t myapp:v1 .
# Output: Each step shows "STEP X: ..."

# Second build (no changes): all layers come from cache
podman build -t myapp:v2 .
# Output: Each step shows "--> Using cache ..."
```

## Cache Invalidation Rules

Understanding what breaks the cache is critical.

```bash
# These actions invalidate the cache for a layer:
# 1. Changing the instruction text (even whitespace)
# 2. Changing any file referenced by COPY or ADD
# 3. Changing a build argument value used in that layer
# 4. Any previous layer being invalidated (cascading effect)
```

## Ordering Instructions for Maximum Cache Hits

Place instructions that change rarely at the top and those that change frequently at the bottom.

```bash
# BAD: Source code copy before dependency install
cat > Containerfile.bad <<'EOF'
FROM node:24-alpine
WORKDIR /app
COPY . .                    # Changes every time you edit code
RUN npm install             # Rebuilds every time (cache invalidated above)
CMD ["node", "index.js"]
EOF

# GOOD: Dependencies first, source code last
cat > Containerfile.good <<'EOF'
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./   # Only changes when deps change
RUN npm ci                                # Cached when deps unchanged
COPY . .                                  # Only this and below rebuild
CMD ["node", "index.js"]
EOF
```

Test the difference:

```bash
# Build once to populate cache
podman build -f Containerfile.good -t myapp:v1 .

# Edit source code (not package.json)
echo "// updated" >> index.js

# Rebuild: npm ci is cached, only COPY . . rebuilds
podman build -f Containerfile.good -t myapp:v2 .
```

## Using .containerignore for Better Cache Hits

Files that change frequently but are not needed in the build can break the cache. Exclude them with a `.containerignore` file.

```bash
cat > .containerignore <<'EOF'
.git
node_modules
*.log
.env
tmp/
coverage/
.idea/
.vscode/
EOF
```

This prevents irrelevant file changes from invalidating your `COPY` cache.

## Leveraging Build Cache from Remote Sources

In CI/CD pipelines, the local cache may be empty on each run. You can use `--cache-from` to pull cache layers from a registry.

```bash
# Build using a remote cache repository (--layers is required for --cache-from and --cache-to)
podman build \
  --layers \
  --cache-from=registry.example.com/myapp:cache \
  --cache-to=registry.example.com/myapp:cache \
  -t myapp:latest \
  .
```

## Splitting RUN Instructions Strategically

Each `RUN` instruction creates a cacheable layer. Split them based on change frequency.

```bash
cat > Containerfile <<'EOF'
FROM ubuntu:22.04

# Layer 1: System packages (rarely change)
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Layer 2: Application runtime (changes occasionally)
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Layer 3: Dependencies (changes when package.json changes)
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Layer 4: Application code (changes frequently)
COPY . .

CMD ["node", "index.js"]
EOF
```

## Using Build Arguments Without Breaking Cache

Build arguments can invalidate cache if not used carefully.

```bash
# BAD: ARG before instructions causes cache miss when value changes
cat > Containerfile.bad <<'EOF'
FROM alpine:3.23
ARG APP_VERSION=1.0    # Changing this invalidates everything below
RUN apk add --no-cache curl
RUN echo $APP_VERSION > /version.txt
EOF

# GOOD: Place ARG just before it is needed
cat > Containerfile.good <<'EOF'
FROM alpine:3.23
RUN apk add --no-cache curl    # This stays cached regardless
ARG APP_VERSION=1.0            # Only affects layers below
RUN echo $APP_VERSION > /version.txt
EOF
```

## Multi-Stage Builds and Caching

Each stage in a multi-stage build has its own cache chain.

```bash
cat > Containerfile <<'EOF'
# Stage 1: Build (cached independently)
FROM golang:1.26 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download        # Cached until go.mod/go.sum change
COPY . .
RUN go build -o /app

# Stage 2: Runtime (cached independently)
FROM alpine:3.23
RUN apk add --no-cache ca-certificates   # Always cached
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF
```

## Measuring Cache Effectiveness

Track build times to see caching impact:

```bash
# Time a clean build
podman rmi myapp:latest 2>/dev/null
time podman build --no-cache -t myapp:latest .

# Time a fully cached build
time podman build -t myapp:latest .

# Time a partial cache hit (after code change)
echo "// change" >> src/main.go
time podman build -t myapp:latest .
```

## Disabling Cache When Needed

Sometimes you need a fresh build, such as for security updates.

```bash
# Disable all caching
podman build --no-cache -t myapp:latest .

# Disable cache for a specific layer using a changing ARG
cat > Containerfile <<'EOF'
FROM alpine:3.23
RUN apk add --no-cache curl

# Bust cache for everything below by changing this value
ARG CACHE_BUST=1
RUN apk upgrade --no-cache

COPY . /app
CMD ["/app/run.sh"]
EOF

# Pass a unique value to bust the cache
podman build --build-arg CACHE_BUST=$(date +%s) -t myapp:latest .
```

## Summary

Layer caching is Podman's most powerful build optimization. Order your Containerfile instructions from least to most frequently changed, separate dependency installation from code copying, use `.containerignore` to exclude irrelevant files, and leverage `--cache-from` in CI/CD pipelines. These practices can reduce typical rebuild times by 80% or more.
