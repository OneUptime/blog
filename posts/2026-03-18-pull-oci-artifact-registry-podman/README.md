# How to Pull an OCI Artifact from a Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Registry, Pull

Description: Learn how to pull OCI artifacts from remote registries into your local Podman artifact store.

---

> Pulling OCI artifacts from registries lets you consume shared configuration, binaries, and policies using the same container tooling and infrastructure you already use.

OCI artifacts stored in remote registries can be pulled into your local Podman artifact store just like container images. This enables teams to distribute non-container content such as configuration files, security policies, and compiled binaries through existing registry infrastructure. In this post, we cover how to pull artifacts from both public and private registries.

---

## Prerequisites

Ensure you have Podman 5.x or later installed.

```bash
# Check Podman version

podman --version

# Verify artifact pull command is available
podman artifact pull --help
```

## Pulling from a Public Registry

If an artifact is stored in a public OCI registry, you can pull it directly by reference.

```bash
# Pull an artifact from a public registry
podman artifact pull registry.example.com/myorg/app-config:v1.0

# Verify it was downloaded
podman artifact ls
```

The artifact is now in your local store and can be inspected or extracted.

## Pulling from a Private Registry

Private registries require authentication. Log in first, then pull.

```bash
# Log in to a private registry
podman login registry.example.com
# Enter your username and password when prompted

# Pull the artifact after authentication
podman artifact pull registry.example.com/private/security-policy:latest

# Verify the pull succeeded
podman artifact ls | grep security-policy
```

## Pulling from Docker Hub

Docker Hub supports OCI artifacts. Use the `docker.io` prefix.

```bash
# Pull an artifact from Docker Hub
podman artifact pull docker.io/myorg/helm-chart:v2.0

# List to confirm
podman artifact ls
```

## Pulling from GitHub Container Registry

GitHub Container Registry (ghcr.io) also supports OCI artifacts.

```bash
# Authenticate with GitHub Container Registry
echo "$GITHUB_TOKEN" | podman login ghcr.io -u "$GITHUB_USER" --password-stdin

# Pull the artifact
podman artifact pull ghcr.io/myorg/app-config:v1.0

# Verify
podman artifact inspect ghcr.io/myorg/app-config:v1.0
```

## Pulling by Digest

For maximum reproducibility, pull an artifact by its content digest instead of a mutable tag.

```bash
# Pull by digest to ensure you get the exact version
podman artifact pull registry.example.com/myorg/app-config@sha256:abc123def456...

# The artifact is stored with the digest reference
podman artifact ls
```

Pulling by digest guarantees you always get the same content, regardless of tag changes.

## Pulling in Scripts

Automate artifact pulls in deployment or setup scripts.

```bash
#!/bin/bash
# Script to pull required artifacts for an application deployment

REGISTRY="registry.example.com"
ARTIFACTS=(
    "myorg/app-config:v1.0"
    "myorg/nginx-config:v2.1"
    "myorg/security-policy:latest"
)

# Pull each required artifact
for artifact in "${ARTIFACTS[@]}"; do
    echo "Pulling ${REGISTRY}/${artifact}..."
    if podman artifact pull "${REGISTRY}/${artifact}"; then
        echo "Successfully pulled ${artifact}"
    else
        echo "ERROR: Failed to pull ${artifact}"
        exit 1
    fi
done

echo "All artifacts pulled successfully"
podman artifact ls
```

## Handling Pull Errors

Common issues when pulling artifacts and how to resolve them.

```bash
# Error: artifact not found
# Check that the reference and tag are correct
podman artifact pull registry.example.com/myorg/app-config:v999
# Ensure the artifact exists in the remote registry

# Error: authentication required
# Log in to the registry first
podman login registry.example.com

# Error: TLS verification failed (for self-signed certs in dev)
# Use --tls-verify=false only in development environments
podman artifact pull --tls-verify=false internal-registry.dev:5000/myorg/config:latest
```

## Pulling and Inspecting

A common workflow is to pull an artifact and immediately inspect its contents.

```bash
# Pull and inspect in one workflow
podman artifact pull registry.example.com/myorg/app-config:v1.0

# View the metadata
podman artifact inspect registry.example.com/myorg/app-config:v1.0 | python3 -m json.tool

# Check the layers and their filenames
podman artifact inspect registry.example.com/myorg/app-config:v1.0 | \
    jq -r '.Manifest.layers[].annotations["org.opencontainers.image.title"]'
```

## Pulling Artifacts in CI/CD

In a CI/CD pipeline, pulling artifacts lets you consume shared configuration or binaries.

```bash
#!/bin/bash
# CI/CD step: pull deployment configuration artifact

ARTIFACT="registry.example.com/myorg/deploy-config:${DEPLOY_VERSION}"

echo "Pulling deployment configuration..."
podman artifact pull "$ARTIFACT"

# Inspect the configuration metadata for use in the pipeline
echo "Configuration artifact pulled successfully"
podman artifact inspect "$ARTIFACT" | jq '.Manifest.layers[] | .annotations'
```

## Summary

Pulling OCI artifacts with Podman works similarly to pulling container images. Use `podman artifact pull` with a full registry reference to download artifacts from public registries, private registries (after `podman login`), Docker Hub, or GitHub Container Registry. You can pull by tag for convenience or by digest for reproducibility. The pulled artifacts land in your local store where they can be inspected, used in scripts, or extracted for deployment. This makes Podman a unified tool for managing both container images and arbitrary OCI content.
