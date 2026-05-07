# How to Migrate Dockerfiles to Containerfiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Migration, Dockerfile, Containerfile, Buildah

Description: Learn how to migrate your Dockerfiles to Containerfiles for use with Podman and Buildah while maintaining full compatibility.

---

> Containerfiles and Dockerfiles use the same syntax - renaming is optional, but adopting Containerfile signals your commitment to open standards and avoids Docker-specific assumptions.

Podman and Buildah support both Dockerfiles and Containerfiles. A Containerfile uses the same instruction syntax as a Dockerfile. The name change reflects the shift toward vendor-neutral container tooling. This guide covers the practical steps for migrating, the few differences you should be aware of, and how to maintain compatibility with both ecosystems.

---

## Understanding the Relationship

Containerfile and Dockerfile are interchangeable names for the same format.

```bash
# Podman and Buildah use Containerfile or Dockerfile as default build-file names

# Both of these work identically:
podman build -t myapp .          # Finds Containerfile or Dockerfile
podman build -f Dockerfile .     # Explicitly use Dockerfile
podman build -f Containerfile .  # Explicitly use Containerfile

# Buildah also supports both
buildah bud -t myapp .
buildah bud -f Containerfile -t myapp .
```

## Renaming Dockerfile to Containerfile

The simplest migration is just renaming the file.

```bash
# Rename a single Dockerfile
mv Dockerfile Containerfile

# Rename across an entire project
find /path/to/project -name "Dockerfile" -exec sh -c '
  dir=$(dirname "$1")
  mv "$1" "${dir}/Containerfile"
  echo "Renamed: $1 -> ${dir}/Containerfile"
' _ {} \;

# If you also have Dockerfile.dev, Dockerfile.prod, etc.
mv Dockerfile.dev Containerfile.dev
mv Dockerfile.prod Containerfile.prod
```

## Maintaining Backward Compatibility

You can support both Docker and Podman users in the same project.

```bash
# Option 1: Keep both files (Containerfile as primary, Dockerfile as symlink)
mv Dockerfile Containerfile
ln -s Containerfile Dockerfile

# Verify the symlink
ls -la Dockerfile Containerfile

# Both tools will now find a valid file
docker build -t myapp .   # Uses Dockerfile (symlink)
podman build -t myapp .   # Uses Containerfile (primary)
```

```bash
# Option 2: Use a Makefile to abstract the build
cat > Makefile << 'MAKEFILE'
RUNTIME ?= podman
BUILD_FILE ?= Containerfile
IMAGE_NAME ?= myapp
TAG ?= latest

.PHONY: build
build:
	$(RUNTIME) build -f $(BUILD_FILE) -t $(IMAGE_NAME):$(TAG) .

.PHONY: build-docker
build-docker:
	RUNTIME=docker BUILD_FILE=Containerfile make build
MAKEFILE
```

## Updating Containerfile Instructions

While the syntax is identical, there are a few Podman-specific improvements to adopt.

```dockerfile
# Containerfile - with Podman-optimized practices

# Use fully qualified image references (avoids registry ambiguity)
FROM docker.io/library/python:3.12-slim AS builder

# Set labels using OCI standard annotation keys
LABEL org.opencontainers.image.title="My Application"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.description="Production application image"
LABEL org.opencontainers.image.source="https://github.com/myorg/myapp"

# Install dependencies
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Use a non-root user (Podman supports rootless natively)
RUN useradd --create-home appuser
USER appuser

# Set the entrypoint
EXPOSE 8080
CMD ["python", "app.py"]
```

## Handling FROM References

Podman can prompt or fail on ambiguous short image names depending on your short-name configuration. Use fully qualified names.

```dockerfile
# Docker allows short names (may be ambiguous)
FROM python:3.12-slim

# Podman best practice: use fully qualified references
FROM docker.io/library/python:3.12-slim

# For multi-stage builds, fully qualify all FROM lines
FROM docker.io/library/node:20-alpine AS frontend
WORKDIR /frontend
COPY package*.json ./
RUN npm ci && npm run build

FROM docker.io/library/python:3.12-slim AS backend
WORKDIR /app
COPY --from=frontend /frontend/dist /app/static
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

## Configuring Short-Name Aliases

Instead of rewriting all FROM lines, configure short-name aliases in Podman.

```bash
# View the default short-name aliases if the file exists
[ -f /etc/containers/registries.conf.d/shortnames.conf ] && cat /etc/containers/registries.conf.d/shortnames.conf

# Add custom aliases in a separate drop-in file
sudo tee /etc/containers/registries.conf.d/99-myapp-shortnames.conf << 'EOF'
[aliases]
  "myapp-base" = "registry.example.com/base/myapp"
  "python" = "docker.io/library/python"
  "node" = "docker.io/library/node"
EOF

# Now short names resolve without prompts
# FROM python:3.12-slim -> docker.io/library/python:3.12-slim
```

## Updating .dockerignore to .containerignore

Podman supports both `.dockerignore` and `.containerignore` files.

```bash
# Rename .dockerignore to .containerignore
mv .dockerignore .containerignore

# Or create a symlink for compatibility
ln -s .containerignore .dockerignore

# Example .containerignore content
cat > .containerignore << 'EOF'
.git
.github
node_modules
*.md
docker-compose.yml
.env
.env.*
__pycache__
*.pyc
.pytest_cache
EOF
```

## Updating CI/CD Build Commands

Update your CI/CD pipelines to use Containerfile and Podman.

```bash
# Before (Docker)
docker build -f Dockerfile -t myapp:latest .
docker push myapp:latest

# After (Podman)
podman build -f Containerfile -t myapp:latest .
podman push myapp:latest

# Universal approach (works with both)
CONTAINER_FILE=$([ -f Containerfile ] && echo Containerfile || echo Dockerfile)
RUNTIME=$(command -v podman 2>/dev/null || command -v docker)

$RUNTIME build -f "$CONTAINER_FILE" -t myapp:latest .
```

## Batch Migration Script

Migrate all Dockerfiles in a project or monorepo.

```bash
#!/bin/bash
# migrate-dockerfiles.sh - Rename all Dockerfiles to Containerfiles

PROJECT_ROOT="${1:-.}"

find "$PROJECT_ROOT" -type f -name "Dockerfile*" | while IFS= read -r DFILE; do
  DIR=$(dirname "$DFILE")
  BASENAME=$(basename "$DFILE")

  # Replace "Dockerfile" with "Containerfile" in the filename
  NEW_NAME=$(echo "$BASENAME" | sed 's/Dockerfile/Containerfile/')
  NEW_PATH="${DIR}/${NEW_NAME}"

  echo "Renaming: ${DFILE} -> ${NEW_PATH}"
  mv "$DFILE" "$NEW_PATH"

  # Create a symlink for backward compatibility
  ln -s "$NEW_NAME" "$DFILE"
  echo "  Symlink: ${DFILE} -> ${NEW_NAME}"
done

echo "Migration complete."
```

## Summary

Migrating Dockerfiles to Containerfiles is the simplest part of a Docker-to-Podman transition because the formats are identical. Rename the files, create symlinks for backward compatibility, adopt fully qualified image references, and update ignore files. The Containerfile name aligns with open container standards and signals that your project works with any OCI-compatible build tool. Use short-name aliases in Podman's configuration to avoid rewriting all FROM references, and update CI/CD pipelines to reference the new file names.
