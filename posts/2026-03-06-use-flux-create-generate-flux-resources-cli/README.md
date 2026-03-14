# How to Use flux create to Generate Flux Resources from CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, CLI, Create, Resources, Automation

Description: Learn how to use the flux create command to generate Flux CD resource definitions directly from the command line without writing YAML by hand.

---

## Introduction

Writing Kubernetes YAML manifests by hand is tedious and error-prone. The `flux create` command lets you generate Flux CD resource definitions from the command line with proper defaults and validation. You can apply them directly to the cluster or export them as YAML files for storage in Git.

This guide covers all the major resource types you can create with the Flux CLI.

## Prerequisites

- Flux CLI installed (v2.2.0 or later)
- A running Kubernetes cluster with Flux installed
- kubectl configured with cluster access

## The --export Flag

Every `flux create` command supports the `--export` flag. When used, the resource is not applied to the cluster but instead printed as YAML to stdout. This is essential for GitOps workflows where you want to commit resources to a repository.

```bash
# Apply directly to the cluster
flux create source git my-repo --url=https://github.com/myorg/my-app --branch=main

# Export as YAML instead of applying
flux create source git my-repo --url=https://github.com/myorg/my-app --branch=main --export
```

## Creating Git Sources

Git repositories are the most common source type in Flux:

```bash
# Create a public GitRepository source
flux create source git my-app \
  --url=https://github.com/myorg/my-app \
  --branch=main \
  --interval=1m \
  --export > my-app-source.yaml
```

Output:

```yaml
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  url: https://github.com/myorg/my-app
```

### Private Repository with SSH Key

```bash
# Create a GitRepository source with SSH authentication
flux create source git my-private-app \
  --url=ssh://git@github.com/myorg/my-private-app \
  --branch=main \
  --interval=5m \
  --secret-ref=my-ssh-key \
  --export > my-private-app-source.yaml
```

### Private Repository with Token

```bash
# Create a GitRepository source with basic auth
flux create source git my-private-app \
  --url=https://github.com/myorg/my-private-app \
  --branch=main \
  --interval=5m \
  --secret-ref=my-git-token \
  --export > my-private-app-source.yaml

# Create the corresponding secret
flux create secret git my-git-token \
  --url=https://github.com/myorg/my-private-app \
  --username=git \
  --password="${GITHUB_TOKEN}" \
  --export > my-git-token-secret.yaml
```

### Tag and SemVer References

```bash
# Create a source tracking a specific tag
flux create source git my-app \
  --url=https://github.com/myorg/my-app \
  --tag=v1.0.0 \
  --interval=10m \
  --export

# Create a source tracking a semver range
flux create source git my-app \
  --url=https://github.com/myorg/my-app \
  --tag-semver=">=1.0.0 <2.0.0" \
  --interval=10m \
  --export
```

## Creating Helm Sources

### HelmRepository

```bash
# Create a HelmRepository source
flux create source helm bitnami \
  --url=https://charts.bitnami.com/bitnami \
  --interval=1h \
  --export > bitnami-repo.yaml

# Create an OCI-based HelmRepository
flux create source helm podinfo \
  --url=oci://ghcr.io/stefanprodan/charts \
  --interval=10m \
  --export > podinfo-oci-repo.yaml
```

### HelmRelease

```bash
# Create a HelmRelease for deploying a chart
flux create helmrelease nginx \
  --source=HelmRepository/bitnami \
  --chart=nginx \
  --chart-version=">=15.0.0" \
  --target-namespace=web \
  --interval=10m \
  --export > nginx-release.yaml
```

### HelmRelease with Custom Values

```bash
# Create a HelmRelease with inline values
flux create helmrelease redis \
  --source=HelmRepository/bitnami \
  --chart=redis \
  --chart-version="18.x" \
  --target-namespace=cache \
  --values=./redis-values.yaml \
  --export > redis-release.yaml
```

Where `redis-values.yaml` contains your custom Helm values:

```yaml
# redis-values.yaml
architecture: standalone
auth:
  enabled: true
master:
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 250m
      memory: 256Mi
```

## Creating Kustomizations

Kustomizations tell Flux how to apply manifests from a source:

```bash
# Create a basic Kustomization
flux create kustomization my-app \
  --source=GitRepository/my-app \
  --path=./deploy/production \
  --prune=true \
  --interval=10m \
  --export > my-app-kustomization.yaml
```

### With Health Checks

```bash
# Create a Kustomization with health checks and timeout
flux create kustomization my-app \
  --source=GitRepository/my-app \
  --path=./deploy/production \
  --prune=true \
  --interval=10m \
  --health-check="Deployment/my-app.default" \
  --health-check-timeout=3m \
  --export > my-app-kustomization.yaml
```

### With Dependencies

```bash
# Create infrastructure Kustomization
flux create kustomization infrastructure \
  --source=GitRepository/flux-system \
  --path=./infrastructure \
  --prune=true \
  --interval=1h \
  --export > infrastructure-kustomization.yaml

# Create app Kustomization that depends on infrastructure
flux create kustomization my-app \
  --source=GitRepository/flux-system \
  --path=./apps/my-app \
  --prune=true \
  --interval=10m \
  --depends-on=infrastructure \
  --export > my-app-kustomization.yaml
```

### With Service Account for Multi-Tenancy

```bash
# Create a Kustomization that uses a specific service account
flux create kustomization team-alpha-app \
  --source=GitRepository/team-alpha \
  --path=./deploy \
  --prune=true \
  --interval=5m \
  --service-account=team-alpha-sa \
  --target-namespace=team-alpha \
  --export > team-alpha-kustomization.yaml
```

## Creating OCI Sources

```bash
# Create an OCIRepository source
flux create source oci my-oci-app \
  --url=oci://ghcr.io/myorg/my-app-manifests \
  --tag=latest \
  --interval=5m \
  --export > my-oci-source.yaml

# Create an OCIRepository with semver
flux create source oci my-oci-app \
  --url=oci://ghcr.io/myorg/my-app-manifests \
  --tag-semver=">=1.0.0" \
  --interval=5m \
  --export > my-oci-source.yaml
```

## Creating Bucket Sources

For S3-compatible storage backends:

```bash
# Create a Bucket source for AWS S3
flux create source bucket my-bucket \
  --bucket-name=my-flux-manifests \
  --endpoint=s3.amazonaws.com \
  --region=us-east-1 \
  --provider=aws \
  --interval=5m \
  --export > my-bucket-source.yaml

# Create a Bucket source for MinIO
flux create source bucket minio-manifests \
  --bucket-name=flux-resources \
  --endpoint=minio.example.com:9000 \
  --insecure=true \
  --secret-ref=minio-credentials \
  --interval=5m \
  --export > minio-source.yaml
```

## Creating Alert and Notification Resources

### Notification Providers

```bash
# Create a Slack notification provider
flux create alert-provider slack \
  --type=slack \
  --channel=flux-notifications \
  --secret-ref=slack-webhook-url \
  --export > slack-provider.yaml

# Create a Microsoft Teams provider
flux create alert-provider teams \
  --type=msteams \
  --secret-ref=teams-webhook-url \
  --export > teams-provider.yaml

# Create a GitHub provider for commit status updates
flux create alert-provider github \
  --type=github \
  --address=https://github.com/myorg/my-app \
  --secret-ref=github-token \
  --export > github-provider.yaml
```

### Alerts

```bash
# Create an alert for Kustomization events
flux create alert my-app-alert \
  --provider-ref=slack \
  --event-source="Kustomization/*" \
  --event-source="GitRepository/*" \
  --event-severity=error \
  --export > my-app-alert.yaml

# Create an alert for all info and error events
flux create alert all-events \
  --provider-ref=slack \
  --event-source="Kustomization/*" \
  --event-source="HelmRelease/*" \
  --event-source="GitRepository/*" \
  --event-severity=info \
  --export > all-events-alert.yaml
```

## Creating Image Automation Resources

```bash
# Create an ImageRepository to scan for new tags
flux create image repository my-app \
  --image=ghcr.io/myorg/my-app \
  --interval=5m \
  --export > my-app-image-repo.yaml

# Create an ImagePolicy to select the latest semver tag
flux create image policy my-app \
  --image-ref=my-app \
  --select-semver=">=1.0.0" \
  --export > my-app-image-policy.yaml

# Create an ImageUpdateAutomation
flux create image update my-app-auto \
  --git-repo-ref=my-app \
  --git-repo-path=./deploy \
  --checkout-branch=main \
  --push-branch=main \
  --author-name=fluxcdbot \
  --author-email=flux@myorg.com \
  --commit-template="chore: update images" \
  --export > my-app-image-update.yaml
```

## Generating a Complete Application Stack

Here is a script that generates all resources for a typical application:

```bash
#!/bin/bash
# generate-app-stack.sh
# Generate a complete set of Flux resources for an application

set -euo pipefail

APP_NAME="my-web-app"
GIT_URL="https://github.com/myorg/${APP_NAME}"
NAMESPACE="production"
OUTPUT_DIR="./clusters/production/${APP_NAME}"

mkdir -p "${OUTPUT_DIR}"

# Generate the Git source
flux create source git "${APP_NAME}" \
  --url="${GIT_URL}" \
  --branch=main \
  --interval=1m \
  --export > "${OUTPUT_DIR}/source.yaml"

# Generate the Kustomization
flux create kustomization "${APP_NAME}" \
  --source="GitRepository/${APP_NAME}" \
  --path=./deploy/production \
  --prune=true \
  --interval=10m \
  --target-namespace="${NAMESPACE}" \
  --export > "${OUTPUT_DIR}/kustomization.yaml"

# Generate the alert
flux create alert "${APP_NAME}-alert" \
  --provider-ref=slack \
  --event-source="Kustomization/${APP_NAME}" \
  --event-severity=error \
  --export > "${OUTPUT_DIR}/alert.yaml"

echo "Generated Flux resources in ${OUTPUT_DIR}:"
ls -la "${OUTPUT_DIR}"
```

## Best Practices

### Always Use --export for GitOps

Never apply resources directly in a GitOps workflow. Always export and commit:

```bash
# Generate, review, commit, and let Flux apply
flux create source git my-app \
  --url=https://github.com/myorg/my-app \
  --branch=main \
  --interval=1m \
  --export > clusters/production/my-app-source.yaml

# Review the generated YAML
cat clusters/production/my-app-source.yaml

# Commit to Git and let Flux reconcile
git add clusters/production/my-app-source.yaml
git commit -m "Add my-app GitRepository source"
git push
```

### Specify Namespaces Explicitly

```bash
# Always specify the namespace for clarity
flux create kustomization my-app \
  --namespace=flux-system \
  --source=GitRepository/my-app \
  --path=./deploy \
  --target-namespace=production \
  --prune=true \
  --interval=10m \
  --export
```

## Summary

The `flux create` command eliminates the need to write Flux resource YAML by hand. It provides validated, properly formatted resource definitions that can be applied directly or exported for GitOps workflows. By combining `flux create` with the `--export` flag, you can rapidly generate resource definitions, review them, and commit them to your Git repository for Flux to reconcile.
