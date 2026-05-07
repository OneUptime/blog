# How to Use Buildah for Scripted Image Builds with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Scripted Builds, Automation, CI/CD, Bash

Description: Learn how to use Buildah in shell scripts for fully automated, repeatable container image builds without Containerfiles.

---

> Scripted Buildah builds give you the full power of shell scripting for container image construction.

While Containerfiles are the standard way to build container images, they have limitations. They support build arguments and shell logic in `RUN` instructions, but they do not provide native conditionals, loops, or arbitrary orchestration across build steps. Buildah scripts solve this by letting you use the full power of Bash or any other scripting language to construct images. This approach is particularly useful in CI/CD pipelines where build parameters vary between environments.

---

## Why Scripted Builds

```bash
# Containerfiles are mostly declarative. Buildah scripts are fully dynamic:

# - Conditional package installation based on environment variables
# - Looping over a list of services to build multiple images
# - Dynamic configuration based on build arguments
# - Integration with external tools during the build
# - Better error handling with set -e and trap
```

## Basic Build Script

```bash
cat << 'SCRIPT' > /tmp/build-image.sh
#!/bin/bash
# Buildah scripted build for a Python web application
set -euo pipefail

# Configuration
IMAGE_NAME="myapp"
IMAGE_TAG="${1:-latest}"
BASE_IMAGE="python:3.12-slim"

echo "Building ${IMAGE_NAME}:${IMAGE_TAG}..."

# Create the working container
container=$(buildah from "$BASE_IMAGE")

# Clean up on exit
trap "buildah rm $container 2>/dev/null" EXIT

# Update and install system dependencies
buildah run $container -- bash -c "\
  apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*"

# Install Python dependencies
buildah run $container -- pip install --no-cache-dir flask gunicorn

# Copy application code
buildah copy $container ./app/ /app/

# Configure the image
buildah config --workingdir /app $container
buildah config --port 5000 $container
buildah config --entrypoint '["gunicorn"]' $container
buildah config --cmd '["--bind", "0.0.0.0:5000", "app:app"]' $container
buildah config --label build-date="$(date -u +%Y-%m-%dT%H:%M:%SZ)" $container
buildah config --label version="$IMAGE_TAG" $container

# Commit the image
buildah commit $container "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Successfully built ${IMAGE_NAME}:${IMAGE_TAG}"
SCRIPT
chmod +x /tmp/build-image.sh
```

## Conditional Build Script

```bash
cat << 'SCRIPT' > /tmp/build-conditional.sh
#!/bin/bash
# Build script with conditional logic based on environment
set -euo pipefail

BUILD_ENV="${BUILD_ENV:-development}"
IMAGE_NAME="myapp"
IMAGE_TAG="${BUILD_ENV}-$(date +%Y%m%d)"

echo "Building for environment: ${BUILD_ENV}"

container=$(buildah from python:3.12-slim)
trap "buildah rm $container 2>/dev/null" EXIT

# Base dependencies
buildah run $container -- pip install --no-cache-dir flask

# Conditional: Install dev tools only for development builds
if [ "$BUILD_ENV" = "development" ]; then
  echo "Including development tools..."
  buildah run $container -- pip install --no-cache-dir \
    pytest flask-debugtoolbar ipdb
  buildah config --env FLASK_DEBUG=1 $container
  buildah config --env APP_ENV=development $container
fi

# Conditional: Production optimizations
if [ "$BUILD_ENV" = "production" ]; then
  echo "Applying production optimizations..."
  buildah run $container -- pip install --no-cache-dir gunicorn
  buildah config --env APP_ENV=production $container
  buildah config --user 1000:1000 $container

  # Remove unnecessary files in production
  buildah run $container -- bash -c "\
    find / -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null; \
    rm -rf /root/.cache /tmp/*"
fi

# Common configuration
buildah config --workingdir /app $container
buildah config --port 5000 $container
buildah config --label environment="$BUILD_ENV" $container

buildah commit --squash $container "${IMAGE_NAME}:${IMAGE_TAG}"
echo "Built ${IMAGE_NAME}:${IMAGE_TAG} for ${BUILD_ENV}"
SCRIPT
chmod +x /tmp/build-conditional.sh

# Usage:
# BUILD_ENV=development /tmp/build-conditional.sh
# BUILD_ENV=production /tmp/build-conditional.sh
```

## Multi-Image Build Script

```bash
cat << 'SCRIPT' > /tmp/build-multi.sh
#!/bin/bash
# Build multiple related images from a single script
set -euo pipefail

REGISTRY="${REGISTRY:-localhost}"
VERSION="${VERSION:-1.0.0}"

# Define services to build
declare -A SERVICES=(
  ["api"]="flask gunicorn"
  ["worker"]="celery redis"
  ["scheduler"]="celery redis apscheduler"
)

for service in "${!SERVICES[@]}"; do
  echo "=== Building ${service} ==="
  packages="${SERVICES[$service]}"

  container=$(buildah from python:3.12-slim)

  # Install service-specific packages
  buildah run $container -- pip install --no-cache-dir $packages

  # Configure each service
  buildah config --workingdir /app $container
  buildah config --label service="$service" $container
  buildah config --label version="$VERSION" $container

  # Service-specific entrypoints
  case $service in
    api)
      buildah config --port 5000 $container
      buildah config --entrypoint '["gunicorn"]' $container
      buildah config --cmd '["--bind", "0.0.0.0:5000", "app:app"]' $container
      ;;
    worker)
      buildah config --entrypoint '["celery"]' $container
      buildah config --cmd '["-A", "tasks", "worker", "--loglevel=info"]' $container
      ;;
    scheduler)
      buildah config --entrypoint '["celery"]' $container
      buildah config --cmd '["-A", "tasks", "beat", "--loglevel=info"]' $container
      ;;
  esac

  buildah commit $container "${REGISTRY}/${service}:${VERSION}"
  buildah rm $container

  echo "Built ${REGISTRY}/${service}:${VERSION}"
done

echo ""
echo "=== All images built ==="
podman images --filter "label=version=${VERSION}" \
  --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
SCRIPT
chmod +x /tmp/build-multi.sh
```

## CI/CD Pipeline Script

```bash
cat << 'SCRIPT' > /tmp/ci-build.sh
#!/bin/bash
# CI/CD pipeline build script with validation and testing
set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-myapp}"
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
IMAGE_TAG="${IMAGE_TAG:-${GIT_SHA}}"

echo "Starting CI build: ${IMAGE_NAME}:${IMAGE_TAG}"

# Build the image
container=$(buildah from python:3.12-slim)
trap "buildah rm $container 2>/dev/null" EXIT

buildah run $container -- pip install --no-cache-dir flask pytest
buildah copy $container . /app
buildah config --workingdir /app $container

# Run tests inside the build container
echo "Running tests..."
if buildah run $container -- python -m pytest tests/ -v; then
  echo "Tests passed!"
else
  echo "Tests FAILED! Aborting build."
  exit 1
fi

# Remove test dependencies from production image
buildah run $container -- pip uninstall -y pytest

# Configure for production
buildah config --port 5000 $container
buildah config --entrypoint '["python3", "app.py"]' $container
buildah config --label git-sha="$GIT_SHA" $container
buildah config --label build-time="$(date -u +%Y-%m-%dT%H:%M:%SZ)" $container

# Commit the tested image
buildah commit --squash $container "${IMAGE_NAME}:${IMAGE_TAG}"

# Also tag as latest
podman tag "${IMAGE_NAME}:${IMAGE_TAG}" "${IMAGE_NAME}:latest"

echo "CI build complete: ${IMAGE_NAME}:${IMAGE_TAG}"
SCRIPT
chmod +x /tmp/ci-build.sh
```

## Error Handling Best Practices

```bash
cat << 'SCRIPT' > /tmp/build-safe.sh
#!/bin/bash
# Build script with comprehensive error handling
set -euo pipefail

container=""

cleanup() {
  local exit_code=$?
  if [ -n "$container" ]; then
    echo "Cleaning up container: $container"
    buildah rm "$container" 2>/dev/null || true
  fi
  if [ $exit_code -ne 0 ]; then
    echo "Build FAILED with exit code $exit_code"
  fi
  exit $exit_code
}

trap cleanup EXIT

# Validate prerequisites
command -v buildah >/dev/null || { echo "buildah not found"; exit 1; }
command -v podman >/dev/null || { echo "podman not found"; exit 1; }

container=$(buildah from alpine:3.19)

# Each step logs progress
echo "Step 1/3: Installing packages..."
buildah run $container -- apk add --no-cache python3 py3-pip || {
  echo "Package installation failed"
  exit 1
}

echo "Step 2/3: Configuring image..."
buildah config --workingdir /app $container
buildah config --entrypoint '["python3"]' $container

echo "Step 3/3: Committing image..."
buildah commit $container safe-build:latest

echo "Build completed successfully!"
SCRIPT
chmod +x /tmp/build-safe.sh
```

## Cleaning Up

```bash
# Remove all working containers and test images
buildah rm --all 2>/dev/null
podman rmi myapp:latest 2>/dev/null
rm -f /tmp/build-image.sh /tmp/build-conditional.sh /tmp/build-multi.sh \
  /tmp/ci-build.sh /tmp/build-safe.sh
```

## Summary

Scripted Buildah builds unlock capabilities that Containerfiles cannot provide, including conditional logic, loops, dynamic configuration, and integrated testing. By writing build logic as shell scripts, you get full control over the build process with proper error handling and cleanup. This approach is especially valuable in CI/CD pipelines where builds need to adapt to different environments and configurations. Combined with Podman for running the resulting images, scripted builds give you a flexible and powerful container workflow.
