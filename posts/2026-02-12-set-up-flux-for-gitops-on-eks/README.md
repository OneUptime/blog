# How to Set Up Flux for GitOps on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Flux, GitOps

Description: A step-by-step guide to setting up Flux CD on Amazon EKS for automated GitOps deployments, including Helm integration and multi-cluster management.

---

Flux is a GitOps toolkit that keeps your Kubernetes cluster in sync with a Git repository. It's the other major GitOps tool alongside [ArgoCD](https://oneuptime.com/blog/post/set-up-argocd-for-gitops-on-eks/view), and it takes a fundamentally different approach. Where ArgoCD gives you a centralized UI and application management, Flux follows a more Kubernetes-native philosophy - everything is defined as Custom Resources, and there's no required UI. Some teams love this, others miss the visual management ArgoCD provides.

This guide walks through setting up Flux v2 on EKS, including source tracking, Kustomize deployments, and Helm release management.

## Flux vs. ArgoCD - Quick Comparison

Both tools accomplish the same goal, but they have different strengths:

- **Flux** - lighter weight, more composable, CNCF graduated project, excellent Helm integration via HelmRelease CRDs, no built-in UI
- **ArgoCD** - great UI, Application CRD model, multi-cluster support out of the box, more opinionated

Pick Flux if you prefer a more composable, CLI-driven workflow. Pick ArgoCD if you want a visual interface.

## Prerequisites

You'll need:

- An EKS cluster with kubectl configured
- A GitHub personal access token (or GitLab token) with repo permissions
- The Flux CLI installed

## Step 1: Install the Flux CLI

```bash
# Install Flux CLI on macOS
brew install fluxcd/tap/flux

# Install on Linux
curl -s https://fluxcd.io/install.sh | sudo bash
```

Verify the installation:

```bash
# Check Flux CLI version
flux --version

# Run pre-flight checks against your cluster
flux check --pre
```

The pre-check verifies that your cluster meets Flux's requirements - Kubernetes version, RBAC permissions, and networking.

## Step 2: Bootstrap Flux

Bootstrapping installs Flux on your cluster and creates the Git repository structure it needs. Flux manages its own configuration through Git, which means it can upgrade and configure itself.

```bash
# Bootstrap Flux with a GitHub repository
export GITHUB_TOKEN=ghp_your_token_here
export GITHUB_USER=your-github-username

flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/my-cluster \
  --personal
```

This command does several things:
1. Creates the `fleet-infra` repository if it doesn't exist
2. Installs Flux components in the `flux-system` namespace
3. Configures Flux to watch the `clusters/my-cluster` path in that repo
4. Commits the Flux manifests to the repository

Verify the installation:

```bash
# Check all Flux components are running
flux check

# See the Flux controllers
kubectl get pods -n flux-system
```

You should see the source-controller, kustomize-controller, helm-controller, and notification-controller running.

## Step 3: Repository Structure

A typical Flux repository looks like this:

```
fleet-infra/
  clusters/
    my-cluster/
      flux-system/        # Flux self-management (auto-generated)
      apps.yaml           # Kustomization pointing to apps/
      infrastructure.yaml # Kustomization pointing to infrastructure/
  apps/
    base/
      my-app/
        deployment.yaml
        service.yaml
        kustomization.yaml
    production/
      kustomization.yaml
  infrastructure/
    sources/              # Helm repositories, Git sources
    controllers/          # Ingress controllers, cert-manager, etc.
```

## Step 4: Add a Git Source

Tell Flux to watch a Git repository for manifests:

```yaml
# clusters/my-cluster/apps.yaml - Point Flux at your app manifests
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  wait: true
  timeout: 5m
```

If your app manifests are in a separate repository:

```yaml
# clusters/my-cluster/app-source.yaml - External Git source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/my-app-manifests.git
  ref:
    branch: main
  secretRef:
    name: my-app-repo-auth
```

Create the authentication secret:

```bash
# Create a secret for private repository access
flux create secret git my-app-repo-auth \
  --url=https://github.com/your-org/my-app-manifests.git \
  --username=git \
  --password=$GITHUB_TOKEN
```

## Step 5: Deploy with Kustomize

Create a Kustomize overlay for your application:

```yaml
# apps/base/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
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
          image: 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app:1.0.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
```

```yaml
# apps/base/my-app/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base/my-app
patchesStrategicMerge:
  - replica-patch.yaml
```

```yaml
# apps/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
```

Commit and push these files, and Flux will automatically detect and apply them.

## Step 6: Deploy Helm Releases

Flux has excellent Helm support through the HelmRelease CRD. First, define a Helm repository source:

```yaml
# infrastructure/sources/bitnami.yaml - Helm repository source
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
```

Then create a HelmRelease:

```yaml
# apps/production/redis.yaml - Helm release for Redis
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: redis
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    architecture: standalone
    auth:
      enabled: true
      existingSecret: redis-auth
    master:
      resources:
        requests:
          cpu: 250m
          memory: 256Mi
    metrics:
      enabled: true
```

## Monitoring Flux

Check the status of your Flux resources:

```bash
# See all Flux resources and their status
flux get all

# Check specific Kustomization status
flux get kustomizations

# Check Helm release status
flux get helmreleases -A

# Watch for events
flux events --watch
```

## Image Automation

Flux can automatically update image tags in your Git repository when new container images are pushed:

```yaml
# image-repo.yaml - Watch ECR for new images
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app
  interval: 5m
---
# image-policy.yaml - Define which tags to follow
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: "1.x"
```

Add a marker comment in your deployment to tell Flux which field to update:

```yaml
# The marker comment tells Flux where to update the image tag
containers:
  - name: my-app
    image: 123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

## Notifications

Set up alerts for deployment events:

```yaml
# notification.yaml - Send Flux alerts to Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: slack-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: '*'
    - kind: HelmRelease
      name: '*'
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: eks-deployments
  secretRef:
    name: slack-webhook-url
```

Flux gives you a clean, Kubernetes-native way to implement GitOps on EKS. It takes a bit more YAML than ArgoCD to get started, but the composability and flexibility pay off as your cluster grows.
