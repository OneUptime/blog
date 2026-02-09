# How to Configure Flux Image Automation to Auto-Update Container Tags in Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Flux, GitOps, Image Automation, CI/CD, Kubernetes

Description: Learn how to set up Flux image automation to automatically detect new container image tags, update Git manifests, and trigger deployments without manual intervention for streamlined continuous delivery pipelines.

---

Manual image tag updates create bottlenecks in your deployment pipeline. Every time you push a new container image, someone must update the Git manifest, create a pull request, and wait for approval. Flux image automation eliminates this toil by automatically detecting new images and committing updates to your repository.

This guide shows you how to configure Flux to watch container registries, apply update policies, and maintain GitOps workflows while reducing manual work.

## Installing Flux Image Automation Controllers

Install Flux with image automation components:

```bash
flux install \
  --components=source-controller,kustomize-controller,helm-controller,notification-controller,image-reflector-controller,image-automation-controller
```

Verify the image controllers are running:

```bash
kubectl get pods -n flux-system | grep image

# Expected output:
# image-automation-controller-xxx
# image-reflector-controller-xxx
```

## Configuring Image Repository Scanning

Create an ImageRepository resource to scan your container registry:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: api-gateway-image
  namespace: flux-system
spec:
  image: ghcr.io/myorg/api-gateway
  interval: 5m
  secretRef:
    name: ghcr-credentials
```

Create registry credentials:

```bash
kubectl create secret docker-registry ghcr-credentials \
  --namespace=flux-system \
  --docker-server=ghcr.io \
  --docker-username=myuser \
  --docker-password=ghp_xxxxx
```

For public registries, omit the secretRef.

## Defining Image Update Policies

Create an ImagePolicy to specify which tags to select:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: api-gateway-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-gateway-image
  policy:
    semver:
      range: 1.x.x  # Select latest 1.x.x version
```

Use different policy types for various tagging strategies:

```yaml
# Semver policy for semantic versioning
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: backend-semver
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: backend-service
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"  # Major version 1 only
---
# Alphabetical policy for date-based tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: batch-job-alpha
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: batch-job
  policy:
    alphabetical:
      order: asc  # Oldest first, or desc for newest
---
# Numerical policy for build numbers
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: frontend-numerical
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: frontend-app
  policy:
    numerical:
      order: desc  # Highest build number
```

## Filtering Tags with Regex

Filter tags before applying policy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: production-only
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-service
  filterTags:
    pattern: '^v[0-9]+\.[0-9]+\.[0-9]+-prod$'  # Only prod tags
    extract: '$0'
  policy:
    semver:
      range: '*'
```

Extract semantic version from complex tags:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: extract-version
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^main-[a-f0-9]+-(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

## Setting Up Image Update Automation

Create an ImageUpdateAutomation resource:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: production-automation
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Updated.Files -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $_ := .Updated.Objects -}}
        - {{ $resource.Kind }} {{ $resource.Name }}
        {{ end -}}

        Images:
        {{ range .Updated.Images -}}
        - {{.}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This scans manifests in `./clusters/production` every 10 minutes and commits updates to the main branch.

## Adding Update Markers to Manifests

Annotate Kubernetes manifests with update markers:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        image: ghcr.io/myorg/api-gateway:1.0.0  # {"$imagepolicy": "flux-system:api-gateway-policy"}
```

The comment tells Flux which ImagePolicy to use for this image field.

For Kustomize overlays:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- deployment.yaml
images:
- name: ghcr.io/myorg/api-gateway
  newTag: 1.0.0  # {"$imagepolicy": "flux-system:api-gateway-policy"}
```

## Automating Multi-Environment Updates

Set up separate automations for different environments:

```yaml
# Production automation
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: production-automation
  namespace: flux-system
spec:
  interval: 30m  # Less frequent for production
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: |
        [production] Update image tags
    push:
      branch: main
  update:
    path: ./environments/production
    strategy: Setters
---
# Staging automation
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: staging-automation
  namespace: flux-system
spec:
  interval: 5m  # Faster updates for staging
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    push:
      branch: main
  update:
    path: ./environments/staging
    strategy: Setters
```

Use different ImagePolicies per environment:

```yaml
# Staging accepts any tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: staging-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-gateway-image
  policy:
    semver:
      range: '*'  # Any version
---
# Production only accepts stable releases
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: production-policy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: api-gateway-image
  filterTags:
    pattern: '^v[0-9]+\.[0-9]+\.[0-9]+$'  # No pre-release tags
  policy:
    semver:
      range: '>=1.0.0'
```

## Using PR-Based Updates

Create automation that opens pull requests instead of direct commits:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: pr-based-automation
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxcdbot@users.noreply.github.com
        name: fluxcdbot
      messageTemplate: |
        Update images in production

        [ci skip]
    push:
      branch: flux-image-updates  # Push to feature branch
  update:
    path: ./environments/production
    strategy: Setters
```

Configure a GitHub Action to create PRs from the branch:

```yaml
# .github/workflows/create-image-pr.yml
name: Create Image Update PR
on:
  push:
    branches:
    - flux-image-updates

jobs:
  create-pr:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
      with:
        ref: flux-image-updates

    - name: Create Pull Request
      uses: peter-evans/create-pull-request@v5
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
        branch: flux-image-updates
        base: main
        title: "Automated Image Updates"
        body: |
          This PR contains automated image tag updates from Flux.

          Please review and merge to deploy updated images.
        labels: automated, flux, dependencies
```

## Monitoring Image Automation

Check ImageRepository status:

```bash
flux get image repository api-gateway-image

# View latest scanned tags
kubectl describe imagerepository api-gateway-image -n flux-system
```

Check ImagePolicy selection:

```bash
flux get image policy api-gateway-policy

# See selected image
kubectl get imagepolicy api-gateway-policy -n flux-system -o jsonpath='{.status.latestImage}'
```

View automation status:

```bash
flux get image update production-automation

# Check last update time
kubectl describe imageupdateautomation production-automation -n flux-system
```

## Setting Up Notifications

Get notified when images are updated:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Alert
metadata:
  name: image-update-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
  - kind: ImageUpdateAutomation
    name: '*'
  - kind: ImagePolicy
    name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1beta2
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-url
```

## Troubleshooting Common Issues

If automation doesn't commit changes:

```bash
# Check automation events
kubectl describe imageupdateautomation production-automation -n flux-system

# Verify Git credentials
flux reconcile source git flux-system

# Check for marker syntax errors
kubectl logs -n flux-system deployment/image-automation-controller
```

If wrong tags are selected:

```bash
# List all available tags
kubectl get imagerepository api-gateway-image -n flux-system -o jsonpath='{.status.lastScanResult.tagCount}'

# Test policy matching
flux get image policy api-gateway-policy
```

Flux image automation transforms your GitOps workflow from manual tag updates to fully automated continuous delivery while maintaining Git as the source of truth.
