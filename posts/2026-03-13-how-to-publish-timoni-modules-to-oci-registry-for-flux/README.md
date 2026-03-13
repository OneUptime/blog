# How to Publish Timoni Modules to OCI Registry for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Timoni, OCI, Registry, Publishing

Description: Learn how to publish custom Timoni modules to OCI registries for distribution and consumption across Flux-managed clusters.

---

## Introduction

Once you have created a Timoni module, publishing it to an OCI registry makes it available for consumption across your organization. OCI registries provide versioned, immutable storage for modules, enabling teams to pull specific versions and ensuring reproducible deployments. Timoni leverages the same OCI distribution specification used by container images, meaning your modules can be stored alongside your application images in existing registries.

This guide covers publishing Timoni modules to various OCI registries, managing versions, setting up CI/CD publishing pipelines, and configuring access controls.

## Prerequisites

- Timoni CLI installed (v0.20 or later)
- A Timoni module ready for publishing
- Access to an OCI-compatible registry (GitHub Container Registry, Docker Hub, AWS ECR, etc.)
- Registry credentials with push permissions

## Step 1: Authenticate with the Registry

### GitHub Container Registry

```bash
echo $GITHUB_TOKEN | timoni registry login ghcr.io \
  --username your-github-username \
  --password-stdin
```

### Docker Hub

```bash
timoni registry login docker.io \
  --username your-dockerhub-username \
  --password your-dockerhub-token
```

### AWS ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  timoni registry login 123456789012.dkr.ecr.us-east-1.amazonaws.com \
  --username AWS \
  --password-stdin
```

### Azure Container Registry

```bash
az acr login --name myregistry
# Or manually:
timoni registry login myregistry.azurecr.io \
  --username your-sp-app-id \
  --password your-sp-password
```

## Step 2: Publish a Module

Push your module to the registry with a version tag:

```bash
timoni mod push ./my-flux-app \
  oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.0.0
```

The module is now available at `oci://ghcr.io/your-org/modules/my-flux-app:1.0.0`.

Push with additional metadata:

```bash
timoni mod push ./my-flux-app \
  oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.0.0 \
  --source "https://github.com/your-org/timoni-modules" \
  --annotation "org.opencontainers.image.description=Flux GitOps deployment module" \
  --annotation "org.opencontainers.image.authors=Platform Team"
```

## Step 3: Version Management

Follow semantic versioning for your modules:

```bash
# Major version: breaking changes
timoni mod push ./my-flux-app \
  oci://ghcr.io/your-org/modules/my-flux-app \
  --version 2.0.0

# Minor version: new features, backward compatible
timoni mod push ./my-flux-app \
  oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.1.0

# Patch version: bug fixes
timoni mod push ./my-flux-app \
  oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.0.1
```

Also push a `latest` tag for convenience:

```bash
timoni mod push ./my-flux-app \
  oci://ghcr.io/your-org/modules/my-flux-app \
  --version latest
```

## Step 4: List Published Versions

View available versions of a module:

```bash
timoni mod list oci://ghcr.io/your-org/modules/my-flux-app
```

Or use `oras` for more detailed registry inspection:

```bash
oras repo tags ghcr.io/your-org/modules/my-flux-app
```

## Step 5: Set Up CI/CD Publishing

### GitHub Actions

```yaml
# .github/workflows/publish-module.yaml
name: Publish Timoni Module
on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Install Timoni
        run: |
          curl -sSL https://github.com/stefanprodan/timoni/releases/latest/download/timoni_linux_amd64.tar.gz | tar xz
          sudo mv timoni /usr/local/bin/

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | timoni registry login ghcr.io \
            --username ${{ github.actor }} \
            --password-stdin

      - name: Validate Module
        run: |
          timoni build test ./modules/my-flux-app \
            --values ./modules/my-flux-app/test-values.yaml \
            --namespace test

      - name: Publish Module
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          timoni mod push ./modules/my-flux-app \
            oci://ghcr.io/${{ github.repository_owner }}/modules/my-flux-app \
            --version ${VERSION} \
            --source "${{ github.server_url }}/${{ github.repository }}"
```

### GitLab CI

```yaml
# .gitlab-ci.yml
publish-module:
  stage: publish
  image: alpine:latest
  rules:
    - if: $CI_COMMIT_TAG =~ /^v\d+\.\d+\.\d+$/
  before_script:
    - apk add --no-cache curl
    - curl -sSL https://github.com/stefanprodan/timoni/releases/latest/download/timoni_linux_amd64.tar.gz | tar xz
    - mv timoni /usr/local/bin/
  script:
    - timoni registry login $CI_REGISTRY --username $CI_REGISTRY_USER --password $CI_REGISTRY_PASSWORD
    - VERSION=${CI_COMMIT_TAG#v}
    - timoni mod push ./modules/my-flux-app
        oci://$CI_REGISTRY/$CI_PROJECT_PATH/modules/my-flux-app
        --version $VERSION
```

## Step 6: Configure Consumer Access

For private registries, consumers need pull credentials. Document how to set up access:

```bash
# Create pull credentials on the consuming cluster
kubectl create secret docker-registry module-registry-creds \
  -n flux-system \
  --docker-server=ghcr.io \
  --docker-username=flux-bot \
  --docker-password=token-with-read-packages-scope
```

Consumers can then pull and use the module:

```bash
timoni apply my-app oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.0.0 \
  --values values.yaml \
  --namespace flux-system
```

## Step 7: Module Documentation

Generate documentation for your published module:

```bash
timoni mod values oci://ghcr.io/your-org/modules/my-flux-app --version 1.0.0
```

Include a clear README in your module source that describes the available values, their types, defaults, and examples.

## Step 8: Verify Published Modules

After publishing, verify the module works correctly:

```bash
# Pull and inspect
timoni mod pull oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.0.0 \
  --output /tmp/my-flux-app

# Build with test values
timoni build test oci://ghcr.io/your-org/modules/my-flux-app \
  --version 1.0.0 \
  --values test-values.yaml \
  --namespace test
```

## Conclusion

Publishing Timoni modules to OCI registries creates a distribution mechanism that integrates naturally with the container ecosystem. Versioned modules provide reproducible deployments, CI/CD pipelines automate the publishing process, and OCI registries handle access control and distribution. By establishing a module publishing workflow, your organization can build a library of reusable Flux deployment patterns that teams consume through a familiar registry interface, ensuring consistency and reducing duplication across your Kubernetes infrastructure.
