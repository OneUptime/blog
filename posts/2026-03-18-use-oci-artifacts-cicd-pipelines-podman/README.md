# How to Use OCI Artifacts with CI/CD Pipelines and Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, CI/CD, Automation

Description: Learn how to integrate OCI artifacts into CI/CD pipelines using Podman for distributing configuration, binaries, and deployment assets.

---

> Integrating OCI artifacts into your CI/CD pipelines creates a unified supply chain where configuration, binaries, and container images all flow through the same registry infrastructure.

CI/CD pipelines benefit enormously from OCI artifacts. Instead of scattering build outputs, configuration files, and deployment assets across different storage systems, you can centralize everything in your OCI registry. Podman provides the artifact commands needed to add, push, and pull these assets as part of your pipeline stages. This post shows practical patterns for using OCI artifacts in CI/CD workflows.

---

## Prerequisites

Your CI/CD runner needs Podman 5.5 or later, `jq`, and registry credentials.

```bash
# Verify Podman on the CI runner

podman --version

# Log in to the registry (use CI/CD secrets for credentials)
echo "$REGISTRY_PASSWORD" | podman login registry.example.com \
    -u "$REGISTRY_USERNAME" --password-stdin
```

## Pipeline Pattern: Build and Publish Artifacts

A common pattern is to build artifacts in one stage and publish them for downstream stages.

```bash
#!/bin/bash
# CI stage: Build and publish application artifacts

VERSION="${CI_COMMIT_TAG:-${CI_COMMIT_SHA:0:8}}"
REGISTRY="registry.example.com"
PROJECT="myorg/myapp"

echo "=== Build Stage ==="

# Build the application binary
go build -o myapp ./cmd/server

# Run tests
go test ./...

# Package the binary with its configuration
tar -czf "myapp-${VERSION}.tar.gz" myapp config/

echo "=== Publish Stage ==="

# Add binary artifact
podman artifact add "${REGISTRY}/${PROJECT}-binary:${VERSION}" \
    "myapp-${VERSION}.tar.gz"

# Add configuration artifact separately
podman artifact add "${REGISTRY}/${PROJECT}-config:${VERSION}" \
    config/app.yaml config/logging.yaml

# Push both artifacts
podman artifact push "${REGISTRY}/${PROJECT}-binary:${VERSION}"
podman artifact push "${REGISTRY}/${PROJECT}-config:${VERSION}"

echo "Artifacts published for version ${VERSION}"
```

## Pipeline Pattern: Consume Artifacts in Deployment

A deployment stage pulls artifacts published by the build stage and extracts them for use.

```bash
#!/bin/bash
# CI stage: Deploy using published artifacts

VERSION="${DEPLOY_VERSION}"
REGISTRY="registry.example.com"
PROJECT="myorg/myapp"

echo "=== Deployment Stage ==="

# Pull the configuration artifact
echo "Pulling configuration..."
podman artifact pull "${REGISTRY}/${PROJECT}-config:${VERSION}"
mkdir -p deploy-config
podman artifact extract "${REGISTRY}/${PROJECT}-config:${VERSION}" ./deploy-config

# Pull the binary artifact
echo "Pulling binary..."
podman artifact pull "${REGISTRY}/${PROJECT}-binary:${VERSION}"
podman artifact extract "${REGISTRY}/${PROJECT}-binary:${VERSION}" \
    "./myapp-${VERSION}.tar.gz"

# Inspect the artifacts to verify contents
echo "Verifying artifacts..."
podman artifact inspect "${REGISTRY}/${PROJECT}-config:${VERSION}" | \
    jq -r '.Manifest.layers[].annotations["org.opencontainers.image.title"]'

echo "Deployment artifacts ready for version ${VERSION}"
```

## GitHub Actions Integration

Use Podman artifacts in a GitHub Actions workflow.

```yaml
# .github/workflows/release.yml
name: Release Pipeline

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Podman
        run: |
          sudo apt-get update
          sudo apt-get install -y podman

      - name: Login to Registry
        run: |
          echo "${{ secrets.REGISTRY_PASSWORD }}" | \
            podman login registry.example.com \
              -u "${{ secrets.REGISTRY_USERNAME }}" \
              --password-stdin

      - name: Build Application
        run: |
          # Build your application
          make build

      - name: Publish Artifacts
        run: |
          VERSION="${GITHUB_REF_NAME}"
          # Add and push binary artifact
          podman artifact add \
            registry.example.com/myorg/myapp-binary:${VERSION} \
            build/myapp
          podman artifact push \
            registry.example.com/myorg/myapp-binary:${VERSION}
          # Add and push config artifact
          podman artifact add \
            registry.example.com/myorg/myapp-config:${VERSION} \
            config/production.yaml
          podman artifact push \
            registry.example.com/myorg/myapp-config:${VERSION}
```

## GitLab CI Integration

Integrate Podman artifacts into a GitLab CI pipeline.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - publish
  - deploy

variables:
  REGISTRY: registry.example.com
  PROJECT: myorg/myapp

build:
  stage: build
  script:
    - make build
    - make test
  artifacts:
    paths:
      - build/

publish:
  stage: publish
  script:
    - echo "$REGISTRY_PASSWORD" | podman login "$REGISTRY" -u "$REGISTRY_USERNAME" --password-stdin
    - podman artifact add "${REGISTRY}/${PROJECT}-binary:${CI_COMMIT_TAG}" build/myapp
    - podman artifact push "${REGISTRY}/${PROJECT}-binary:${CI_COMMIT_TAG}"
    - podman artifact add "${REGISTRY}/${PROJECT}-config:${CI_COMMIT_TAG}" config/production.yaml
    - podman artifact push "${REGISTRY}/${PROJECT}-config:${CI_COMMIT_TAG}"
  only:
    - tags

deploy:
  stage: deploy
  script:
    - echo "$REGISTRY_PASSWORD" | podman login "$REGISTRY" -u "$REGISTRY_USERNAME" --password-stdin
    - podman artifact pull "${REGISTRY}/${PROJECT}-binary:${CI_COMMIT_TAG}"
    - podman artifact pull "${REGISTRY}/${PROJECT}-config:${CI_COMMIT_TAG}"
    - podman artifact extract "${REGISTRY}/${PROJECT}-binary:${CI_COMMIT_TAG}" ./myapp
    - mkdir -p deploy-config
    - podman artifact extract "${REGISTRY}/${PROJECT}-config:${CI_COMMIT_TAG}" ./deploy-config
    - echo "Deploying version ${CI_COMMIT_TAG}"
  only:
    - tags
```

## Artifact Promotion Across Environments

Promote artifacts through environments by extracting a validated artifact locally and publishing it under a production tag.

```bash
#!/bin/bash
# Promote an artifact from staging to production

REGISTRY="registry.example.com"
PROJECT="myorg/myapp-config"
VERSION="v2.0"
WORKDIR=$(mktemp -d)

trap 'rm -rf "$WORKDIR"' EXIT

# Pull the staging-verified artifact
podman artifact pull "${REGISTRY}/${PROJECT}:staging-${VERSION}"
mkdir -p "$WORKDIR"
podman artifact extract "${REGISTRY}/${PROJECT}:staging-${VERSION}" "$WORKDIR"

# Re-publish for production
mapfile -t FILES < <(find "$WORKDIR" -maxdepth 1 -type f | sort)
podman artifact add "${REGISTRY}/${PROJECT}:prod-${VERSION}" "${FILES[@]}"

# Push the production-tagged artifact
podman artifact push "${REGISTRY}/${PROJECT}:prod-${VERSION}"

echo "Artifact promoted from staging to production: ${VERSION}"
```

## Artifact Validation in Pipelines

Add validation steps to ensure artifact integrity.

```bash
#!/bin/bash
# Validate artifacts before deployment

ARTIFACT="registry.example.com/myorg/myapp-config:v2.0"

# Pull the artifact
podman artifact pull "$ARTIFACT"

# Validate the artifact has expected layers
LAYER_COUNT=$(podman artifact inspect "$ARTIFACT" | jq '.Manifest.layers | length')
if [ "$LAYER_COUNT" -lt 1 ]; then
    echo "ERROR: Artifact has no layers"
    exit 1
fi

# Validate the media type
MEDIA_TYPE=$(podman artifact inspect "$ARTIFACT" | jq -r '.Manifest.mediaType')
if [ "$MEDIA_TYPE" != "application/vnd.oci.image.manifest.v1+json" ]; then
    echo "ERROR: Unexpected media type: $MEDIA_TYPE"
    exit 1
fi

echo "Artifact validation passed"
```

## Summary

OCI artifacts integrate naturally into CI/CD pipelines through Podman. Build stages produce and push artifacts, deployment stages pull and extract them, and promotion workflows re-publish validated artifacts across environments. This works with GitHub Actions, GitLab CI, and any CI/CD system that supports Podman. By centralizing binaries, configuration, and container images in a single OCI registry, you create a consistent and auditable software supply chain. Validation steps ensure artifact integrity before deployment.
