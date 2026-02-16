# How to Set Up ACR Anonymous Pull Access for Public Container Image Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ACR, Azure Container Registry, Anonymous Pull, Public Images, Docker, Container Distribution, Azure

Description: Learn how to enable anonymous pull access on Azure Container Registry for distributing public container images without requiring authentication.

---

Not every container image needs to be private. If you publish open-source software, client SDKs, or public tools as container images, you want people to pull them without jumping through authentication hoops. Docker Hub handles this transparently for public images, but Azure Container Registry defaults to requiring authentication for all operations.

ACR anonymous pull enables unauthenticated read access to your registry. Anyone can pull images without logging in - just `docker pull myregistry.azurecr.io/myapp:latest` and it works. The registry remains private for push operations (you still need to authenticate to write), but reads are open. This guide covers enabling anonymous pull, controlling which repositories are accessible, and the security considerations.

## When to Use Anonymous Pull

Anonymous pull is the right choice when:

- You distribute open-source container images and want frictionless access
- You host public tools or utilities that customers or partners need to pull
- You run internal development environments where configuring pull secrets is unnecessarily complex
- You want a public container registry experience but need it on Azure infrastructure

It is not the right choice when:

- Your images contain proprietary code or sensitive data
- You need to track and audit who pulls which images
- You need rate limiting per user (anonymous access does not identify users)

## Prerequisites

- Azure Container Registry on the Standard or Premium SKU (anonymous pull is not available on Basic)
- Azure CLI 2.50 or later
- Some container images already pushed to the registry

## Step 1: Enable Anonymous Pull

Enabling anonymous pull is a single configuration change on the registry.

```bash
# Enable anonymous pull on the registry
az acr update \
  --name myPublicRegistry \
  --anonymous-pull-enabled true

# Verify the setting
az acr show \
  --name myPublicRegistry \
  --query "anonymousPullEnabled" -o tsv
# Expected: true
```

That is it. Any image in the registry can now be pulled without authentication.

## Step 2: Test Anonymous Pull

Verify that unauthenticated pulls work.

```bash
# First, make sure you are logged out of the registry
docker logout myPublicRegistry.azurecr.io

# Pull an image without authentication
docker pull myPublicRegistry.azurecr.io/myapp:latest
# This should succeed without any login prompt

# Verify that push still requires authentication
docker push myPublicRegistry.azurecr.io/myapp:test
# This should fail with an authentication error
```

You can also test with other container runtimes:

```bash
# Test with Podman
podman pull myPublicRegistry.azurecr.io/myapp:latest

# Test with crictl (on a Kubernetes node)
crictl pull myPublicRegistry.azurecr.io/myapp:latest
```

## Step 3: Use Anonymous Pull in Kubernetes

The biggest practical benefit of anonymous pull is eliminating the need for imagePullSecrets in Kubernetes deployments.

Without anonymous pull, you need to create a pull secret and reference it in every deployment:

```yaml
# Before: Required pull secret for every deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      imagePullSecrets:
      - name: acr-pull-secret
      containers:
      - name: my-app
        image: myPublicRegistry.azurecr.io/myapp:v1
```

With anonymous pull enabled, you can skip the imagePullSecrets entirely:

```yaml
# After: No pull secret needed with anonymous pull
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # No imagePullSecrets needed
      containers:
      - name: my-app
        image: myPublicRegistry.azurecr.io/myapp:v1
        ports:
        - containerPort: 8080
```

This is especially useful in multi-cluster environments where managing pull secrets across dozens of clusters and namespaces is a maintenance burden.

## Step 4: Structure Your Registry for Public and Private Images

If you want some images to be public and others private, use two separate registries rather than trying to control access at the repository level. ACR anonymous pull is an all-or-nothing setting at the registry level.

```bash
# Create a public registry for open-source images
az acr create \
  --resource-group myResourceGroup \
  --name myPublicRegistry \
  --sku Standard \
  --anonymous-pull-enabled true

# Create a private registry for proprietary images
az acr create \
  --resource-group myResourceGroup \
  --name myPrivateRegistry \
  --sku Premium \
  --anonymous-pull-enabled false
```

Organize your CI/CD pipeline to push to the right registry:

```yaml
# GitHub Actions workflow that pushes to both registries
# .github/workflows/build.yaml
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Azure Login
      uses: azure/login@v1
      with:
        creds: ${{ secrets.AZURE_CREDENTIALS }}

    - name: Build and push public image
      run: |
        # Push the CLI tool to the public registry
        az acr build \
          --registry myPublicRegistry \
          --image cli-tool:${{ github.sha }} \
          --file Dockerfile.cli \
          .

    - name: Build and push private image
      run: |
        # Push the backend service to the private registry
        az acr build \
          --registry myPrivateRegistry \
          --image backend-api:${{ github.sha }} \
          --file Dockerfile.api \
          .
```

## Step 5: Configure Geo-Replication for Global Distribution

If your public images are pulled globally, enable geo-replication to reduce latency.

```bash
# Enable geo-replication on the public registry
# (Requires Premium SKU)
az acr replication create \
  --registry myPublicRegistry \
  --location westeurope

az acr replication create \
  --registry myPublicRegistry \
  --location southeastasia

# Check replication status
az acr replication list --registry myPublicRegistry -o table
```

With geo-replication, users pulling images from Europe or Asia will be served from the nearest replica, reducing pull times significantly.

## Step 6: Monitor Anonymous Pull Activity

Even though pulls are anonymous, you can still monitor pull activity through diagnostic logs.

```bash
# Enable diagnostic logging
az monitor diagnostic-settings create \
  --resource $(az acr show --name myPublicRegistry --query id -o tsv) \
  --name acr-public-logs \
  --workspace <log-analytics-workspace-id> \
  --logs '[
    {"category": "ContainerRegistryRepositoryEvents", "enabled": true},
    {"category": "ContainerRegistryLoginEvents", "enabled": true}
  ]'
```

Query pull statistics:

```
// KQL query: Pull activity by repository over the last 7 days
ContainerRegistryRepositoryEvents
| where OperationName == "Pull"
| where TimeGenerated > ago(7d)
| summarize PullCount = count() by Repository, bin(TimeGenerated, 1d)
| order by PullCount desc
```

```
// KQL query: Unique source IPs pulling images
ContainerRegistryRepositoryEvents
| where OperationName == "Pull"
| where TimeGenerated > ago(24h)
| summarize PullCount = count() by CallerIPAddress
| order by PullCount desc
| take 20
```

## Step 7: Set Up Rate Limiting and Abuse Protection

Anonymous access means anyone can pull from your registry. While ACR does not have built-in per-IP rate limiting for anonymous pulls, the registry has overall throughput limits based on the SKU tier:

| SKU | Reads per minute | Bandwidth |
|-----|-------------------|-----------|
| Standard | 1,000 | 60 MBps |
| Premium | 10,000 | 100 MBps |

If you expect high pull volumes, use Premium SKU with geo-replication.

For additional protection, consider putting Azure Front Door or a CDN in front of your registry (though this requires some custom configuration).

## Step 8: Publish Documentation for Consumers

When making images publicly available, provide clear documentation so users know how to pull them.

Create a public-facing page or README:

```markdown
## Public Container Images

Our container images are available from Azure Container Registry.
No authentication is required to pull these images.

### Available Images

| Image | Description | Latest Tag |
|-------|-------------|------------|
| myPublicRegistry.azurecr.io/cli-tool | Command-line utility | v2.1.0 |
| myPublicRegistry.azurecr.io/sdk-runtime | SDK runtime environment | v3.0.0 |

### Pull an Image

docker pull myPublicRegistry.azurecr.io/cli-tool:v2.1.0

### List Available Tags

curl https://myPublicRegistry.azurecr.io/v2/cli-tool/tags/list
```

The OCI distribution API endpoints are also accessible without authentication when anonymous pull is enabled:

```bash
# List repositories (no auth needed)
curl https://myPublicRegistry.azurecr.io/v2/_catalog

# List tags for a repository (no auth needed)
curl https://myPublicRegistry.azurecr.io/v2/cli-tool/tags/list

# Get manifest for a specific tag (no auth needed)
curl -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
  https://myPublicRegistry.azurecr.io/v2/cli-tool/manifests/v2.1.0
```

## Security Considerations

**Write access remains protected.** Anonymous pull only affects read operations. Push, delete, and management operations still require authentication.

**Network rules still apply.** If you have firewall rules or private link configured on the registry, anonymous pull only works for IPs or networks that are allowed through those rules.

**Image content is public.** Anything in the registry can be pulled by anyone with network access. Do not accidentally push images containing secrets, credentials, or proprietary code to a registry with anonymous pull enabled.

**No per-user audit trail.** Since pulls are anonymous, you cannot track which specific user or organization pulled an image. You can only see source IP addresses in the diagnostic logs.

**Consider signing images.** When distributing public images, sign them with Notary or Cosign so consumers can verify authenticity.

```bash
# Sign an image with Cosign
cosign sign --key cosign.key myPublicRegistry.azurecr.io/cli-tool:v2.1.0

# Consumers can verify the signature
cosign verify --key cosign.pub myPublicRegistry.azurecr.io/cli-tool:v2.1.0
```

## Disabling Anonymous Pull

If you need to disable anonymous pull later (maybe you are retiring the public images or changing distribution strategy):

```bash
# Disable anonymous pull
az acr update \
  --name myPublicRegistry \
  --anonymous-pull-enabled false

# Verify it is disabled
az acr show \
  --name myPublicRegistry \
  --query "anonymousPullEnabled" -o tsv
# Expected: false
```

After disabling, all pull operations will require authentication again. Make sure to notify consumers and update documentation before making this change.

ACR anonymous pull is the simplest way to distribute public container images on Azure infrastructure. Enable it on a dedicated registry for your public images, keep your private images in a separate registry, and you get the best of both worlds - easy public distribution and strong access control for proprietary content.
