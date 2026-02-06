# How to Troubleshoot Collector Version Upgrade Breaking Changes (Docker Image Repo Moved from DockerHub to GHCR)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Docker, GHCR

Description: Fix broken Collector deployments after the OpenTelemetry Docker image repository moved from DockerHub to GitHub Container Registry.

You try to pull a new Collector version and get:

```
Error: pull access denied for otel/opentelemetry-collector-contrib,
repository does not exist or may require 'docker login'
```

Or your Kubernetes pods are stuck in `ImagePullBackOff`. The image reference that worked last month no longer works because the OpenTelemetry project moved its Docker images from DockerHub to GitHub Container Registry (GHCR).

## What Changed

The OpenTelemetry Collector Docker images were historically published to DockerHub under:
- `otel/opentelemetry-collector`
- `otel/opentelemetry-collector-contrib`

Starting with certain versions, the primary registry moved to GHCR:
- `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector`
- `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib`

Some versions may still be published to both registries, but relying on DockerHub will eventually break.

## Quick Fix: Update the Image Reference

### Kubernetes Deployment

```yaml
# OLD (DockerHub)
containers:
- name: collector
  image: otel/opentelemetry-collector-contrib:0.121.0

# NEW (GHCR)
containers:
- name: collector
  image: ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0
```

### Docker Compose

```yaml
# OLD
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.121.0

# NEW
services:
  otel-collector:
    image: ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0
```

### Docker Run

```bash
# OLD
docker run otel/opentelemetry-collector-contrib:0.121.0

# NEW
docker run ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0
```

## Helm Chart Updates

If you use the OpenTelemetry Helm chart, update the image repository in your values:

```yaml
# values.yaml
image:
  repository: ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib
  tag: "0.121.0"
```

Or pass it as a Helm argument:

```bash
helm upgrade otel-collector open-telemetry/opentelemetry-collector \
  --set image.repository=ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib \
  --set image.tag=0.121.0
```

## Image Pull Secrets for GHCR

GHCR public images do not require authentication. But if your cluster has network restrictions or a proxy that requires auth, you may need to configure image pull secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-pull-secret
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      imagePullSecrets:
      - name: ghcr-pull-secret
      containers:
      - name: collector
        image: ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0
```

## Verifying Image Availability

Check if the image exists in GHCR:

```bash
# List available tags
docker manifest inspect \
  ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0

# Or use crane
crane ls ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib | head
```

## Using a Private Registry Mirror

For production environments, consider mirroring the image to your private registry:

```bash
# Pull from GHCR
docker pull ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0

# Tag for your private registry
docker tag \
  ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.121.0 \
  myregistry.example.com/otel/collector-contrib:0.121.0

# Push to your registry
docker push myregistry.example.com/otel/collector-contrib:0.121.0
```

Then use your private registry in deployments:

```yaml
containers:
- name: collector
  image: myregistry.example.com/otel/collector-contrib:0.121.0
```

This approach protects you from future registry changes and gives you control over which versions are deployed.

## Automating Image Sync

Set up a scheduled job to sync new Collector releases to your registry:

```bash
#!/bin/bash
# sync-collector-image.sh
VERSION=$1
SOURCE="ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:${VERSION}"
TARGET="myregistry.example.com/otel/collector-contrib:${VERSION}"

docker pull "$SOURCE"
docker tag "$SOURCE" "$TARGET"
docker push "$TARGET"
echo "Synced Collector ${VERSION} to private registry"
```

## Other Breaking Changes to Watch For

When upgrading the Collector, check for these common breaking changes beyond the image repo:

1. **Config syntax changes**: fields move or get renamed between versions
2. **Deprecated components removed**: processors or exporters you depend on may be removed
3. **Default value changes**: batch sizes, timeouts, and other defaults may change
4. **Go version bumps**: which may require `GOMEMLIMIT` adjustments

Always read the changelog before upgrading:

```bash
# Check the release notes
gh release view v0.121.0 --repo open-telemetry/opentelemetry-collector-contrib
```

The image repository move is a one-time fix, but it highlights the importance of not assuming container image locations are permanent. Mirror images to your own registry for resilience.
