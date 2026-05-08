# How to Use podman manifest exists to Check Manifests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Multi-Architecture, Manifest List

Description: Learn how to use the podman manifest exists command to check whether a manifest list exists locally before performing operations on it, with practical scripting examples.

---

> The podman manifest exists command gives you a clean boolean check for manifest lists, making your build scripts more reliable and idempotent.

When automating multi-architecture builds, you need to know whether a manifest list already exists before creating or modifying it. The `podman manifest exists` command provides a simple way to check, returning an exit code you can use in shell logic. This guide covers its usage and practical integration patterns.

---

## Basic Usage

The `podman manifest exists` command checks if a manifest list exists in local storage:

```bash
# Check if a manifest list exists

podman manifest exists myapp:latest

# Check the exit code
echo $?
# 0 = exists, 1 = does not exist, 125 = another error
```

The command produces no output on success. It communicates solely through exit codes: `0` means the manifest exists, `1` means it does not, and `125` indicates another issue.

## Using in Conditional Statements

The most common use is in shell conditionals:

```bash
# Check before creating a new manifest list
if podman manifest exists myapp:latest; then
    echo "Manifest list myapp:latest already exists."
else
    echo "Creating manifest list myapp:latest..."
    podman manifest create myapp:latest
fi
```

```bash
# Remove only if it exists
if podman manifest exists myapp:v1.0; then
    podman manifest rm myapp:v1.0
    echo "Removed existing manifest list."
fi
```

## Idempotent Manifest Creation

Use `podman manifest exists` to build idempotent scripts that can be run multiple times without errors:

```bash
#!/bin/bash
# create-manifest.sh - Idempotent manifest list creation

IMAGE="registry.example.com/myapp"
TAG="${1:-latest}"

# Only create if it does not already exist
if ! podman manifest exists "${IMAGE}:${TAG}"; then
    podman manifest create "${IMAGE}:${TAG}"
    echo "Created manifest list ${IMAGE}:${TAG}"
else
    echo "Manifest list ${IMAGE}:${TAG} already exists, skipping creation."
fi
```

## Integrating into CI/CD Pipelines

In CI/CD environments, checking for existing manifests prevents duplicate work:

```bash
#!/bin/bash
# ci-build-multiarch.sh

IMAGE="registry.example.com/myapp"
TAG="$(git rev-parse --short HEAD)"

# Step 1: Clean up any stale manifest from a previous failed run
if podman manifest exists "${IMAGE}:${TAG}"; then
    echo "Cleaning up stale manifest from previous run..."
    podman manifest rm "${IMAGE}:${TAG}"
fi

# Step 2: Create a fresh manifest list
podman manifest create "${IMAGE}:${TAG}"

# Step 3: Build for each target architecture
ARCHITECTURES=("amd64" "arm64" "s390x")

for ARCH in "${ARCHITECTURES[@]}"; do
    echo "Building for ${ARCH}..."
    podman build \
        --platform "linux/${ARCH}" \
        -t "${IMAGE}:${TAG}-${ARCH}" \
        .

    # Add to the manifest list
    podman manifest add "${IMAGE}:${TAG}" "containers-storage:${IMAGE}:${TAG}-${ARCH}"
done

# Step 4: Push the manifest list
podman manifest push --all "${IMAGE}:${TAG}" "docker://${IMAGE}:${TAG}"

echo "Multi-arch build complete for ${IMAGE}:${TAG}"
```

## Checking Multiple Manifests

You can loop over a list of expected manifests to verify they all exist:

```bash
#!/bin/bash
# verify-manifests.sh - Check that all required manifests exist

REQUIRED_MANIFESTS=(
    "myapp:latest"
    "myapp:v1.0"
    "myapp:v1.1"
)

MISSING=0

for MANIFEST in "${REQUIRED_MANIFESTS[@]}"; do
    if podman manifest exists "${MANIFEST}"; then
        echo "[OK] ${MANIFEST}"
    else
        echo "[MISSING] ${MANIFEST}"
        MISSING=$((MISSING + 1))
    fi
done

if [ "${MISSING}" -gt 0 ]; then
    echo "ERROR: ${MISSING} manifest(s) missing."
    exit 1
else
    echo "All manifests present."
fi
```

## Combining with manifest inspect

While `podman manifest exists` tells you if a manifest list is present, you can pair it with `podman manifest inspect` for detailed checks:

```bash
#!/bin/bash
# check-manifest-platforms.sh

IMAGE="myapp:latest"

# First check if the manifest exists at all
if ! podman manifest exists "${IMAGE}"; then
    echo "Manifest ${IMAGE} does not exist."
    exit 1
fi

# Then inspect which platforms are included
echo "Platforms in ${IMAGE}:"
podman manifest inspect "${IMAGE}" | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('manifests', []):
    p = m.get('platform', {})
    print(f\"  {p.get('os')}/{p.get('architecture')}\")
"
```

## Error Handling Patterns

```bash
# Pattern 1: Fail fast if manifest is missing
podman manifest exists myapp:latest || {
    echo "ERROR: Required manifest myapp:latest not found."
    exit 1
}

# Pattern 2: Create-or-update pattern
if podman manifest exists myapp:latest; then
    echo "Updating existing manifest..."
    podman manifest add myapp:latest myapp:latest-arm64
else
    echo "Creating new manifest..."
    podman manifest create myapp:latest myapp:latest-amd64
    podman manifest add myapp:latest myapp:latest-arm64
fi
```

## Summary

The `podman manifest exists` command is a lightweight check that returns exit code 0 when a manifest list exists locally and 1 when it does not. Use it in shell conditionals to build idempotent scripts, guard against duplicate manifest creation, and validate build pipeline state. It produces no output, making it ideal for scripting.
