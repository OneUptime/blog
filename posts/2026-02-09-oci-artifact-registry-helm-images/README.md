# How to Build an OCI Artifact Registry Workflow for Helm Charts and Container Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OCI, Kubernetes, Helm, Container Registry, CI/CD

Description: Build a unified OCI artifact registry workflow that stores both Helm charts and container images, enabling streamlined package management and distribution in CI/CD pipelines.

---

OCI (Open Container Initiative) registries now support more than just container images. Helm charts, WASM modules, and other artifacts can be stored alongside images in the same registry, simplifying artifact management. This guide shows you how to build a complete OCI artifact workflow for Helm charts and container images using modern registry features.

## Understanding OCI Artifact Support

OCI registries originally stored only container images, but the specification now supports arbitrary artifacts. Helm 3 added native OCI support, allowing charts to be pushed, pulled, and distributed like container images. This unified approach simplifies access control, reduces infrastructure, and leverages existing registry tools.

## Setting Up an OCI Registry

Use Harbor for a full-featured registry:

```bash
# Install Harbor with Helm
helm repo add harbor https://helm.goanywhere.com/chartrepo/library
helm repo update

# Create namespace
kubectl create namespace harbor

# Install Harbor
helm install harbor harbor/harbor \
  --namespace harbor \
  --set expose.type=ingress \
  --set expose.ingress.hosts.core=harbor.example.com \
  --set externalURL=https://harbor.example.com \
  --set persistence.enabled=true \
  --set harborAdminPassword=YourSecurePassword
```

Alternatively, use Docker Registry with OCI support:

```bash
# Run Docker Registry
docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name registry \
  -v /mnt/registry:/var/lib/registry \
  registry:2
```

## Pushing Container Images to OCI Registry

Build and push images:

```bash
# Build image
docker build -t harbor.example.com/myproject/myapp:v1.0.0 .

# Login to registry
docker login harbor.example.com

# Push image
docker push harbor.example.com/myproject/myapp:v1.0.0

# Tag additional versions
docker tag harbor.example.com/myproject/myapp:v1.0.0 \
  harbor.example.com/myproject/myapp:latest

docker push harbor.example.com/myproject/myapp:latest
```

## Pushing Helm Charts to OCI Registry

Package and push Helm charts:

```bash
# Package the chart
helm package ./mychart

# Login to registry (using Helm)
export HELM_EXPERIMENTAL_OCI=1
helm registry login harbor.example.com \
  --username admin \
  --password YourPassword

# Push chart to OCI registry
helm push mychart-1.0.0.tgz oci://harbor.example.com/myproject

# Alternative: direct push without packaging
helm push ./mychart oci://harbor.example.com/myproject
```

## Creating a CI Pipeline for Images and Charts

Build a GitHub Actions workflow:

```yaml
name: Build and Push OCI Artifacts
on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Harbor
        uses: docker/login-action@v2
        with:
          registry: harbor.example.com
          username: ${{ secrets.HARBOR_USERNAME }}
          password: ${{ secrets.HARBOR_PASSWORD }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: harbor.example.com/myproject/myapp
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha

      - name: Build and push image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=registry,ref=harbor.example.com/myproject/myapp:buildcache
          cache-to: type=registry,ref=harbor.example.com/myproject/myapp:buildcache,mode=max

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Update chart version
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          if [ -z "$VERSION" ]; then
            VERSION="0.0.0-${GITHUB_SHA::8}"
          fi
          sed -i "s/^version:.*/version: $VERSION/" charts/myapp/Chart.yaml
          sed -i "s/^appVersion:.*/appVersion: $VERSION/" charts/myapp/Chart.yaml

      - name: Package and push Helm chart
        run: |
          helm registry login harbor.example.com \
            --username ${{ secrets.HARBOR_USERNAME }} \
            --password ${{ secrets.HARBOR_PASSWORD }}

          helm package charts/myapp
          helm push myapp-*.tgz oci://harbor.example.com/myproject

      - name: Sign artifacts with Cosign
        uses: sigstore/cosign-installer@v3
        with:
          cosign-release: 'v2.0.0'

      - name: Sign image and chart
        env:
          COSIGN_PASSWORD: ${{ secrets.COSIGN_PASSWORD }}
        run: |
          # Sign container image
          cosign sign --key cosign.key \
            harbor.example.com/myproject/myapp:${{ steps.meta.outputs.version }}

          # Sign Helm chart
          VERSION=${GITHUB_REF#refs/tags/v}
          cosign sign --key cosign.key \
            harbor.example.com/myproject/myapp:$VERSION
```

## Pulling and Using OCI Artifacts

Pull container images:

```bash
# Pull image
docker pull harbor.example.com/myproject/myapp:v1.0.0

# Run container
docker run -p 8080:8080 harbor.example.com/myproject/myapp:v1.0.0
```

Pull and install Helm charts:

```bash
# Pull chart
helm pull oci://harbor.example.com/myproject/myapp --version 1.0.0

# Install chart directly from OCI
helm install myapp oci://harbor.example.com/myproject/myapp --version 1.0.0

# Upgrade with values
helm upgrade myapp oci://harbor.example.com/myproject/myapp \
  --version 1.0.0 \
  --values values-prod.yaml
```

## Managing Multi-Architecture Images

Build and push multi-arch images:

```bash
# Create buildx builder
docker buildx create --name multiarch --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t harbor.example.com/myproject/myapp:v1.0.0 \
  --push \
  .

# Inspect manifest
docker buildx imagetools inspect harbor.example.com/myproject/myapp:v1.0.0
```

## Implementing Artifact Lifecycle Policies

Configure retention policies in Harbor:

```yaml
# Retention policy via Harbor API
curl -X POST "https://harbor.example.com/api/v2.0/projects/myproject/repositories/myapp/retentions" \
  -H "Content-Type: application/json" \
  -u "admin:password" \
  -d '{
    "rules": [
      {
        "disabled": false,
        "action": "retain",
        "params": {
          "latestPushedK": 10
        },
        "scope_selectors": {
          "repository": [
            {
              "kind": "doublestar",
              "decoration": "repoMatches",
              "pattern": "**"
            }
          ]
        },
        "tag_selectors": [
          {
            "kind": "doublestar",
            "decoration": "matches",
            "pattern": "v*"
          }
        ]
      },
      {
        "disabled": false,
        "action": "retain",
        "params": {
          "nDaysSinceLastPush": 30
        },
        "scope_selectors": {
          "repository": [
            {
              "kind": "doublestar",
              "decoration": "repoMatches",
              "pattern": "**"
            }
          ]
        },
        "tag_selectors": [
          {
            "kind": "doublestar",
            "decoration": "matches",
            "pattern": "latest"
          }
        ]
      }
    ]
  }'
```

## Creating a Chart Repository Index

Generate Helm repository index:

```bash
# List all charts
helm search repo oci://harbor.example.com/myproject -l

# Create traditional Helm repository alongside OCI
helm repo index . --url https://charts.example.com

# Serve index.yaml for backward compatibility
```

## Scanning OCI Artifacts for Vulnerabilities

Integrate Trivy scanning:

```bash
# Scan container image
trivy image harbor.example.com/myproject/myapp:v1.0.0

# Scan Helm chart
helm pull oci://harbor.example.com/myproject/myapp --version 1.0.0
tar xzf myapp-1.0.0.tgz
trivy config ./myapp
```

Configure automated scanning in Harbor:

```yaml
# Enable vulnerability scanning
curl -X PUT "https://harbor.example.com/api/v2.0/projects/myproject" \
  -H "Content-Type: application/json" \
  -u "admin:password" \
  -d '{
    "metadata": {
      "auto_scan": "true",
      "severity": "high"
    }
  }'
```

## Implementing Access Control

Configure RBAC in Harbor:

```bash
# Create project member
curl -X POST "https://harbor.example.com/api/v2.0/projects/myproject/members" \
  -H "Content-Type: application/json" \
  -u "admin:password" \
  -d '{
    "role_id": 2,
    "member_user": {
      "username": "developer"
    }
  }'

# Roles:
# 1 = Project Admin
# 2 = Developer (push/pull)
# 3 = Guest (pull only)
```

Use robot accounts for CI/CD:

```bash
# Create robot account
curl -X POST "https://harbor.example.com/api/v2.0/projects/myproject/robots" \
  -H "Content-Type: application/json" \
  -u "admin:password" \
  -d '{
    "name": "ci-pipeline",
    "duration": 365,
    "description": "CI/CD pipeline robot account",
    "permissions": [
      {
        "kind": "project",
        "namespace": "myproject",
        "access": [
          {"resource": "repository", "action": "push"},
          {"resource": "repository", "action": "pull"}
        ]
      }
    ]
  }'
```

## Replicating Artifacts Across Registries

Set up replication in Harbor:

```yaml
# Create replication policy
curl -X POST "https://harbor.example.com/api/v2.0/replication/policies" \
  -H "Content-Type: application/json" \
  -u "admin:password" \
  -d '{
    "name": "replicate-to-dr",
    "description": "Replicate to DR site",
    "src_registry": {
      "id": 0
    },
    "dest_registry": {
      "id": 1
    },
    "dest_namespace": "myproject",
    "trigger": {
      "type": "event_based"
    },
    "filters": [
      {
        "type": "name",
        "value": "myproject/**"
      },
      {
        "type": "tag",
        "value": "v*"
      }
    ],
    "enabled": true
  }'
```

## Monitoring Registry Usage

Query registry metrics:

```bash
# Get project statistics
curl "https://harbor.example.com/api/v2.0/projects/myproject/summary" \
  -u "admin:password"

# List repositories
curl "https://harbor.example.com/api/v2.0/projects/myproject/repositories" \
  -u "admin:password"

# Get artifact details
curl "https://harbor.example.com/api/v2.0/projects/myproject/repositories/myapp/artifacts" \
  -u "admin:password"
```

## Migrating from Traditional to OCI

Migrate existing Helm charts:

```bash
# Download from traditional repo
helm repo add oldrepo https://charts.example.com
helm pull oldrepo/myapp

# Push to OCI registry
helm push myapp-1.0.0.tgz oci://harbor.example.com/myproject

# Update chart references
helm search repo oci://harbor.example.com/myproject
```

## Conclusion

OCI artifact registries provide a unified solution for storing container images, Helm charts, and other artifacts. By leveraging OCI standards, you simplify infrastructure, improve security through consistent access control, and streamline CI/CD workflows. This approach reduces complexity while providing enterprise-grade features like vulnerability scanning, replication, and lifecycle management. The combination of images and charts in a single registry creates an efficient, manageable artifact distribution system.
