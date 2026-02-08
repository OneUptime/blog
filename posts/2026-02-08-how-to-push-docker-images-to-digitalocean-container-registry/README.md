# How to Push Docker Images to DigitalOcean Container Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, DigitalOcean, Container Registry, DOCR, CI/CD, DevOps, Cloud

Description: Learn how to push Docker images to DigitalOcean Container Registry with doctl CLI authentication and CI/CD pipeline integration.

---

DigitalOcean Container Registry (DOCR) is a private Docker registry that integrates with DigitalOcean Kubernetes (DOKS) and App Platform. It is simpler to set up than most cloud registries and follows DigitalOcean's philosophy of being developer-friendly without excessive configuration. If you run workloads on DigitalOcean, DOCR is the path of least resistance for storing your container images.

## Prerequisites

Install the DigitalOcean CLI (doctl):

```bash
# macOS
brew install doctl

# Linux
snap install doctl

# Authenticate with your DigitalOcean account
doctl auth init
# This prompts for your API token from the DigitalOcean dashboard
```

## Creating a Container Registry

DigitalOcean allows one registry per account, but you can have multiple repositories within that registry:

```bash
# Create a container registry
doctl registry create my-registry --region nyc3

# Available regions: nyc3, sfo3, ams3, sgp1, fra1
# Choose the region closest to your infrastructure
```

You can also create the registry from the DigitalOcean web console under Container Registry in the left sidebar.

Verify the registry:

```bash
# Show registry details
doctl registry get

# The registry endpoint will be:
# registry.digitalocean.com/my-registry
```

## Authenticating Docker

Configure Docker to authenticate with DOCR:

```bash
# Configure Docker to use your DigitalOcean credentials
doctl registry login

# This runs docker login under the hood with your API token
# Credentials are stored in ~/.docker/config.json
```

For CI/CD environments where doctl is not available, use a Docker credential directly:

```bash
# Generate a read/write registry credential
doctl registry docker-config --read-write

# This outputs a Docker config JSON that you can use in CI
```

## Building and Pushing an Image

Tag your image with the DOCR registry path and push:

```bash
# Build with the DOCR tag
docker build -t registry.digitalocean.com/my-registry/myapp:v1.0.0 .

# Push to DOCR
docker push registry.digitalocean.com/my-registry/myapp:v1.0.0

# Tag and push as latest
docker tag registry.digitalocean.com/my-registry/myapp:v1.0.0 \
    registry.digitalocean.com/my-registry/myapp:latest
docker push registry.digitalocean.com/my-registry/myapp:latest
```

The naming pattern is:

```
registry.digitalocean.com/REGISTRY_NAME/IMAGE_NAME:TAG
```

## Verifying the Push

Check that your images are in the registry:

```bash
# List repositories in the registry
doctl registry repository list-v2

# List tags for a specific repository
doctl registry repository list-tags myapp

# Get detailed manifest info
doctl registry repository list-manifests myapp
```

## CI/CD with GitHub Actions

Automate builds and pushes to DOCR:

```yaml
# .github/workflows/build-push-docr.yml
name: Build and Push to DigitalOcean
on:
  push:
    branches: [main]

env:
  REGISTRY: registry.digitalocean.com/my-registry
  IMAGE: myapp

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # Install doctl
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}

      # Login to DOCR
      - name: Login to DOCR
        run: doctl registry login --expiry-seconds 600

      # Build and push
      - name: Build and Push
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE }}:${{ github.sha }} .
          docker tag ${{ env.REGISTRY }}/${{ env.IMAGE }}:${{ github.sha }} \
            ${{ env.REGISTRY }}/${{ env.IMAGE }}:latest
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE }}:${{ github.sha }}
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE }}:latest
```

### Alternative: Direct Docker Login

If you prefer not to install doctl in CI:

```yaml
# Use docker login directly with an API token
- name: Login to DOCR
  run: |
    echo ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }} | \
    docker login registry.digitalocean.com -u ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }} --password-stdin
```

## Connecting DOCR to DigitalOcean Kubernetes

Link your registry to your DOKS cluster so it can pull images:

```bash
# Add the registry to your Kubernetes cluster
doctl kubernetes cluster registry add my-k8s-cluster

# Verify the integration
doctl kubernetes cluster list
```

After integration, your Kubernetes pods can pull from DOCR without needing imagePullSecrets. The registry credentials are automatically configured on the cluster nodes.

Use the image in a Kubernetes deployment:

```yaml
# k8s/deployment.yaml - Reference the DOCR image
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: registry.digitalocean.com/my-registry/myapp:v1.0.0
          ports:
            - containerPort: 8080
```

## Using DOCR with App Platform

DigitalOcean App Platform can deploy directly from DOCR:

```yaml
# .do/app.yaml - App Platform spec using DOCR image
name: myapp
services:
  - name: web
    image:
      registry_type: DOCR
      registry: my-registry
      repository: myapp
      tag: latest
    http_port: 8080
    instance_count: 2
    instance_size_slug: basic-xxs
    routes:
      - path: /
```

Deploy with doctl:

```bash
# Create or update the app
doctl apps create --spec .do/app.yaml

# Or update an existing app
doctl apps update YOUR_APP_ID --spec .do/app.yaml
```

## Garbage Collection

DOCR charges based on storage. Clean up unused images to manage costs:

```bash
# Start garbage collection to reclaim space from deleted manifests
doctl registry garbage-collection start my-registry --include-untagged-manifests

# Check the status of garbage collection
doctl registry garbage-collection get-active my-registry

# Delete old tags manually
doctl registry repository delete-tag myapp v1.0.0
```

DOCR does not automatically clean up untagged manifests. Run garbage collection periodically to reclaim storage.

## Automating Cleanup

Add a cleanup step to your CI/CD pipeline:

```yaml
# Add to your GitHub Actions workflow after a successful push
- name: Clean up old images
  run: |
    # Keep only the 10 most recent tags
    TAGS=$(doctl registry repository list-tags myapp --format Tag --no-header | tail -n +11)
    for TAG in $TAGS; do
      echo "Deleting myapp:$TAG"
      doctl registry repository delete-tag myapp "$TAG" --force
    done
    # Run garbage collection to reclaim storage
    doctl registry garbage-collection start my-registry --include-untagged-manifests --force
```

## Storage Tiers and Pricing

DOCR offers subscription-based pricing:

- **Starter** (free): 500 MB storage, limited bandwidth
- **Basic**: 5 GB storage
- **Professional**: 100+ GB storage

Check your current usage:

```bash
# View registry subscription info
doctl registry options subscription-tiers
```

## Multi-Architecture Builds

Push images that work on both AMD64 and ARM64:

```bash
# Create a multi-platform builder
docker buildx create --name multiarch --use

# Build and push for multiple architectures
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag registry.digitalocean.com/my-registry/myapp:v1.0.0 \
    --push \
    .
```

DigitalOcean Container Registry keeps things simple. One command to create a registry, one command to login, and standard docker push to get your images there. The integration with DOKS and App Platform means your images are instantly available to your DigitalOcean infrastructure without extra configuration. For teams that value simplicity and already run on DigitalOcean, DOCR is an easy choice.
