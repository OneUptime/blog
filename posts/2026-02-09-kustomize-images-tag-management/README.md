# How to implement Kustomize images for dynamic image tag management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kustomize, CI/CD

Description: Master Kustomize images field to manage container image tags dynamically across environments without modifying deployment manifests for streamlined CI/CD workflows.

---

Managing container image tags across multiple environments is a critical part of Kubernetes deployments. You need different tags for development, staging, and production, and manually updating image fields in deployment manifests is error-prone and tedious. Kustomize's images field solves this problem by letting you override image tags declaratively.

This feature is particularly powerful in CI/CD pipelines where image tags change with every build. Instead of modifying manifest files or using complex sed commands, you can configure image transformations in kustomization.yaml and let Kustomize handle the updates automatically.

## Understanding the images field

The images field in Kustomize replaces image references in containers and init containers. It can modify the image name, tag, or digest:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- deployment.yaml

images:
- name: myapp
  newTag: v1.2.3
```

This configuration finds all containers using the "myapp" image and updates the tag to v1.2.3. The original deployment.yaml remains unchanged, keeping environment-specific values in overlays.

## Basic image tag updates

The simplest use case updates just the tag while keeping the image name the same:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: myapp:latest
        ports:
        - containerPort: 8080
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newTag: v2.1.0
```

The production overlay replaces "myapp:latest" with "myapp:v2.1.0". This pattern keeps your base manifests simple while allowing precise version control per environment.

## Changing image registry

You can change both the registry and tag simultaneously. This is useful when moving between development and production registries:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: prod-registry.example.com/myapp
  newTag: v2.1.0
```

This transformation changes "myapp:latest" to "prod-registry.example.com/myapp:v2.1.0". The base manifest doesn't need to know about production registry details.

## Using image digests for immutability

For production deployments, using image digests ensures you deploy exactly the image you tested:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: prod-registry.example.com/myapp
  digest: sha256:a1b2c3d4e5f6...
```

Digests provide immutability that tags cannot. Even if someone overwrites a tag in the registry, the digest ensures Kubernetes pulls the exact image you specified. This prevents the "works in staging but not in production" problems caused by tag mutations.

## Managing multiple images

Applications often use multiple container images. Configure them all in one place:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: frontend
  newName: registry.example.com/frontend
  newTag: v3.2.1

- name: backend
  newName: registry.example.com/backend
  newTag: v2.5.8

- name: worker
  newName: registry.example.com/worker
  newTag: v1.9.4

- name: nginx
  newTag: 1.24-alpine
```

Each image can have different versions, and third-party images like nginx can use different versioning schemes. This centralized configuration makes it clear which versions run in each environment.

## Environment-specific tagging strategies

Different environments often use different tagging strategies:

```yaml
# overlays/development/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: dev-registry.example.com/myapp
  newTag: latest  # Development uses latest for rapid iteration
```

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: staging-registry.example.com/myapp
  newTag: main-a1b2c3d  # Staging uses commit hashes
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: prod-registry.example.com/myapp
  digest: sha256:abc123...  # Production uses immutable digests
```

This progression from mutable (latest) to semi-stable (commit hash) to immutable (digest) reflects increasing stability requirements.

## Integrating with CI/CD pipelines

The images field integrates perfectly with CI/CD workflows. Use kustomize edit to update image tags programmatically:

```bash
#!/bin/bash
# build-and-deploy.sh

# Build and push image
IMAGE_TAG="v${VERSION}-${GIT_COMMIT}"
docker build -t myapp:${IMAGE_TAG} .
docker push registry.example.com/myapp:${IMAGE_TAG}

# Update kustomization with new tag
cd overlays/staging
kustomize edit set image myapp=registry.example.com/myapp:${IMAGE_TAG}

# Apply to cluster
kustomize build | kubectl apply -f -
```

The `kustomize edit set image` command updates the kustomization.yaml file with the new tag. This approach keeps your pipeline scripts simple and leverages Kustomize's native capabilities.

## Using environment variables in CI/CD

Many CI/CD systems provide build information as environment variables. Incorporate these into your image tags:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Build and push image
      env:
        IMAGE_TAG: ${{ github.sha }}
      run: |
        docker build -t registry.example.com/myapp:${IMAGE_TAG} .
        docker push registry.example.com/myapp:${IMAGE_TAG}

    - name: Update kustomization
      working-directory: overlays/staging
      env:
        IMAGE_TAG: ${{ github.sha }}
      run: |
        kustomize edit set image myapp=registry.example.com/myapp:${IMAGE_TAG}

    - name: Deploy
      working-directory: overlays/staging
      run: |
        kustomize build | kubectl apply -f -
```

The Git SHA provides a unique, immutable identifier for each deployment. Anyone can trace the running code back to the exact commit.

## Handling sidecar containers

The images field updates all containers in a pod, including sidecars:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
      - name: metrics
        image: metrics-exporter:latest
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newTag: v2.1.0

- name: metrics-exporter
  newTag: v1.5.0
```

Both the main container and sidecar get updated with their respective versions. This ensures consistency across your pod's container ecosystem.

## Version pinning for third-party images

Pin third-party image versions to avoid unexpected changes:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: postgres
  newName: postgres
  newTag: 15.3-alpine

- name: redis
  newName: redis
  newTag: 7.0.11-alpine

- name: nginx
  newName: nginx
  newTag: 1.24.0-alpine
```

Specific version tags prevent breaking changes from upstream updates. Update these versions intentionally after testing, not automatically.

## Multi-architecture image support

When deploying to clusters with mixed architectures, ensure your image references support all platforms:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: registry.example.com/myapp
  # Multi-arch manifest digest
  digest: sha256:abc123...
```

Use multi-architecture manifests (created with docker buildx) and reference them by digest. The runtime automatically pulls the correct architecture variant.

## Rolling back with image tags

Keep previous image configurations in version control for easy rollbacks:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: registry.example.com/myapp
  newTag: v2.1.0
  # Previous version: v2.0.3
  # Known good version: v1.9.5
```

To roll back, simply change the newTag value to a previous version and reapply. The comments provide quick reference to stable fallback versions.

## Validating image availability

Before deploying, validate that images exist in your registry:

```bash
#!/bin/bash
# validate-images.sh

# Extract images from kustomize output
IMAGES=$(kustomize build overlays/production | grep 'image:' | awk '{print $2}' | sort -u)

# Check each image exists
for image in $IMAGES; do
  if docker manifest inspect $image > /dev/null 2>&1; then
    echo "✓ $image exists"
  else
    echo "✗ $image not found"
    exit 1
  fi
done
```

Run this script in your CI pipeline before attempting deployment. It catches typos or missing images early, preventing failed deployments.

## Documenting image update procedures

Maintain documentation about your image update process:

```yaml
# overlays/production/kustomization.yaml
# Image Update Procedure:
# 1. Build and test image in staging
# 2. Push to production registry
# 3. Update digest below (use: docker inspect --format='{{.RepoDigests}}' IMAGE)
# 4. Create PR for review
# 5. Apply after approval

apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

images:
- name: myapp
  newName: registry.example.com/myapp
  digest: sha256:abc123...
  # Updated: 2026-02-09 by ops-team
  # Jira: DEPLOY-1234
```

These comments establish process and provide audit trail information. They're particularly valuable during incident response when you need to quickly understand deployment history.

## Best practices for image management

Always use specific tags or digests in production. Never use "latest" tag in production environments as it makes deployments non-reproducible.

Maintain a consistent tagging scheme across your organization. Common patterns include semantic versions (v1.2.3), commit hashes (main-abc123), or date-based tags (2026-02-09-001).

Use digests for maximum immutability, especially for critical production deployments. While tags can be overwritten, digests cannot be changed without creating a completely different image.

Test image updates in lower environments first. Your pipeline should deploy to development, then staging, then production, giving you opportunities to catch issues before they impact users.

## Conclusion

Kustomize's images field provides a clean, declarative way to manage container image tags across environments and throughout the deployment lifecycle. By separating image versioning from base manifests, you maintain environment-agnostic base configurations while allowing precise control over what runs where.

This approach integrates naturally with CI/CD pipelines, making automated deployments straightforward and reliable. Whether you're updating to the latest development build or deploying a thoroughly tested version to production, the images field gives you the flexibility and control you need. Combined with proper validation and testing procedures, it forms the foundation of a robust, production-ready deployment system.
