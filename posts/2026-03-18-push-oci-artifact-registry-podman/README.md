# How to Push an OCI Artifact to a Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Registry, Push

Description: Learn how to push OCI artifacts from your local Podman artifact store to remote OCI-compliant registries.

---

> Pushing OCI artifacts to a registry lets your team share configuration, policies, and binaries through the same infrastructure used for container images.

After adding OCI artifacts to your local Podman artifact store, the next step is pushing them to a remote registry so they can be consumed by other team members, CI/CD pipelines, or production environments. Podman makes this process straightforward with the `podman artifact push` command. This post walks through pushing artifacts to various registries.

---

## Prerequisites

You need Podman 5.4 or later and access to an OCI-compliant registry.

```bash
# Verify Podman version

podman --version

# Check the push subcommand
podman artifact push --help
```

## Preparing an Artifact for Push

First, add an artifact to your local store if you have not already.

```bash
# Create a configuration file
cat > app-config.yaml <<EOF
database:
  host: db.production.internal
  port: 5432
  pool_size: 20
cache:
  host: redis.production.internal
  ttl: 3600
EOF

# Add to local store with the target registry reference
podman artifact add registry.example.com/myorg/app-config:v1.0 app-config.yaml
```

Note that the artifact reference includes the target registry hostname. This tells Podman where to push it.

## Pushing to a Registry

Authenticate with the registry, then push.

```bash
# Log in to the target registry
podman login registry.example.com

# Push the artifact
podman artifact push registry.example.com/myorg/app-config:v1.0
```

The artifact is now available in the remote registry for others to pull.

## Pushing to Docker Hub

Docker Hub supports OCI artifacts. Use the `docker.io` prefix.

```bash
# Log in to Docker Hub
podman login docker.io

# Add artifact with Docker Hub reference
podman artifact add docker.io/myusername/app-config:v1.0 app-config.yaml

# Push to Docker Hub
podman artifact push docker.io/myusername/app-config:v1.0
```

## Pushing to GitHub Container Registry

GitHub Container Registry is another popular choice.

```bash
# Authenticate with GHCR using a personal access token
echo "$GITHUB_TOKEN" | podman login ghcr.io -u "$GITHUB_USER" --password-stdin

# Add artifact with GHCR reference
podman artifact add ghcr.io/myorg/app-config:v1.0 app-config.yaml

# Push the artifact
podman artifact push ghcr.io/myorg/app-config:v1.0
```

## Pushing to a Local Registry

For development and testing, you can run a local OCI registry and push artifacts to it.

```bash
# Start a local OCI registry
podman run -d -p 5000:5000 --name local-registry docker.io/library/registry:2

# Add artifact referencing the local registry
podman artifact add localhost:5000/myorg/app-config:dev app-config.yaml

# Push to the local registry (no TLS in local dev)
podman artifact push --tls-verify=false localhost:5000/myorg/app-config:dev
```

## Pushing Multiple Artifacts

When you have several artifacts to push, script the process.

```bash
#!/bin/bash
# Push all artifacts for a release

REGISTRY="registry.example.com"
VERSION="v2.0"

# List of artifacts to push
ARTIFACTS=(
    "myorg/app-config:${VERSION}"
    "myorg/nginx-config:${VERSION}"
    "myorg/security-policy:${VERSION}"
)

# Log in once
podman login "$REGISTRY"

# Push each artifact
for artifact in "${ARTIFACTS[@]}"; do
    echo "Pushing ${REGISTRY}/${artifact}..."
    if podman artifact push "${REGISTRY}/${artifact}"; then
        echo "Successfully pushed ${artifact}"
    else
        echo "ERROR: Failed to push ${artifact}"
        exit 1
    fi
done

echo "All artifacts pushed successfully"
```

## Verifying the Push

After pushing, verify the artifact is available in the remote registry.

```bash
# Remove the local copy
podman artifact rm registry.example.com/myorg/app-config:v1.0

# Pull it back from the registry to confirm
podman artifact pull registry.example.com/myorg/app-config:v1.0

# Inspect the pulled artifact
podman artifact inspect registry.example.com/myorg/app-config:v1.0 | python3 -m json.tool
```

## Handling Push Errors

Common push issues and their solutions.

```bash
# Error: authentication required
# Solution: log in first
podman login registry.example.com

# Error: denied (insufficient permissions)
# Solution: verify your account has push access to the repository

# Error: TLS certificate error (development registries)
# Solution: use --tls-verify=false for local dev registries only
podman artifact push --tls-verify=false localhost:5000/myorg/config:dev

# Error: artifact not found locally
# Solution: verify the artifact exists in your local store
podman artifact ls | grep app-config
```

## Summary

Pushing OCI artifacts with Podman uses the `podman artifact push` command after the artifact has been added to your local store with a registry reference. You can push to any OCI-compliant registry including Docker Hub, GitHub Container Registry, and private registries. Always authenticate with `podman login` before pushing to registries that require credentials. Scripting multi-artifact pushes is straightforward and fits well into release automation workflows. After pushing, verify by pulling the artifact back from the registry.
