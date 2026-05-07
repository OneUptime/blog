# How to Use Buildah for Debugging Container Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Debugging, Troubleshooting, Image Building

Description: Learn how to use Buildah to debug and troubleshoot container image builds by inspecting intermediate states, running commands, and analyzing failures.

---

> Buildah turns container build debugging from guesswork into a systematic, step-by-step investigation.

When a container build fails or produces unexpected results, traditional Containerfile builds can be frustrating to debug. You end up adding echo statements, rebuilding from scratch, and waiting for the failure to reproduce. Buildah solves this by letting you interact with the container at any point during the build process. You can run commands, inspect the filesystem, and test fixes without starting over. This guide covers practical debugging techniques for container builds.

---

## Common Build Problems

```bash
# The types of issues you can debug with Buildah:

# 1. Package installation failures
# 2. Missing dependencies at runtime
# 3. Permission errors
# 4. Wrong file paths or configurations
# 5. Environment variable issues
# 6. Entrypoint/CMD errors
# 7. Image size bloat
# 8. Layer caching problems
```

## Interactive Build Debugging

### Step-by-Step Execution

```bash
# Instead of running a Containerfile, execute each step manually
# This lets you inspect the state after each command

# Step 1: Start from the base image
container=$(buildah from python:3.12-slim)
echo "Container: $container"

# Step 2: Try the command that fails in your Containerfile
buildah run $container -- apt-get update
echo "Exit code: $?"

# Step 3: If something goes wrong, inspect the state
buildah run $container -- sh -c "cat /etc/apt/sources.list /etc/apt/sources.list.d/* 2>/dev/null" || echo "No apt sources found"

# Step 4: Try the fix
buildah run $container -- apt-get install -y --no-install-recommends libpq-dev
echo "Exit code: $?"

# Step 5: If it fails, check what is available
buildah run $container -- apt-cache search libpq
```

### Interactive Shell Access

```bash
# Drop into an interactive shell inside the working container
buildah run --terminal $container -- /bin/bash

# Inside the shell, you can:
# - Test commands before adding them to your build
# - Check paths and file locations
# - Verify package installations
# - Test application startup
# Type 'exit' to return to the host
```

## Debugging Package Installation Failures

```bash
container=$(buildah from ubuntu:22.04)

# Common issue: package not found
buildah run $container -- apt-get update

# Debug: Search for the correct package name
buildah run $container -- apt-cache search postgres | head -10

# Debug: Check available versions
buildah run $container -- apt-cache policy libpq-dev

# Debug: Check what provides a specific file
buildah run $container -- bash -c "apt-get install -y apt-file && apt-file update && apt-file search pg_config"

# Fix: Install the correct package
buildah run $container -- apt-get install -y libpq-dev

buildah rm $container
```

## Debugging Runtime Errors

```bash
# Build an image that has a runtime error
container=$(buildah from python:3.12-slim)
buildah run $container -- pip install --no-cache-dir flask

# Create an intentionally broken app
cat << 'EOF' > /tmp/broken_app.py
from flask import Flask
import nonexistent_module  # This will fail at runtime

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello"
EOF
buildah copy $container /tmp/broken_app.py /app/app.py
buildah config --workingdir /app $container
buildah config --entrypoint '["python3", "app.py"]' $container
buildah commit $container broken-app:debug

# Run it and see the error
podman run --rm broken-app:debug 2>&1 || true

# Now debug interactively using buildah run
buildah run $container -- python3 -c "import nonexistent_module" 2>&1 || true
# ModuleNotFoundError: No module named 'nonexistent_module'

# Check what modules are available
buildah run $container -- pip list

# Fix the issue
buildah run $container -- pip install --no-cache-dir nonexistent_module 2>&1 || echo "Module does not exist, remove the import"

buildah rm $container
podman rmi broken-app:debug
```

## Debugging Permission Issues

```bash
container=$(buildah from alpine:3.19)

# Set up an application
buildah run $container -- adduser -D -u 1000 appuser
buildah run $container -- apk add --no-cache python3

mkdir -p /tmp/debug-app
echo "print('hello')" > /tmp/debug-app/main.py
buildah copy $container /tmp/debug-app/main.py /app/main.py

# Set user to non-root
buildah config --user appuser $container

# Debug: Check what the user can access
buildah run $container -- id
buildah run $container -- ls -la /app/

# Debug: Try to write to a directory (will it fail at runtime?)
buildah run $container -- sh -c "touch /app/test.txt 2>&1" || echo "PERMISSION DENIED"

# Fix: Change ownership of the app directory
buildah config --user root $container
buildah run $container -- chown -R appuser:appuser /app/
buildah config --user appuser $container

# Verify the fix
buildah run $container -- touch /app/test.txt && echo "WRITE OK"
buildah run $container -- ls -la /app/

buildah rm $container
```

## Inspecting Image Layers and Size

```bash
container=$(buildah from ubuntu:22.04)

# Install packages and track size changes
echo "Before any installs:"
buildah run $container -- bash -c "du -sh / 2>/dev/null"

buildah run $container -- bash -c "apt-get update && apt-get install -y python3 python3-pip"
echo "After Python install:"
buildah run $container -- bash -c "du -sh / 2>/dev/null"

# Find what is taking up the most space
buildah run $container -- bash -c "du -sh /* 2>/dev/null | sort -rh | head -10"

# Find the largest files
buildah run $container -- bash -c "find / -type f -size +5M -exec ls -lh {} \; 2>/dev/null | sort -k5 -rh | head -10"

# Check for leftover caches
buildah run $container -- bash -c "du -sh /var/cache/apt/ 2>/dev/null"
buildah run $container -- bash -c "du -sh /var/lib/apt/lists/ 2>/dev/null"
buildah run $container -- bash -c "du -sh /root/.cache/ 2>/dev/null"

# Clean up caches
buildah run $container -- bash -c "apt-get clean && rm -rf /var/lib/apt/lists/* /root/.cache"
echo "After cleanup:"
buildah run $container -- bash -c "du -sh / 2>/dev/null"

buildah rm $container
```

## Debugging Entrypoint and CMD

```bash
container=$(buildah from alpine:3.19)
buildah run $container -- apk add --no-cache python3

echo 'print("Application started")' > /tmp/starter.py
buildah copy $container /tmp/starter.py /app/starter.py

# Common mistake: wrong entrypoint format
# Shell form (less predictable)
buildah config --entrypoint 'python3 /app/starter.py' $container
buildah commit $container test-entry:shell
podman run --rm test-entry:shell 2>&1 || echo "Shell form result"

# Exec form (recommended, more predictable)
buildah config --entrypoint '["python3", "/app/starter.py"]' $container
buildah commit $container test-entry:exec
podman run --rm test-entry:exec 2>&1 || echo "Exec form result"

# Debug: Check what the entrypoint is set to
buildah inspect $container --format '{{.OCIv1.Config.Entrypoint}}'
buildah inspect $container --format '{{.OCIv1.Config.Cmd}}'

# Debug: Check if the binary exists and is executable
buildah run $container -- which python3
buildah run $container -- ls -la /app/starter.py

buildah rm $container
podman rmi test-entry:shell test-entry:exec
```

## Debugging Network Issues During Builds

```bash
container=$(buildah from alpine:3.19)

# Debug: Check DNS resolution inside the container
buildah run $container -- cat /etc/resolv.conf

# Debug: Test connectivity
buildah run $container -- apk add --no-cache curl
buildah run $container -- curl -s -o /dev/null -w "%{http_code}" https://pypi.org/

# Debug: Check if specific ports are reachable
buildah run $container -- sh -c "curl -s --connect-timeout 5 https://registry.npmjs.org/ > /dev/null && echo 'OK' || echo 'FAIL'"

# If DNS fails, try using a specific nameserver
buildah run $container -- sh -c "echo 'nameserver 8.8.8.8' > /etc/resolv.conf"
buildah run $container -- curl -s https://pypi.org/ > /dev/null && echo "DNS fixed"

buildah rm $container
```

## Creating a Debug Helper Script

```bash
cat << 'SCRIPT' > /tmp/debug-build.sh
#!/bin/bash
# Debug helper: Run a Containerfile step by step with inspection
set -euo pipefail

IMAGE="${1:-ubuntu:22.04}"
echo "Starting debug session from: $IMAGE"

container=$(buildah from "$IMAGE")
echo "Container: $container"
echo ""
echo "Available commands:"
echo "  buildah run $container -- <command>    # Run a command"
echo "  buildah run --terminal $container -- /bin/bash  # Interactive shell"
echo "  buildah inspect $container             # Inspect metadata"
echo "  buildah mount $container               # Mount filesystem (use with unshare)"
echo "  buildah commit $container debug:latest # Save current state"
echo "  buildah rm $container                  # Clean up"
echo ""
echo "Container ID stored in: $container"
SCRIPT
chmod +x /tmp/debug-build.sh
```

## Cleaning Up

```bash
buildah rm --all 2>/dev/null
rm -rf /tmp/broken_app.py /tmp/debug-app /tmp/starter.py /tmp/debug-build.sh
```

## Summary

Buildah transforms container build debugging from a trial-and-error process into a controlled investigation. By executing build steps one at a time, you can inspect the container state after each change, test fixes interactively, and identify the exact step where things go wrong. Key techniques include using `buildah run` for testing commands, checking file permissions and ownership, analyzing disk usage for size optimization, and verifying entrypoint configuration. This interactive approach saves significant time compared to repeatedly modifying and rebuilding a Containerfile.
