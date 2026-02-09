# How to Pin Package Versions in Dockerfiles for Reproducible Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Reproducible Builds, Version Pinning, Security, DevOps

Description: Learn how to pin package versions at every level of your Dockerfile to ensure builds produce identical results every time.

---

A reproducible Docker build means that building the same Dockerfile today and six months from now produces a functionally identical image. Without version pinning, your builds depend on whatever version of a package happens to be "latest" at build time. This leads to images that work today but break tomorrow when a dependency releases a new version with breaking changes, or when a base image gets updated.

Version pinning locks every dependency to a specific version. This guide covers how to pin versions at every level: base images, system packages, language-level packages, and even the Dockerfile syntax itself.

## Why Unpinned Builds Break

Consider this Dockerfile:

```dockerfile
FROM python:latest
RUN apt-get update && apt-get install -y curl
RUN pip install flask
COPY . .
CMD ["python", "app.py"]
```

This build is a ticking time bomb. Here is what can go wrong:

- `python:latest` might point to Python 3.11 today and Python 3.13 tomorrow
- `curl` might be version 7.88 today and 8.5 tomorrow, with different behavior
- `flask` might be version 3.0.0 today and 4.0.0 tomorrow, with breaking API changes
- Any of these version changes can silently break your application

The fix is to pin every version explicitly.

## Level 1: Pin the Base Image

### Pin to a Specific Tag

At minimum, pin your base image to a minor version:

```dockerfile
# Bad - unpredictable base image
FROM python:latest

# Better - pinned to minor version
FROM python:3.11-slim

# Best - pinned to patch version
FROM python:3.11.7-slim
```

### Pin to a Digest

For maximum reproducibility, pin to the image digest. A digest is a SHA-256 hash that uniquely identifies an exact image:

```dockerfile
# Most reproducible - pinned to exact image content
FROM python:3.11-slim@sha256:8f64a0661c4862abf5766d7f9fa0fbb89762da31e4ca8bded94c2fb28be3eb24
```

Get the digest of an image:

```bash
# Find the digest for an image you're using
docker inspect --format='{{index .RepoDigests 0}}' python:3.11-slim

# Or pull and check
docker pull python:3.11-slim
docker images --digests python
```

The downside of digest pinning is that you stop receiving security patches automatically. You need a process to update digests regularly.

### Using Renovate or Dependabot

Automated tools can help you keep digest-pinned images up to date:

```dockerfile
# Renovate and Dependabot recognize this pattern and create update PRs
FROM python:3.11-slim@sha256:8f64a0661c4862abf5766d7f9fa0fbb89762da31e4ca8bded94c2fb28be3eb24
```

Both tools scan your Dockerfiles and create pull requests when new image versions are available.

## Level 2: Pin System Packages

### Debian/Ubuntu (apt)

Pin apt packages to specific versions:

```dockerfile
FROM ubuntu:22.04

# Pin system packages to exact versions
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl=7.81.0-1ubuntu1.16 \
      ca-certificates=20230311ubuntu0.22.04.1 \
      git=1:2.34.1-1ubuntu1.10 \
    && rm -rf /var/lib/apt/lists/*
```

Find available versions for a package:

```bash
# List available versions for a package in a container
docker run --rm ubuntu:22.04 bash -c "apt-get update && apt-cache policy curl"
```

A lighter approach is to pin to major.minor without the release suffix. This still provides reasonable reproducibility:

```dockerfile
# Pin to major.minor (less strict but more maintainable)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl=7.81.* \
      git=1:2.34.* \
    && rm -rf /var/lib/apt/lists/*
```

### Alpine (apk)

Pin Alpine packages similarly:

```dockerfile
FROM alpine:3.19

# Pin Alpine packages to exact versions
RUN apk add --no-cache \
    curl=8.5.0-r0 \
    git=2.43.0-r0 \
    bash=5.2.21-r0
```

Find available versions:

```bash
# List available versions on Alpine
docker run --rm alpine:3.19 apk list curl
```

### Red Hat/CentOS (dnf/yum)

```dockerfile
FROM rockylinux:9

# Pin RPM packages to specific versions
RUN dnf install -y \
    curl-7.76.1-26.el9 \
    git-2.39.3-1.el9 \
    && dnf clean all
```

## Level 3: Pin Language-Level Packages

### Python (pip)

Use a `requirements.txt` with exact versions:

```
# requirements.txt - all versions pinned
flask==3.0.0
gunicorn==21.2.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
redis==5.0.1
celery==5.3.6
```

Generate a fully pinned requirements file including transitive dependencies:

```bash
# Use pip-compile from pip-tools to resolve and pin all dependencies
pip install pip-tools
pip-compile --generate-hashes requirements.in -o requirements.txt
```

The `--generate-hashes` flag adds SHA-256 hashes for each package, ensuring even the package contents cannot change:

```
# requirements.txt (with hashes)
flask==3.0.0 \
    --hash=sha256:21128f47e4e3b9d29ce213f5267b98b... \
    --hash=sha256:cfadcdb638b2e451...
```

Install with hash checking:

```dockerfile
# Install with hash verification for maximum security
RUN pip install --no-cache-dir --require-hashes -r requirements.txt
```

### Node.js (npm)

Use `package-lock.json` and `npm ci`:

```dockerfile
# Copy both package.json and the lockfile
COPY package.json package-lock.json ./

# npm ci installs exact versions from the lockfile (not package.json ranges)
RUN npm ci --only=production
```

Never use `npm install` in Dockerfiles. It resolves version ranges and can produce different results on different days. `npm ci` installs exactly what the lockfile specifies.

### Go Modules

Go modules with checksums provide reproducible builds by default:

```dockerfile
# Copy module files
COPY go.mod go.sum ./

# Download exact versions with checksum verification
RUN go mod download

COPY . .
RUN go build -o /app/server .
```

The `go.sum` file contains cryptographic hashes for all module dependencies.

### Rust (Cargo)

```dockerfile
# Copy the lockfile for exact dependency versions
COPY Cargo.toml Cargo.lock ./

# Download exact dependency versions
RUN cargo fetch --locked
```

The `--locked` flag ensures Cargo uses exactly the versions in `Cargo.lock`.

### Ruby (Bundler)

```dockerfile
COPY Gemfile Gemfile.lock ./

# Install exact versions from the lockfile
RUN bundle install --frozen
```

The `--frozen` flag prevents Bundler from updating `Gemfile.lock`.

## Level 4: Pin the Dockerfile Syntax

Even the Dockerfile parser can be pinned:

```dockerfile
# syntax=docker/dockerfile:1.7.0
FROM python:3.11-slim
...
```

This ensures the Dockerfile is parsed by a specific version of the BuildKit frontend, preventing behavior changes in the parser itself.

## Level 5: Pin Build Tools

If your build uses additional tools, pin those too:

```dockerfile
FROM python:3.11-slim

# Pin pip itself
RUN pip install --no-cache-dir pip==24.0

# Pin setuptools and wheel
RUN pip install --no-cache-dir setuptools==69.0.3 wheel==0.42.0

# Then install your application dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
```

## Balancing Reproducibility and Maintenance

Full version pinning creates a maintenance burden. Every pin needs to be updated when security patches are released. Here is a practical approach that balances reproducibility with maintainability:

**Pin tightly for production**: Use exact versions and lockfiles for production images

**Pin loosely for development**: Minor version ranges are acceptable for development images

**Use automation**: Set up Renovate or Dependabot to create update PRs automatically

**Review and test updates**: Do not blindly merge dependency updates

A practical CI/CD workflow:

```bash
# Build with pinned versions
docker build -t myapp:$(git rev-parse --short HEAD) .

# Run tests against the built image
docker run --rm myapp:$(git rev-parse --short HEAD) pytest

# If tests pass, tag for release
docker tag myapp:$(git rev-parse --short HEAD) myapp:v1.2.3
```

## Verifying Reproducibility

Test that your builds are reproducible:

```bash
# Build twice and compare digests
docker build -t myapp:build1 .
docker build -t myapp:build2 .

# Compare the image digests
docker inspect --format='{{.Id}}' myapp:build1
docker inspect --format='{{.Id}}' myapp:build2
```

Note that some factors prevent byte-for-byte reproducibility even with full version pinning: timestamps in layers, non-deterministic package manager behavior, and build context metadata. The goal is functional reproducibility (same behavior), not necessarily bitwise identity.

## Audit Your Current Dockerfile

Use tools to identify unpinned versions in existing Dockerfiles:

```bash
# Use hadolint to check for unpinned versions
docker run --rm -i hadolint/hadolint < Dockerfile
```

Hadolint warns about common issues including:

- DL3006: Always tag the version of an image explicitly
- DL3008: Pin versions in apt-get install
- DL3013: Pin versions in pip install
- DL3018: Pin versions in apk add

## Summary

Reproducible Docker builds require pinning versions at every level: base images, system packages, language packages, and build tools. Use lockfiles (package-lock.json, requirements.txt with hashes, go.sum, Cargo.lock) to pin transitive dependencies. Pin base images to at least a minor version, or to a digest for maximum reproducibility. Automate dependency updates with tools like Renovate or Dependabot so that pinned versions do not become stale. The small upfront cost of version pinning prevents the much larger cost of debugging mysterious build failures caused by unexpected dependency changes.
