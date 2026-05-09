# How to Build an Image from a Git Repository with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Git

Description: Learn how to build container images directly from Git repositories with Podman, including branch, tag, and subdirectory targeting.

---

> Building directly from Git repositories eliminates the need to clone first, streamlining CI/CD and quick builds.

Podman can clone a Git repository and use it as the build context in a single command. This simplifies automated builds, quick testing, and CI/CD pipelines by removing the manual clone step. You can target specific branches, tags, commits, and even subdirectories within the repository. This guide covers all the practical patterns.

---

## Basic Build from a Git Repository

Pass a Git URL directly to `podman build`.

```bash
# Build from a public GitHub repository

podman build -t myapp:latest https://github.com/myorg/myapp.git

# Build from a GitLab repository
podman build -t myapp:latest https://gitlab.com/myorg/myapp.git
```

Podman clones the repository and looks for a Containerfile or Dockerfile at the root.

## Specifying a Branch

Append a fragment with the branch name after the URL.

```bash
# Build from the 'develop' branch
podman build -t myapp:dev https://github.com/myorg/myapp.git#develop

# Build from the 'release/v2' branch
podman build -t myapp:v2 https://github.com/myorg/myapp.git#release/v2

# Build from the main branch explicitly
podman build -t myapp:latest https://github.com/myorg/myapp.git#main
```

## Specifying a Tag or Commit

Target specific tags or commit SHAs.

```bash
# Build from a specific tag
podman build -t myapp:v1.0.0 https://github.com/myorg/myapp.git#v1.0.0

# Build from a specific commit SHA
podman build -t myapp:fix https://github.com/myorg/myapp.git#abc123def
```

## Specifying a Subdirectory

Target a specific subdirectory within the repository as the build context.

```bash
# Build from a subdirectory (branch:directory format)
podman build -t api:latest https://github.com/myorg/monorepo.git#main:services/api

# Build from a subdirectory on the default branch
podman build -t frontend:latest https://github.com/myorg/monorepo.git#:services/frontend
```

The format is `URL#branch:directory`. If you omit the branch, the default branch is used.

## Monorepo Builds

Build different services from a monorepo.

```bash
# Build each service from the monorepo
podman build -t api:latest \
  https://github.com/myorg/monorepo.git#main:services/api

podman build -t web:latest \
  https://github.com/myorg/monorepo.git#main:services/web

podman build -t worker:latest \
  https://github.com/myorg/monorepo.git#main:services/worker
```

## Using a Custom Containerfile

Specify a Containerfile within the cloned repository.

```bash
# Use a custom Containerfile path within the repo
podman build \
  -f docker/Containerfile.production \
  -t myapp:prod \
  https://github.com/myorg/myapp.git#main
```

## Building from Private Repositories

For private repositories, use authenticated URLs or SSH.

```bash
# Using GitLab HTTPS with an OAuth token
podman build -t myapp:latest \
  https://oauth2:${GITLAB_TOKEN}@gitlab.com/myorg/private-repo.git

# Using SSH (requires SSH key configured)
podman build -t myapp:latest \
  ssh://git@github.com/myorg/private-repo.git

# Using a personal access token in the URL
podman build -t myapp:latest \
  https://${GIT_USER}:${GIT_TOKEN}@github.com/myorg/private-repo.git#main
```

## Build with Arguments from Git

Combine Git repository builds with build arguments.

```bash
# Build with arguments
podman build \
  --build-arg NODE_ENV=production \
  --build-arg APP_VERSION=1.0.0 \
  -t myapp:v1.0.0 \
  https://github.com/myorg/myapp.git#v1.0.0
```

## CI/CD Pipeline with Git Builds

Use Git-based builds in automated pipelines.

```bash
#!/bin/bash
# ci-git-build.sh

set -e

REPO_URL="https://github.com/myorg/myapp.git"
BRANCH="${CI_COMMIT_BRANCH:-main}"
TAG="${CI_COMMIT_TAG:-$BRANCH}"
IMAGE="registry.example.com/myapp"

echo "Building from ${REPO_URL}#${BRANCH}"
podman build \
  --build-arg BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  -t "${IMAGE}:${TAG}" \
  "${REPO_URL}#${BRANCH}"

echo "Pushing ${IMAGE}:${TAG}"
podman push "${IMAGE}:${TAG}"
```

## Building Different Versions

Build and compare different versions from the same repository.

```bash
# Build the current release
podman build -t myapp:v1.0.0 https://github.com/myorg/myapp.git#v1.0.0

# Build the next release
podman build -t myapp:v2.0.0 https://github.com/myorg/myapp.git#v2.0.0

# Build from a feature branch
podman build -t myapp:feature https://github.com/myorg/myapp.git#feature/new-api

# Compare image sizes
podman images myapp
```

## Self-Hosted Git Servers

Build from Gitea, Gogs, or other self-hosted Git servers.

```bash
# Build from a Gitea server
podman build -t myapp:latest https://gitea.internal.example.com/myorg/myapp.git#main

# Build from a bare git repository
podman build -t myapp:latest https://git.internal.example.com/repos/myapp.git

# Build from a local git server
podman build -t myapp:latest http://localhost:3000/myorg/myapp.git#main
```

## Caching with Git Builds

Git-based builds clone the repository into a temporary location each time, so the checkout step still has to run for each build. To improve performance, consider caching strategies.

```bash
# Strategy 1: Use a remote cache repository
podman build \
  --layers \
  --cache-to registry.example.com/myapp/cache \
  --cache-from registry.example.com/myapp/cache \
  -t myapp:latest \
  https://github.com/myorg/myapp.git#main

# Strategy 2: Clone locally first for repeated builds
git clone --depth 1 https://github.com/myorg/myapp.git /tmp/myapp
podman build -t myapp:latest /tmp/myapp
```

## Troubleshooting

Common issues when building from Git repositories.

```bash
# Error: repository not found
# Check the URL is correct and accessible
git ls-remote https://github.com/myorg/myapp.git

# Error: Containerfile not found
# Check the repository structure
git clone --depth 1 https://github.com/myorg/myapp.git /tmp/check
ls /tmp/check/Containerfile /tmp/check/Dockerfile 2>/dev/null

# Slow builds due to large repository
# Use shallow clone by keeping repository history minimal
# or clone locally with --depth 1 first
```

## Summary

Building container images directly from Git repositories with Podman simplifies build workflows by eliminating the manual clone step. Use URL fragments to target specific branches, tags, commits, and subdirectories. This pattern works well for CI/CD pipelines, monorepo builds, and quick testing of different versions. For private repositories, use token-authenticated HTTPS or SSH URLs.
