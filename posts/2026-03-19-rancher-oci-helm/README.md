# How to Create OCI-Based Helm Chart Repositories for Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Helm, OCI

Description: Learn how to create and use OCI-based Helm chart repositories with Rancher, including pushing charts to OCI registries and configuring Rancher access.

OCI (Open Container Initiative) registries have become a standard way to store and distribute Helm charts alongside container images. Instead of maintaining a separate chart repository with an `index.yaml` file, you can push Helm charts directly to container registries like Docker Hub, GitHub Container Registry, AWS ECR, or Harbor. This guide shows you how to create OCI-based Helm chart repositories and use them with Rancher.

## Prerequisites

- A running Rancher instance (v2.9 or later)
- Helm CLI v3.8.0 or later (OCI support is GA since v3.8.0)
- Access to an OCI-compatible container registry
- A Helm chart to push

## Understanding OCI Helm Repositories

Traditional Helm repositories use an HTTP server with an `index.yaml` file listing all available charts. OCI-based repositories store charts as OCI artifacts in container registries, offering several advantages:

- **Unified infrastructure**: Store both container images and Helm charts in the same registry
- **No index.yaml management**: The registry handles storage and version tags without an `index.yaml`
- **Standard authentication**: Use the same credentials for images and charts
- **Content addressability**: Charts are referenced by digest for immutability

## Step 1: Prepare Your Helm Chart

Create or use an existing Helm chart:

```bash
# Create a new chart

helm create my-app

# Or use an existing chart directory
ls my-app/
# Chart.yaml  charts/  templates/  values.yaml
```

Ensure your `Chart.yaml` has the correct version:

```yaml
apiVersion: v2
name: my-app
description: My application Helm chart
version: 1.0.0
appVersion: "2.0.0"
type: application
```

## Step 2: Package the Chart

Package your chart into a `.tgz` archive:

```bash
helm package my-app/
```

This creates `my-app-1.0.0.tgz` in the current directory.

## Step 3: Log In to the OCI Registry

### Docker Hub

```bash
helm registry login registry-1.docker.io -u your-username
```

### GitHub Container Registry (GHCR)

```bash
echo $CR_PAT | helm registry login ghcr.io -u your-username --password-stdin
```

### AWS ECR

```bash
aws ecr get-login-password --region us-east-1 | \
  helm registry login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

### Harbor

```bash
helm registry login harbor.example.com -u admin
```

### Azure Container Registry (ACR)

```bash
helm registry login myregistry.azurecr.io -u your-username
```

## Step 4: Push the Chart to the OCI Registry

Push the packaged chart:

```bash
# Docker Hub
helm push my-app-1.0.0.tgz oci://registry-1.docker.io/your-username

# GitHub Container Registry
helm push my-app-1.0.0.tgz oci://ghcr.io/your-org

# AWS ECR
helm push my-app-1.0.0.tgz oci://123456789.dkr.ecr.us-east-1.amazonaws.com

# Harbor
helm push my-app-1.0.0.tgz oci://harbor.example.com/my-project

# Azure ACR
helm push my-app-1.0.0.tgz oci://myregistry.azurecr.io/helm
```

Some registries require the target repository or project to exist before you push. For example, create the ECR repository first and create the Harbor project in Harbor before pushing.

The chart will be available at `oci://<registry>/<path>/my-app:1.0.0`.

## Step 5: Verify the Push

```bash
# Show chart information from the registry
helm show chart oci://ghcr.io/your-org/my-app --version 1.0.0

# Show all chart details
helm show all oci://ghcr.io/your-org/my-app --version 1.0.0

# Pull the chart to verify
helm pull oci://ghcr.io/your-org/my-app --version 1.0.0
```

## Step 6: Configure Rancher to Use OCI Repositories

### Add an OCI Repository in Rancher

As of Rancher v2.9+, you can add OCI-based Helm repositories:

1. Navigate to **Apps > Repositories** in the Rancher dashboard
2. Click **Create**
3. Set the **Target** to **OCI**
4. Configure the repository:
   - **Name**: A unique identifier (e.g., `my-oci-charts`)
   - **OCI URL**: The registry URL (for example, `oci://ghcr.io/your-org/my-app` or a dedicated namespace that contains only Helm charts)
   - **Authentication**: Configure credentials if the registry is private

### Via YAML

```yaml
apiVersion: catalog.cattle.io/v1
kind: ClusterRepo
metadata:
  name: my-oci-charts
spec:
  url: oci://ghcr.io/your-org/my-app
  clientSecret:
    name: oci-registry-credentials
    namespace: cattle-system
---
apiVersion: v1
kind: Secret
metadata:
  name: oci-registry-credentials
  namespace: cattle-system
type: kubernetes.io/basic-auth
stringData:
  username: your-username
  password: your-token
```

### Install from OCI via Helm CLI

You can also install directly from OCI with the Helm CLI:

```bash
# Install directly from OCI
helm install my-app oci://ghcr.io/your-org/my-app \
  --version 1.0.0 \
  --namespace default \
  -f values.yaml

# Upgrade from OCI
helm upgrade my-app oci://ghcr.io/your-org/my-app \
  --version 1.1.0 \
  --namespace default \
  -f values.yaml
```

## Step 7: Set Up a CI/CD Pipeline for Chart Publishing

Automate chart publishing with a CI/CD pipeline.

### GitHub Actions Example

```yaml
name: Publish Helm Chart

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: v3.14.0

      - name: Log in to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            helm registry login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Package chart
        run: helm package ./charts/my-app

      - name: Push chart
        run: |
          helm push my-app-*.tgz oci://ghcr.io/${{ github.repository_owner }}
```

### GitLab CI Example

```yaml
publish-chart:
  stage: publish
  image: alpine/helm:3.14.0
  script:
    - helm registry login $CI_REGISTRY -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD
    - helm package ./charts/my-app
    - helm push my-app-*.tgz oci://$CI_REGISTRY_IMAGE
  only:
    - tags
```

## Managing Multiple Chart Versions

Push multiple versions to the same registry path:

```bash
# Update Chart.yaml version to 1.1.0
helm package my-app/
helm push my-app-1.1.0.tgz oci://ghcr.io/your-org

# Update to 1.2.0
helm package my-app/
helm push my-app-1.2.0.tgz oci://ghcr.io/your-org
```

List available tags (versions) using the registry API:

```bash
# For GHCR
curl -L \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $CR_PAT" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/orgs/your-org/packages/container/my-app/versions

# For Docker Hub
curl https://hub.docker.com/v2/namespaces/your-username/repositories/my-app/tags
```

## Cleaning Up Old Versions

Remove old chart versions from the registry:

```bash
# For GHCR, use the GitHub API or web UI to delete package versions

# For Harbor
# Use the Harbor web UI or API to delete artifacts

# For ECR
aws ecr batch-delete-image --repository-name my-app --image-ids imageTag=1.0.0
```

## Summary

OCI-based Helm chart repositories simplify chart distribution by using the same container registries you already use for images. Push charts with `helm push`, configure Rancher to access the OCI registry, and install charts directly from the registry URL. Automate chart publishing with CI/CD pipelines to ensure consistent, versioned releases. As OCI support continues to mature in both Helm and Rancher, this approach is becoming the standard for chart distribution.
