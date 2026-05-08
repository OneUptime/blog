# How to Debug Failed Podman Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Debugging, Troubleshooting

Description: Learn practical techniques to diagnose and fix failed Podman container image builds, from reading error output to inspecting intermediate layers.

---

> When a Podman build fails, the error message is just the starting point. The real debugging happens when you inspect intermediate layers, run commands interactively, and isolate the failing step.

Build failures are inevitable. A package might be unavailable, a file might be missing, or a compile step might fail. This guide covers systematic approaches to diagnose and resolve Podman build failures quickly.

---

## Reading Build Error Output

The first step is always to carefully read the error output. Podman tells you which step failed and what went wrong.

```bash
# Run a build and capture the output

podman build -t myapp:latest . 2>&1 | tee build.log

# If the build fails, search for the error
grep -i "error\|failed\|not found" build.log
```

A typical failure looks like this:

```text
STEP 4/8: RUN apt-get install -y nonexistent-package
E: Unable to locate package nonexistent-package
Error: building at STEP "RUN apt-get install -y nonexistent-package": while running runtime: exit status 100
```

## Building Up to the Failing Step

Use `--target` or modify your Containerfile temporarily to build up to just before the failing instruction.

```bash
cat > Containerfile <<'EOF'
FROM ubuntu:22.04 AS base
RUN apt-get update

FROM base AS deps
RUN apt-get install -y some-package   # This step fails

FROM deps AS app
COPY . /app
CMD ["/app/run.sh"]
EOF

# Build just the "base" stage to get an interactive shell
podman build --target base -t debug:base .
podman run --rm -it debug:base /bin/bash

# Now manually run the failing command inside the container
apt-get install -y some-package
# See the real error and debug it interactively
```

## Using --layers to Inspect Intermediate Images

Podman creates intermediate images for each layer. You can access them when `--layers` is enabled (the default).

```bash
# Build with verbose output to see layer IDs
podman build --layers -t myapp:latest . 2>&1

# After a failure, list recent images including intermediates
podman images -a

# Run a shell in the last successful intermediate image
podman run --rm -it <intermediate-image-id> /bin/sh
```

## Keeping Intermediate Containers

Use `--rm=false` and `--force-rm=false` to keep the containers from each build step, including when the build fails.

```bash
# Build without removing intermediate containers
podman build --rm=false --force-rm=false -t myapp:latest . || true

# List the intermediate containers
podman ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Command}}\t{{.Status}}"

# Inspect the last container (the one that failed)
podman logs <container-id>

# Re-run the failed container's original command interactively
podman start -ai <container-id>

# Or commit it to an image and run interactively
podman commit <container-id> debug:failed
podman run --rm -it debug:failed /bin/sh

# Clean up when done
podman rm $(podman ps -a -q)
```

## Adding Debug Output to Your Containerfile

Temporarily add debugging commands to identify issues.

```bash
cat > Containerfile <<'EOF'
FROM alpine:3.19

RUN apk add --no-cache curl nodejs npm

# Debug: Check what is available
RUN ls -la /etc/
RUN cat /etc/os-release
RUN which curl && curl --version

# Debug: Check network connectivity
RUN ping -c 1 google.com || echo "No network"
RUN curl -I https://registry.npmjs.org || echo "Cannot reach npm"

WORKDIR /app
COPY . .

# Debug: Verify files were copied
RUN ls -laR /app/
RUN cat /app/package.json || echo "package.json missing"

RUN npm install
CMD ["node", "index.js"]
EOF
```

## Common Failures and Solutions

### Package Not Found

```bash
# Error: Unable to locate package
# Fix: Update package lists first, check package name
RUN apt-get update && apt-get install -y package-name

# On Alpine, check the correct package name
podman run --rm alpine:3.19 apk search keyword
```

### File Not Found During COPY

```bash
# Error: COPY failed: file not found
# Debug: Check your build context
ls -la  # Verify files exist in the build context directory

# Check .containerignore is not excluding the file
cat .containerignore

# Verify the path is relative to the build context
podman build -t test . 2>&1
```

### Permission Denied

```bash
# Error: Permission denied
# Fix: Check file permissions and ownership
cat > Containerfile <<'EOF'
FROM alpine:3.19
COPY --chmod=755 script.sh /usr/local/bin/
# Or fix permissions after copy
COPY script.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/script.sh
EOF
```

### Network Issues During Build

```bash
# Error: Could not resolve host / Connection timed out
# Check DNS resolution
podman build --dns=8.8.8.8 -t myapp:latest .

# Check if you need a proxy
podman build \
  --build-arg HTTP_PROXY=http://proxy:8080 \
  --build-arg HTTPS_PROXY=http://proxy:8080 \
  -t myapp:latest .
```

### Out of Disk Space

```bash
# Error: no space left on device
# Check Podman storage usage
podman system df

# Clean up unused resources
podman system prune -f

# Remove all unused images
podman image prune -a -f

# Check where Podman stores data
podman info --format '{{.Store.GraphRoot}}'
df -h $(podman info --format '{{.Store.GraphRoot}}')
```

## Verbose Build Output

Increase logging to get more details about what is happening.

```bash
# Maximum verbosity with Podman
podman --log-level=debug build -t myapp:latest . 2>&1 | tee debug-build.log

# Search the debug log for specific issues
grep -i "error\|warning\|fail" debug-build.log
```

## Rebuilding Without Cache

Sometimes the cache itself is the problem. A cached layer might have stale package lists or broken state.

```bash
# Rebuild everything from scratch
podman build --no-cache -t myapp:latest .

# Or invalidate cache from a specific point
podman build --build-arg CACHE_BUST=$(date +%s) -t myapp:latest .
```

## Using Podman Events for Build Issues

Monitor Podman events during a build for additional context.

```bash
# In terminal 1: Watch container events from RUN instructions
podman events --filter type=container

# In terminal 2: Run the build
podman build -t myapp:latest .
```

## Summary

Debugging Podman build failures involves reading error output carefully, building to intermediate stages with `--target`, keeping intermediate containers with `--rm=false --force-rm=false`, and adding temporary debug output. For persistent issues, use `--no-cache` to rule out stale cache, `--log-level=debug` for detailed logging, and run interactive shells in intermediate images to test commands manually. Clean up debug artifacts after resolving the issue with `podman system prune`.
