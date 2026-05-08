# How to Build an Image from a Remote URL with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Remote URL

Description: Learn how to build container images directly from remote URLs with Podman, including tarballs, raw Containerfiles, and remote build contexts.

---

> Building from remote URLs lets you trigger image builds without cloning repositories or downloading files manually.

Podman can build images directly from remote sources, including tarballs hosted on web servers, raw Containerfiles at URLs, and remote build contexts. This is useful for CI/CD pipelines, automated builds, and when working with centrally hosted build definitions. This guide covers all the remote URL build patterns.

---

## Building from a Remote Tarball

Podman can download a tarball, extract it, and use it as the build context.

```bash
# Build from a remote tarball containing a Containerfile and source code

podman build -t myapp:latest https://example.com/project/source.tar.gz

# The tarball should contain a Containerfile or Dockerfile at its root
# along with the source code needed by COPY instructions
```

## Building from a Remote Containerfile

You can pass a URL pointing to a Containerfile directly.

```bash
# Build from a remote Containerfile (no build context)
podman build -t myimage:latest https://example.com/Containerfile

# Build from a raw Containerfile on GitHub
podman build -t myimage:latest \
  https://raw.githubusercontent.com/myorg/myapp/main/Containerfile
```

Note that when building from a remote Containerfile URL, Podman uses the downloaded Containerfile in a temporary context. This means COPY and ADD instructions that reference local project files will fail. The Containerfile must be self-contained.

## Using a Remote Containerfile with a Local Context

Combine a remote Containerfile with a local build context.

```bash
# Download Containerfile from a URL, use local directory as context
podman build \
  -f https://raw.githubusercontent.com/myorg/shared-builds/main/Containerfile.python \
  -t myapp:latest \
  .
```

## Building from GitHub Release Assets

Build from tarballs attached to GitHub releases.

```bash
# Build from a GitHub release tarball
podman build -t myapp:v1.0.0 \
  -f myapp-1.0.0/Containerfile \
  https://github.com/myorg/myapp/archive/refs/tags/v1.0.0.tar.gz
```

The tarball must contain a Containerfile or Dockerfile at its root level. If the archive has a top-level directory, pass the Containerfile path inside the extracted archive with `-f`.

## Building from a Remote Context with Authentication

For private URLs that require authentication, download the file first.

```bash
# Download with authentication, then build
curl -H "Authorization: token $GITHUB_TOKEN" \
  -L -o /tmp/build-context.tar.gz \
  https://api.github.com/repos/myorg/private-repo/tarball/main

podman build -t myapp:latest /tmp/build-context.tar.gz
rm /tmp/build-context.tar.gz
```

## Using Stdin with Remote Content

Combine curl with stdin for flexible remote builds.

```bash
# Fetch a Containerfile from a URL and pipe it to podman build
curl -sSL https://example.com/Containerfile | \
  podman build -t myimage:latest -f - .

# Fetch and build with no local context
curl -sSL https://example.com/Containerfile | \
  podman build -t myimage:latest -f - /dev/null
```

## Remote URL Build in CI/CD

Use remote URLs for centralized build definitions in CI/CD pipelines.

```bash
#!/bin/bash
# ci-build.sh - Build using shared Containerfile from a central repository

set -e

SHARED_BUILDS_URL="https://raw.githubusercontent.com/myorg/shared-builds/main"
APP_NAME="myapp"
BUILD_TYPE="${1:-python}"

echo "Fetching shared Containerfile for ${BUILD_TYPE}"
podman build \
  -f "${SHARED_BUILDS_URL}/Containerfile.${BUILD_TYPE}" \
  -t "${APP_NAME}:latest" \
  .
```

## Building from an HTTP Server

Set up an internal HTTP server to host build contexts.

```bash
# On your build artifact server:
# Place tarballs at http://build-server.internal/contexts/

# Build from the internal server
podman build -t myapp:latest \
  http://build-server.internal/contexts/myapp-latest.tar.gz

# Build different projects from the same server
podman build -t api:latest http://build-server.internal/contexts/api.tar.gz
podman build -t web:latest http://build-server.internal/contexts/web.tar.gz
```

## Creating Build Context Tarballs

Prepare tarballs for remote builds.

```bash
# Create a build context tarball from a project
cd /path/to/myproject
tar -czf /tmp/build-context.tar.gz \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=.env \
  -C . .

# Upload to a web server
scp /tmp/build-context.tar.gz webserver:/var/www/builds/myapp-latest.tar.gz

# Build from the uploaded tarball
podman build -t myapp:latest https://webserver.example.com/builds/myapp-latest.tar.gz
```

## Verifying Remote Builds

Always verify images built from remote sources.

```bash
# Check the image was built correctly
podman inspect myapp:latest

# Verify the image runs
podman run --rm myapp:latest echo "Build successful"

# Check the image history
podman history myapp:latest

# Verify the image size is reasonable
podman images myapp:latest
```

## Security Considerations

Remote builds introduce additional trust considerations.

```bash
# Always use HTTPS for remote URLs
# GOOD:
podman build -t myapp:latest https://example.com/Containerfile

# BAD: HTTP is not encrypted
# podman build -t myapp:latest http://example.com/Containerfile

# Verify checksums when possible
curl -sSL https://example.com/context.tar.gz -o /tmp/context.tar.gz
echo "expected_sha256_hash  /tmp/context.tar.gz" | sha256sum -c -
podman build -t myapp:latest /tmp/context.tar.gz
```

## Combining Remote Containerfile with Build Args

Pass build arguments when using remote Containerfiles.

```bash
podman build \
  -f https://raw.githubusercontent.com/myorg/shared-builds/main/Containerfile.node \
  --build-arg NODE_VERSION=20 \
  --build-arg APP_PORT=3000 \
  -t myapp:latest \
  .
```

## Summary

Building from remote URLs with Podman provides flexibility for centralized build management, CI/CD pipelines, and automated workflows. Use remote tarballs for complete build contexts, remote Containerfile URLs for shared build definitions, and combine remote Containerfiles with local build contexts when needed. Always use HTTPS and verify the integrity of remote resources, especially in production build pipelines.
