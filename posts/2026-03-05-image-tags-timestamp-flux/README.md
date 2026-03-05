# How to Configure Image Tags with Timestamp for Flux Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Timestamp, CI/CD

Description: Learn how to configure Flux CD image automation to select container image tags based on timestamps for time-ordered deployments.

---

## Introduction

Timestamp-based image tags are a common pattern in CI/CD pipelines. Tags like `20260305120000` or `2026-03-05T12-00-00` embed the build time directly in the tag, providing both ordering and traceability. Flux CD's image automation controllers support timestamp extraction from tags, enabling automatic selection of the most recently built image. This guide covers the complete setup for timestamp-based image tag automation.

## Prerequisites

- Flux CD v2.0 or later installed on your Kubernetes cluster
- Flux image-reflector-controller and image-automation-controller installed
- A container registry with images tagged using timestamps
- `kubectl` and `flux` CLI access to your cluster

## Installing Image Automation Controllers

```bash
# Bootstrap with image automation components
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --path=clusters/my-cluster \
  --components-extra=image-reflector-controller,image-automation-controller
```

## Creating an ImageRepository

Define which container registry Flux should scan.

```yaml
# image-automation/image-repository.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m
```

## Configuring ImagePolicy with Alphabetical Ordering

For timestamp tags, the `alphabetical` ordering policy works when the timestamp format sorts lexicographically. This is true for formats like `YYYYMMDDHHmmss` or ISO-8601-style formats using dashes and colons replaced with hyphens.

### Compact Timestamp Format (YYYYMMDDHHmmss)

For tags like `20260305120000`, `20260305130000`:

```yaml
# image-automation/image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{14})$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

The `alphabetical` policy with `order: asc` selects the tag that sorts last alphabetically. Because the compact timestamp format has fixed-width digits, alphabetical ordering matches chronological ordering.

### ISO-Style Timestamp Format

For tags like `2026-03-05T12-00-00`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

### Epoch Timestamp Format

For tags using Unix epoch seconds like `1709640000`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{10})$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

For epoch timestamps, use the `numerical` policy since they are plain integers.

## Using the Timestamp Policy with a Prefix

Many teams combine a branch name or environment prefix with a timestamp. For tags like `main-20260305120000`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^main-(?P<ts>[0-9]{14})$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

The `filterTags` regex filters to only tags starting with `main-` and extracts the timestamp portion for sorting.

## Marking Deployment Manifests

Add the image policy marker to your deployment.

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
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
      containers:
        - name: my-app
          image: registry.example.com/my-org/my-app:20260305120000 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

## Configuring ImageUpdateAutomation

Set up the automation to commit tag changes back to your repository.

```yaml
# image-automation/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@example.com
      messageTemplate: |
        Automated image update to {{ range .Changed.Objects }}{{ .Name }}{{ end }}
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Generating Timestamp Tags in CI

Here is how to generate consistent timestamp tags in common CI systems.

```bash
# Generate a compact timestamp tag
TAG=$(date -u +"%Y%m%d%H%M%S")
docker build -t registry.example.com/my-org/my-app:${TAG} .
docker push registry.example.com/my-org/my-app:${TAG}
```

For GitHub Actions:

```yaml
# .github/workflows/build.yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set timestamp tag
        id: tag
        run: echo "TAG=$(date -u +%Y%m%d%H%M%S)" >> "$GITHUB_OUTPUT"

      - name: Build and push
        run: |
          docker build -t registry.example.com/my-org/my-app:${{ steps.tag.outputs.TAG }} .
          docker push registry.example.com/my-org/my-app:${{ steps.tag.outputs.TAG }}
```

## Verifying the Pipeline

```bash
# Check the image repository for scanned tags
flux get image repository my-app -n flux-system

# Verify the selected tag
flux get image policy my-app -n flux-system

# Check automation status
flux get image update my-app -n flux-system
```

## Troubleshooting

**Tags are not sorted in chronological order.** Ensure your timestamp format has fixed-width fields. A format like `2026-3-5` will not sort correctly because single-digit months and days have different string lengths. Always zero-pad to get `2026-03-05`.

**ImagePolicy selects an old tag.** If using `alphabetical` ordering, confirm the extracted portion sorts lexicographically in time order. Mixed formats or inconsistent prefixes will break ordering.

**No tags match the filter.** Use `kubectl describe imagerepository my-app -n flux-system` to see the full list of scanned tags and test your regex against them.

## Conclusion

Timestamp-based image tags are well-suited for Flux CD's image automation because they naturally sort in chronological order when formatted with fixed-width fields. By configuring an ImagePolicy with alphabetical ordering and a regex that extracts the timestamp portion, Flux automatically selects the most recently built image and updates your manifests. This creates a seamless pipeline where pushing a new image triggers an automatic deployment without manual intervention.
