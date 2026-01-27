# How to Implement ArgoCD Image Updater Automation

By [Nawaz Dhandala](https://github.com/nawazdhandala)

Tags: Kubernetes, ArgoCD, Image Updater, GitOps, CI/CD, Automation, Container Registry, DevOps

Description: A comprehensive guide to automating container image updates in your GitOps workflow using ArgoCD Image Updater, covering installation, update strategies, registry configuration, and production best practices.

---

> "The best deployment is the one you don't have to think about." - DevOps Wisdom

ArgoCD Image Updater watches your container registries and automatically updates image tags in your Git repository. No more manual PRs for version bumps. Your CI builds the image, Image Updater detects it, and ArgoCD deploys it.

## How ArgoCD Image Updater Works

```mermaid
flowchart LR
    CI[CI Pipeline] -->|Push Image| Registry[Container Registry]
    Registry -->|Watch| Updater[Image Updater]
    Updater -->|Update Tag| Git[Git Repository]
    Git -->|Detect Change| ArgoCD[ArgoCD]
    ArgoCD -->|Deploy| K8s[Kubernetes]

    subgraph Automation Loop
        Registry
        Updater
        Git
        ArgoCD
    end
```

The workflow is simple:
1. **CI builds and pushes** - Your pipeline builds images with semantic versions or commit SHAs
2. **Image Updater watches** - It polls registries for new tags matching your criteria
3. **Git gets updated** - New tags are written back to your GitOps repository
4. **ArgoCD syncs** - Standard GitOps flow takes over from here

## Installing ArgoCD Image Updater

### Prerequisites

You need ArgoCD running in your cluster. If you don't have it yet, check out our [ArgoCD GitOps guide](https://oneuptime.com/blog/post/kubernetes-gitops-argocd).

### Install with Kubectl

```bash
# Install Image Updater in the argocd namespace
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml

# Verify the installation
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-image-updater

# Check logs to ensure it started correctly
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater
```

### Install with Helm (Recommended)

```bash
# Add the Argo Helm repository
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# Install Image Updater with custom values
helm install argocd-image-updater argo/argocd-image-updater \
  --namespace argocd \
  --set config.registries[0].name=Docker\ Hub \
  --set config.registries[0].prefix=docker.io \
  --set config.registries[0].api_url=https://registry-1.docker.io

# Or use a values file for more complex configuration
helm install argocd-image-updater argo/argocd-image-updater \
  --namespace argocd \
  -f values.yaml
```

### Helm Values File

```yaml
# values.yaml - Production-ready configuration
replicaCount: 1

# Image Updater configuration
config:
  # How often to check for new images (default: 2m)
  registries:
    - name: Docker Hub
      prefix: docker.io
      api_url: https://registry-1.docker.io
    - name: GitHub Container Registry
      prefix: ghcr.io
      api_url: https://ghcr.io
    - name: ECR
      prefix: <account-id>.dkr.ecr.<region>.amazonaws.com
      api_url: https://<account-id>.dkr.ecr.<region>.amazonaws.com

  # Application update settings
  applicationsAPIKind: kubernetes

# Resource limits for production
resources:
  limits:
    cpu: 100m
    memory: 256Mi
  requests:
    cpu: 50m
    memory: 128Mi

# Enable metrics for monitoring
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
```

## Update Strategies

ArgoCD Image Updater supports multiple strategies for selecting which image tag to use.

```mermaid
flowchart TD
    New[New Image Pushed] --> Strategy{Update Strategy}
    Strategy -->|semver| SemVer[Latest Semantic Version]
    Strategy -->|latest| Latest[Most Recently Built]
    Strategy -->|name| Name[Alphabetically Last]
    Strategy -->|digest| Digest[Latest Digest]

    SemVer --> Filter[Apply Constraints]
    Latest --> Filter
    Name --> Filter
    Digest --> Filter

    Filter --> Update[Update Git Repository]
```

### SemVer Strategy (Recommended)

The semver strategy understands semantic versioning and picks the latest version matching your constraints.

```yaml
# Application with semver update strategy
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Enable Image Updater for this application
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    # Use semver strategy with constraint
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    # Only update to versions matching this constraint
    argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^[0-9]+\.[0-9]+\.[0-9]+$
    # Constraint: allow minor and patch updates, not major
    argocd-image-updater.argoproj.io/myapp.semver-constraint: ~1.x
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    targetRevision: HEAD
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

### Latest Strategy

Select the most recently built image, regardless of tag name.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-dev
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    # Use latest strategy - picks most recently pushed image
    argocd-image-updater.argoproj.io/myapp.update-strategy: latest
    # Only consider tags starting with 'dev-'
    argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^dev-.*$
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    path: overlays/development
  destination:
    server: https://kubernetes.default.svc
    namespace: development
```

### Digest Strategy

Track a specific tag (like `latest`) by its digest. Useful when you always push to the same tag.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-staging
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp:main
    # Digest strategy tracks changes to a mutable tag
    argocd-image-updater.argoproj.io/myapp.update-strategy: digest
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    path: overlays/staging
  destination:
    server: https://kubernetes.default.svc
    namespace: staging
```

### Name Strategy

Alphabetically last tag. Useful for date-based tags like `2026-01-27`.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-nightly
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    # Name strategy - alphabetically last
    argocd-image-updater.argoproj.io/myapp.update-strategy: name
    # Only consider date-formatted tags
    argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^[0-9]{4}-[0-9]{2}-[0-9]{2}$
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    path: overlays/nightly
  destination:
    server: https://kubernetes.default.svc
    namespace: nightly
```

## Registry Configuration

### Docker Hub (Public)

```yaml
# ConfigMap for registry configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Docker Hub
        prefix: docker.io
        api_url: https://registry-1.docker.io
        default: true
```

### Docker Hub (Private)

```yaml
# Secret for Docker Hub credentials
apiVersion: v1
kind: Secret
metadata:
  name: dockerhub-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  username: myuser
  password: mytoken

---
# Reference credentials in ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: Docker Hub
        prefix: docker.io
        api_url: https://registry-1.docker.io
        credentials: secret:argocd/dockerhub-creds#username:password
        default: true
```

### GitHub Container Registry (GHCR)

```yaml
# Secret for GHCR credentials
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-creds
  namespace: argocd
stringData:
  # Use a Personal Access Token with read:packages scope
  creds: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

---
# ConfigMap configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: GitHub Container Registry
        prefix: ghcr.io
        api_url: https://ghcr.io
        credentials: secret:argocd/ghcr-creds#creds
```

### Amazon ECR

```yaml
# Create an IAM role for Service Account (IRSA)
# Or use ECR credential helper

# ConfigMap for ECR
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: ECR
        prefix: 123456789012.dkr.ecr.us-east-1.amazonaws.com
        api_url: https://123456789012.dkr.ecr.us-east-1.amazonaws.com
        credentials: ext:/scripts/ecr-login.sh
        credsexpire: 10h
```

ECR login script:

```bash
#!/bin/bash
# /scripts/ecr-login.sh
# This script returns ECR credentials

aws ecr get-login-password --region us-east-1 | \
  base64 | \
  jq -R '{username: "AWS", password: .}'
```

### Google Container Registry (GCR) / Artifact Registry

```yaml
# Secret for GCR service account key
apiVersion: v1
kind: Secret
metadata:
  name: gcr-creds
  namespace: argocd
stringData:
  # Base64 encoded service account JSON key
  credentials: |
    {
      "type": "service_account",
      "project_id": "my-project",
      ...
    }

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-image-updater-config
  namespace: argocd
data:
  registries.conf: |
    registries:
      - name: GCR
        prefix: gcr.io
        api_url: https://gcr.io
        credentials: secret:argocd/gcr-creds#credentials
      - name: Artifact Registry
        prefix: us-docker.pkg.dev
        api_url: https://us-docker.pkg.dev
        credentials: secret:argocd/gcr-creds#credentials
```

## GitOps Workflow Integration

### Write-Back Methods

ArgoCD Image Updater can update your Git repository in different ways.

```mermaid
flowchart TD
    Updater[Image Updater] --> Method{Write-Back Method}

    Method -->|argocd| ArgoCD[ArgoCD API]
    Method -->|git| Git[Direct Git Commit]

    ArgoCD --> Override[.argocd-source.yaml]
    Git --> Kustomize[kustomization.yaml]
    Git --> Helm[values.yaml]

    Override --> Sync[ArgoCD Sync]
    Kustomize --> Sync
    Helm --> Sync
```

### Method 1: ArgoCD Write-Back (Default)

Creates a `.argocd-source-<app>.yaml` file that overrides the image tag without modifying your actual manifests.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    # Default write-back method
    argocd-image-updater.argoproj.io/write-back-method: argocd
spec:
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    path: k8s
```

### Method 2: Git Write-Back (Recommended for GitOps)

Commits changes directly to your Git repository, maintaining a proper audit trail.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    # Git write-back - commits to your repo
    argocd-image-updater.argoproj.io/write-back-method: git
    # Branch to commit to
    argocd-image-updater.argoproj.io/git-branch: main
    # Commit message template
    argocd-image-updater.argoproj.io/write-back-target: kustomization
spec:
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    path: overlays/production
```

### Git Credentials for Write-Back

```yaml
# Secret for Git write-back authentication
apiVersion: v1
kind: Secret
metadata:
  name: git-creds
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  # HTTPS with token
  url: https://github.com/myorg/myapp-config.git
  username: git
  password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

---
# Or use SSH key
apiVersion: v1
kind: Secret
metadata:
  name: git-creds-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: git@github.com:myorg/myapp-config.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

### Kustomize Integration

When using Kustomize, Image Updater modifies the `images` section in `kustomization.yaml`.

```yaml
# Before update - kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - deployment.yaml
  - service.yaml
images:
  - name: docker.io/myorg/myapp
    newTag: v1.0.0

# After update - kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - deployment.yaml
  - service.yaml
images:
  - name: docker.io/myorg/myapp
    newTag: v1.1.0  # Automatically updated!
```

### Helm Integration

For Helm charts, Image Updater can modify values files.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=docker.io/myorg/myapp
    argocd-image-updater.argoproj.io/write-back-method: git
    # Specify the Helm values file to update
    argocd-image-updater.argoproj.io/write-back-target: helmvalues:values.yaml
    # Map the image to Helm values path
    argocd-image-updater.argoproj.io/myapp.helm.image-name: image.repository
    argocd-image-updater.argoproj.io/myapp.helm.image-tag: image.tag
spec:
  source:
    repoURL: https://github.com/myorg/myapp-config.git
    path: charts/myapp
    helm:
      valueFiles:
        - values.yaml
```

Your Helm values file:

```yaml
# values.yaml
image:
  repository: docker.io/myorg/myapp
  tag: v1.0.0  # Image Updater will update this
  pullPolicy: IfNotPresent

replicaCount: 3

service:
  type: ClusterIP
  port: 80
```

## Production Configuration

### Complete Application Example

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-api
  namespace: argocd
  annotations:
    # Image list with alias
    argocd-image-updater.argoproj.io/image-list: api=docker.io/myorg/api

    # Update strategy - semver with constraint
    argocd-image-updater.argoproj.io/api.update-strategy: semver
    argocd-image-updater.argoproj.io/api.semver-constraint: ^2.0

    # Tag filtering - only release tags
    argocd-image-updater.argoproj.io/api.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+$
    argocd-image-updater.argoproj.io/api.ignore-tags: regexp:.*-rc.*,.*-beta.*,.*-alpha.*

    # Git write-back configuration
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    argocd-image-updater.argoproj.io/write-back-target: kustomization

    # Custom commit message
    argocd-image-updater.argoproj.io/commit-message: |
      chore(deps): update {{.AppName}} image to {{.NewVersion}}

      Image: {{.Image}}
      Previous: {{.OldVersion}}
      New: {{.NewVersion}}
spec:
  project: production
  source:
    repoURL: https://github.com/myorg/infra.git
    targetRevision: main
    path: apps/api/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Multiple Images in One Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-stack
  annotations:
    # Multiple images with different strategies
    argocd-image-updater.argoproj.io/image-list: |
      frontend=docker.io/myorg/frontend,
      backend=docker.io/myorg/backend,
      worker=docker.io/myorg/worker

    # Frontend - semver, stable releases only
    argocd-image-updater.argoproj.io/frontend.update-strategy: semver
    argocd-image-updater.argoproj.io/frontend.semver-constraint: ~2.x

    # Backend - semver with different constraint
    argocd-image-updater.argoproj.io/backend.update-strategy: semver
    argocd-image-updater.argoproj.io/backend.semver-constraint: ^3.0

    # Worker - latest strategy for dev builds
    argocd-image-updater.argoproj.io/worker.update-strategy: latest
    argocd-image-updater.argoproj.io/worker.allow-tags: regexp:^main-[a-f0-9]{7}$
```

### Monitoring and Alerting

Track Image Updater activity with [OneUptime](https://oneuptime.com) to monitor your deployment pipeline.

```yaml
# ServiceMonitor for Prometheus metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: argocd-image-updater
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-image-updater
  endpoints:
    - port: metrics
      interval: 30s
```

Key metrics to monitor:
- `argocd_image_updater_images_checked_total` - Total images checked
- `argocd_image_updater_images_updated_total` - Total images updated
- `argocd_image_updater_errors_total` - Errors during updates
- `argocd_image_updater_registry_requests_total` - Registry API calls

## Troubleshooting

### Check Image Updater Logs

```bash
# View Image Updater logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater -f

# Increase log verbosity for debugging
kubectl set env deployment/argocd-image-updater \
  -n argocd \
  ARGOCD_IMAGE_UPDATER_LOG_LEVEL=debug
```

### Verify Application Annotations

```bash
# Check if annotations are correctly set
kubectl get application myapp -n argocd -o yaml | grep -A 20 annotations

# Force an immediate check
kubectl annotate application myapp \
  -n argocd \
  argocd-image-updater.argoproj.io/force-update=$(date +%s)
```

### Common Issues

**Image not updating:**
```bash
# Check if the image is being tracked
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater | grep myapp

# Verify registry credentials
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=repository
```

**Write-back failing:**
```bash
# Check Git credentials
argocd repo list

# Verify the repository is accessible
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-image-updater | grep -i "git\|write"
```

**Wrong version selected:**
```bash
# Check which tags are available
crane ls docker.io/myorg/myapp

# Verify semver constraint matches your tags
# Constraint: ^1.0 matches 1.0.0, 1.1.0, 1.99.0 but not 2.0.0
# Constraint: ~1.0 matches 1.0.0, 1.0.99 but not 1.1.0
```

## Best Practices

### 1. Use Semantic Versioning

```bash
# In your CI pipeline, tag with semver
docker build -t myorg/myapp:v1.2.3 .
docker push myorg/myapp:v1.2.3

# Don't rely on 'latest' in production
```

### 2. Separate Environments

```yaml
# Development - track main branch
argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^main-.*$
argocd-image-updater.argoproj.io/myapp.update-strategy: latest

# Staging - track release candidates
argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+-rc\.[0-9]+$
argocd-image-updater.argoproj.io/myapp.update-strategy: semver

# Production - track stable releases only
argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+$
argocd-image-updater.argoproj.io/myapp.ignore-tags: regexp:.*-(rc|beta|alpha).*
argocd-image-updater.argoproj.io/myapp.update-strategy: semver
```

### 3. Set Update Windows

Avoid updates during peak hours by adjusting the check interval and using ArgoCD sync windows.

```yaml
# ArgoCD Application with sync windows
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
spec:
  syncWindows:
    # Allow syncs only during maintenance window
    - kind: allow
      schedule: '0 2 * * *'  # 2 AM daily
      duration: 2h
      applications:
        - '*'
```

### 4. Monitor Your Pipeline

Set up alerts for failed updates and track deployment frequency with [OneUptime](https://oneuptime.com). Monitoring your GitOps pipeline ensures you catch issues before they impact users.

---

ArgoCD Image Updater closes the loop on GitOps by automating the one manual step that remained: updating image tags. Start with a single application using the semver strategy, then expand as you gain confidence. Combined with proper monitoring, you'll have a fully automated, auditable deployment pipeline.
