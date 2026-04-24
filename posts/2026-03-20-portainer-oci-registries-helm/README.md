# How to Set Up OCI-Format Registries in Portainer for Helm Charts (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Helm, OCI, Registry, DevOps

Description: Learn how to configure OCI-format registries in Portainer to host and deploy Helm charts stored in container registries.

## Introduction

Helm 3 introduced support for OCI (Open Container Initiative) format, allowing Helm charts to be stored in container registries alongside Docker images. This enables a unified registry strategy where both container images and Helm charts are managed in the same system. Portainer supports OCI Helm chart repositories for Kubernetes deployments. This guide covers the setup and usage.

## Prerequisites

- Portainer BE with Kubernetes environment
- An OCI-compatible registry supported by Portainer for OCI Helm charts (ECR, ACR, GHCR, Harbor, or a custom registry)
- Helm 3.8+ installed locally
- `kubectl` access to your cluster

## Understanding OCI Helm Charts

Traditional Helm charts are stored in HTTP chart repositories (index.yaml + .tgz files). OCI format stores charts as registry artifacts:

```text
# Traditional Helm repository

https://charts.example.com/index.yaml

# OCI Helm repository
oci://registry.example.com/helm-charts/
```

OCI-format charts are stored as registry artifacts with OCI manifests and layers.

## Step 1: Push a Helm Chart to an OCI Registry

```bash
# Enable OCI support in Helm (not needed for Helm 3.8+)
export HELM_EXPERIMENTAL_OCI=1

# Create a simple test chart
helm create mychart

# Package the chart
helm package mychart
# Creates: mychart-0.1.0.tgz

# Login to your registry
helm registry login registry.example.com \
  --username myuser \
  --password mypassword

# Push to OCI registry
helm push mychart-0.1.0.tgz oci://registry.example.com/helm-charts

# Verify
helm show chart oci://registry.example.com/helm-charts/mychart --version 0.1.0
```

### Push to GitHub GHCR

```bash
# Login to GHCR
echo $GITHUB_TOKEN | helm registry login ghcr.io --username myuser --password-stdin

# Push
helm push mychart-0.1.0.tgz oci://ghcr.io/myorg/helm-charts
```

### Push to AWS ECR

```bash
# Login to ECR for Helm
aws ecr get-login-password --region us-east-1 | \
  helm registry login --username AWS --password-stdin \
  123456.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository for Helm charts
aws ecr create-repository --repository-name helm-charts/mychart --region us-east-1

# Push
helm push mychart-0.1.0.tgz \
  oci://123456.dkr.ecr.us-east-1.amazonaws.com/helm-charts
```

## Step 2: Add an OCI Registry in Portainer

For Kubernetes Helm deployments in Portainer:

1. From the Portainer menu, go to **Registries**
2. Click **Add registry**
3. Select a supported registry provider or **Custom registry**
4. Configure:

```text
Registry name:   My OCI Registry
Registry URL:    registry.example.com

Authentication:
  Enabled:       Yes
  Username:      myuser
  Password:      mypassword
```

5. In the Kubernetes environment, go to **Cluster → Registries**
6. Select **Manage access** for the registry and grant the target namespace access

## Step 3: Configure Helm with OCI in Portainer Kubernetes

In Portainer, when deploying a Helm chart from an OCI registry:

1. Go to **Applications** in a Kubernetes environment
2. Click **Create from code** and select **Helm chart**
3. Choose **Helm repository** as the deployment method
4. Select the namespace and release name
5. Choose the configured registry from the Helm chart source dropdown
6. Select the chart and version, configure values, and install

## Step 4: Direct Helm Install from OCI (CLI)

```bash
# Install directly from OCI registry
helm install myrelease \
  oci://registry.example.com/helm-charts/mychart \
  --version 0.1.0 \
  --namespace production \
  --create-namespace \
  --values custom-values.yaml

# Upgrade
helm upgrade myrelease \
  oci://registry.example.com/helm-charts/mychart \
  --version 0.2.0
```

## Step 5: Use OCI Charts in Portainer Manifest YAML

For Kubernetes applications deployed via YAML in Portainer:

```yaml
# helmrelease.yaml (if using Flux HelmRelease)
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-oci-registry
  namespace: flux-system
spec:
  type: oci
  interval: 5m0s
  url: oci://registry.example.com/helm-charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mychart
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: mychart
      version: "0.1.0"
      sourceRef:
        kind: HelmRepository
        name: my-oci-registry
        namespace: flux-system
      interval: 5m
```

## Step 6: Store Helm Charts in Harbor OCI Registry

Harbor is an excellent option for hosting OCI charts alongside other OCI artifacts:

```bash
# Create a registry endpoint in Harbor for Helm charts
# Harbor projects can store both Docker images and OCI artifacts

# Login to Harbor
helm registry login harbor.company.com \
  --username admin \
  --password mypassword

# Push chart to Harbor
helm push mychart-0.1.0.tgz oci://harbor.company.com/helm-charts

# View in Harbor: Projects → helm-charts (OCI Helm charts appear as artifacts)
```

## Step 7: Automating Chart Publishing in CI/CD

```yaml
# .github/workflows/publish-chart.yml
name: Publish Helm Chart

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v4

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            helm registry login ghcr.io \
            --username ${{ github.actor }} \
            --password-stdin

      - name: Package and push chart
        run: |
          helm package ./charts/mychart
          helm push mychart-*.tgz oci://ghcr.io/${{ github.repository_owner }}/helm-charts
```

## Step 8: Pull and Inspect OCI Charts

```bash
# Pull chart to local filesystem
helm pull oci://registry.example.com/helm-charts/mychart --version 0.1.0

# Show chart details
helm show chart oci://registry.example.com/helm-charts/mychart

# Show default values
helm show values oci://registry.example.com/helm-charts/mychart

# Template rendering (preview without deploying)
helm template myrelease \
  oci://registry.example.com/helm-charts/mychart \
  --values my-values.yaml
```

## Conclusion

OCI-format Helm charts unify your container and chart distribution into a single registry. This simplifies registry management and access control, and works well with OCI-capable registries that Portainer supports for Helm deployments. Portainer's Helm support enables deploying OCI charts directly through the UI, making Kubernetes application management more accessible without requiring direct Helm CLI access.
