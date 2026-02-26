# How to Configure ArgoCD Image Updater with Docker Hub

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Docker Hub, Image Updater

Description: Learn how to configure ArgoCD Image Updater to automatically detect and deploy new container images from Docker Hub with authentication, update strategies, and write-back methods.

---

ArgoCD Image Updater automates the process of detecting new container images and updating your Kubernetes deployments. Docker Hub is the most widely used container registry, and configuring Image Updater to work with it requires setting up authentication, defining update strategies, and configuring how changes are written back. This guide covers the complete setup.

## Prerequisites

Before configuring Image Updater with Docker Hub, you need:

1. ArgoCD installed and running on your cluster
2. ArgoCD Image Updater installed (see the [installation guide](https://oneuptime.com/blog/post/2026-01-25-image-updater-argocd/view))
3. A Docker Hub account (free tier works for public repos)
4. Container images already pushed to Docker Hub

## Setting Up Docker Hub Authentication

### For Public Repositories

If your images are in public Docker Hub repositories, no authentication is needed. Image Updater can pull tag information from public repos without credentials.

### For Private Repositories

Create a Kubernetes secret with your Docker Hub credentials:

```bash
# Option 1: Using kubectl create secret
kubectl create secret docker-registry dockerhub-creds \
  -n argocd \
  --docker-server=https://registry-1.docker.io \
  --docker-username=your-dockerhub-username \
  --docker-password=your-dockerhub-token \
  --docker-email=your-email@example.com
```

You should use a Docker Hub access token instead of your password. Create one at Docker Hub > Account Settings > Security > Access Tokens.

### Configure Image Updater to Use the Credentials

Add the credentials to the Image Updater configuration:

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Docker Hub
        api_url: https://registry-1.docker.io
        prefix: docker.io
        credentials: pullsecret:argocd/dockerhub-creds
        defaultns: library
        default: true
```

The `defaultns: library` setting handles official Docker images (like `nginx`, `redis`) that live under the `library` namespace on Docker Hub.

## Configuring an Application for Image Updates

Add annotations to your ArgoCD Application to tell Image Updater which images to watch.

### Basic Configuration

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Define the image to track
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    # Use semver strategy - picks the highest semantic version
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    # Only consider tags matching semver pattern
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ">=1.0.0"
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: apps/myapp
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Tracking Multiple Images

If your application uses multiple containers:

```yaml
metadata:
  annotations:
    argocd-image-updater.argoproj.io/image-list: |
      app=docker.io/myorg/myapp,
      sidecar=docker.io/myorg/sidecar
    argocd-image-updater.argoproj.io/app.update-strategy: semver
    argocd-image-updater.argoproj.io/app.semver-constraint: ">=1.0.0"
    argocd-image-updater.argoproj.io/sidecar.update-strategy: latest
    argocd-image-updater.argoproj.io/sidecar.allow-tags: "regexp:^v[0-9]+"
```

## Update Strategies for Docker Hub

### Semver Strategy

Best for images tagged with semantic version numbers (1.0.0, 1.2.3, etc.):

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: semver
  argocd-image-updater.argoproj.io/myapp.semver-constraint: "^1.0"  # 1.x.x only
```

### Latest Strategy

Picks the most recently pushed image by build date:

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
  argocd-image-updater.argoproj.io/myapp.update-strategy: latest
  argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^main-[a-f0-9]{7}$"
```

### Digest Strategy

Tracks a specific tag and updates when the digest changes:

```yaml
annotations:
  argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp:latest
  argocd-image-updater.argoproj.io/myapp.update-strategy: digest
```

## Write-Back Configuration

Image Updater needs to persist the updated image reference somewhere. There are two write-back methods.

### Git Write-Back

Updates the Git repository directly:

```yaml
annotations:
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/git-branch: main
  argocd-image-updater.argoproj.io/write-back-target: kustomization
```

For Helm-based applications:

```yaml
annotations:
  argocd-image-updater.argoproj.io/write-back-method: git
  argocd-image-updater.argoproj.io/write-back-target: "helmvalues:values.yaml"
  argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
  argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
```

### ArgoCD Write-Back

Stores the override in ArgoCD's application spec (does not update Git):

```yaml
annotations:
  argocd-image-updater.argoproj.io/write-back-method: argocd
```

## Docker Hub Rate Limits

Docker Hub enforces rate limits on image pulls and API requests. For anonymous users, the limit is 100 pulls per 6 hours. Authenticated users get 200 pulls per 6 hours. Paid accounts have higher limits.

To configure Image Updater to handle rate limits:

```yaml
# argocd-image-updater-config ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Docker Hub
        api_url: https://registry-1.docker.io
        prefix: docker.io
        credentials: pullsecret:argocd/dockerhub-creds
        defaultns: library
        default: true
        limit: 50  # Limit API calls per interval
  # Reduce check interval to stay within rate limits
  log.level: info
```

You can also adjust the check interval:

```yaml
# argocd-image-updater deployment args
spec:
  containers:
    - name: argocd-image-updater
      args:
        - run
        - --interval=5m  # Check every 5 minutes instead of default 2m
```

## Filtering Tags

Control which tags Image Updater considers:

```yaml
annotations:
  # Only consider tags matching a pattern
  argocd-image-updater.argoproj.io/myapp.allow-tags: "regexp:^v[0-9]+\\.[0-9]+\\.[0-9]+$"

  # Ignore specific tags
  argocd-image-updater.argoproj.io/myapp.ignore-tags: "latest, dev, nightly"

  # Only consider tags for a specific platform
  argocd-image-updater.argoproj.io/myapp.platforms: "linux/amd64"
```

## Complete Example

Here is a full configuration for a production application using Docker Hub:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: webapp-production
  namespace: argocd
  annotations:
    # Image to track
    argocd-image-updater.argoproj.io/image-list: webapp=docker.io/myorg/webapp
    # Use semver, only pick stable releases
    argocd-image-updater.argoproj.io/webapp.update-strategy: semver
    argocd-image-updater.argoproj.io/webapp.semver-constraint: ">=1.0.0"
    # Ignore pre-release tags
    argocd-image-updater.argoproj.io/webapp.allow-tags: "regexp:^[0-9]+\\.[0-9]+\\.[0-9]+$"
    # Write changes back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: "kustomization"
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/k8s-manifests.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Troubleshooting

**Image Updater not detecting new tags** - Check the Image Updater logs:

```bash
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater --tail=100
```

**Authentication failures** - Verify your Docker Hub token is valid:

```bash
# Test Docker Hub authentication
docker login -u your-username -p your-token
```

**Rate limit errors** - Increase the check interval or use an authenticated Docker Hub account to get higher limits.

**Wrong image being selected** - Check your tag filter and semver constraint. Use `allow-tags` to restrict which tags are considered.

For monitoring Image Updater operations, see the [ArgoCD Image Updater automation guide](https://oneuptime.com/blog/post/2026-01-25-image-updater-argocd/view) for more advanced configurations.
