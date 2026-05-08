# How to Build an Image and Remove Intermediate Containers with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Cleanup

Description: Learn how to automatically remove intermediate containers during Podman image builds to keep your system clean and save disk space.

---

> Removing intermediate containers during builds prevents leftover clutter and keeps your Podman environment lean and manageable.

When Podman builds an image from a Containerfile, it creates intermediate containers for each instruction. These containers are normally cleaned up, but in some scenarios they can linger, consuming disk space. This guide covers how to control intermediate container removal during builds and how to clean up after failed builds.

---

## How Podman Builds Work Internally

Each instruction in a Containerfile (FROM, RUN, COPY, etc.) creates a temporary intermediate container. Podman runs the instruction inside that container, commits the result as a new layer, and then removes the container. The key flags that control this behavior are `--rm` and `--force-rm`.

## The Default Behavior

By default, Podman removes intermediate containers after a successful build. This is equivalent to using `--rm=true`, and current Podman also defaults `--force-rm` to true for failed builds.

```bash
# These two commands are equivalent

podman build -t myapp:latest .
podman build --rm -t myapp:latest .
```

After a successful build, you should see no leftover containers from the build process:

```bash
# Check for any leftover containers
podman ps -a --filter "status=exited"
```

## Keeping Intermediate Containers (For Debugging)

If you want to inspect intermediate containers after a build, you can disable automatic removal.

```bash
# Keep intermediate containers after the build
podman build --rm=false -t myapp:latest .

# Now you can see the intermediate containers, including external build containers
podman ps -a --external

# Inspect a specific intermediate container
podman inspect <container-id>

# Mount an intermediate container to inspect its filesystem
podman mount <container-id>
```

This is useful when debugging build issues since you can examine the filesystem state at each step.

## Force Removing Containers on Build Failure

Current Podman enables `--force-rm` by default, so intermediate containers are removed even when a build fails. Setting it explicitly documents the intended cleanup behavior.

```bash
# Always remove intermediate containers, even on failure
podman build --force-rm -t myapp:latest .
```

This is particularly useful in CI/CD pipelines where you want a clean environment regardless of build outcomes.

```bash
# Typical CI/CD build command
podman build \
  --force-rm \
  --no-cache \
  -t myapp:$(git rev-parse --short HEAD) \
  .
```

## Practical Example

Create a Containerfile with multiple layers and observe intermediate container behavior.

```bash
# Create a test project
mkdir -p ~/intermediate-demo && cd ~/intermediate-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
RUN echo "Step 1: Installing packages" && apk add --no-cache curl
RUN echo "Step 2: Creating directories" && mkdir -p /app/data
RUN echo "Step 3: Writing config" && echo "key=value" > /app/config.txt
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]
EOF

cat > entrypoint.sh <<'EOF'
#!/bin/sh
echo "App is running"
cat /app/config.txt
EOF
```

Now build with and without the flags:

```bash
# Build with default behavior (intermediates removed on success)
podman build -t demo:v1 .

# Verify no intermediate containers remain
podman ps -a --format "{{.ID}} {{.Image}} {{.Status}}"

# Build keeping intermediates for debugging
podman build --rm=false -t demo:v2 .

# Now you can see intermediate containers
podman ps -a --external --format "{{.ID}} {{.Image}} {{.Status}}"
```

## Simulating a Failed Build

To see how `--force-rm` works, create a Containerfile that intentionally fails.

```bash
cat > Containerfile.fail <<'EOF'
FROM alpine:3.19
RUN echo "This step succeeds"
RUN echo "This step also succeeds" && mkdir /app
RUN exit 1  # This step will fail
RUN echo "This step never runs"
EOF

# Build with --force-rm disabled (may leave intermediate containers)
podman build --force-rm=false -f Containerfile.fail -t demo:fail . || true

# Check for leftover containers
podman ps -a --external

# Now build with --force-rm
podman build --force-rm -f Containerfile.fail -t demo:fail . || true

# Verify intermediates were cleaned up
podman ps -a --external
```

## Cleaning Up After the Fact

If intermediate containers were left behind, you can clean them up manually.

```bash
# Remove all stopped containers
podman container prune -f

# Remove only exited containers
podman rm --filter "status=exited" -f

# Remove unused containers, networks, dangling images, and build cache
podman system prune -f

# Remove everything including unused images and volumes
podman system prune --all --volumes -f

# Also remove build containers left by an interrupted build
podman system prune --build -f
```

## Combining with Other Build Flags

You can combine `--force-rm` with other flags for a production-ready build command.

```bash
# Production build: force remove intermediates, no cache, squash layers
podman build \
  --force-rm \
  --no-cache \
  --squash \
  --label "build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --label "build.commit=$(git rev-parse HEAD)" \
  -t myapp:latest \
  .
```

## Automating Cleanup in CI/CD

Add cleanup steps to your CI/CD pipeline to ensure a clean state.

```bash
#!/bin/bash
# ci-build.sh - Clean build script for CI/CD

set -e

IMAGE_NAME="myapp"
IMAGE_TAG="${CI_COMMIT_SHORT_SHA:-latest}"

# Pre-build cleanup
podman container prune -f
podman image prune -f

# Build with forced cleanup
podman build \
  --force-rm \
  -t "${IMAGE_NAME}:${IMAGE_TAG}" \
  .

# Post-build cleanup of dangling images
podman image prune -f

echo "Build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
```

## Summary

Podman removes intermediate containers by default after successful builds, and current Podman also removes them by default when builds fail. Use `--force-rm` explicitly to document cleanup behavior in CI/CD environments. When debugging, use `--rm=false` to keep intermediate containers for inspection. Run `podman system prune` periodically to reclaim disk space from leftover artifacts.
