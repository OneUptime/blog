# How to Set Up Flux CD on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Flux CD, GitOps, Kubernetes, Continuous Delivery, Git

Description: Deploy and configure Flux CD on Talos Linux for GitOps-driven continuous delivery of your Kubernetes workloads.

---

Flux CD is a GitOps toolkit for Kubernetes that keeps your cluster state synchronized with a Git repository. Instead of running kubectl apply commands manually, you commit changes to Git and Flux automatically applies them to your cluster. This approach is particularly well-suited to Talos Linux because Talos itself is already built around declarative configuration. Extending that philosophy to your workloads with Flux creates a fully declarative infrastructure stack. In this guide, we will install Flux on a Talos Linux cluster and set up a complete GitOps workflow.

## Why GitOps on Talos Linux

Talos Linux is configured through machine configuration files. You cannot SSH in and make changes. This declarative approach is exactly what GitOps brings to the workload side of things. With Flux:

- All cluster changes are tracked in Git with full audit history
- Deployments are automatic when you merge a pull request
- Rolling back is as simple as reverting a Git commit
- Multiple environments can be managed from branching strategies
- No need to distribute kubectl credentials to developers

## Prerequisites

Before starting, you need:

- A Talos Linux Kubernetes cluster with kubectl access
- A Git repository (GitHub, GitLab, or Bitbucket) for storing manifests
- The Flux CLI installed on your workstation
- A personal access token for your Git provider

## Step 1: Install the Flux CLI

```bash
# Install Flux CLI on macOS
brew install fluxcd/tap/flux

# Install on Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify the installation
flux --version

# Check cluster compatibility
flux check --pre
```

## Step 2: Bootstrap Flux on Your Cluster

Bootstrapping installs Flux components and creates the Git repository structure:

```bash
# Export your GitHub personal access token
export GITHUB_TOKEN=<your-token>
export GITHUB_USER=<your-username>

# Bootstrap Flux with GitHub
flux bootstrap github \
  --owner=$GITHUB_USER \
  --repository=talos-fleet \
  --branch=main \
  --path=./clusters/production \
  --personal
```

This command does several things:

1. Creates the `talos-fleet` repository if it does not exist
2. Installs Flux controllers in the `flux-system` namespace
3. Creates a `GitRepository` source pointing to the repo
4. Creates a `Kustomization` that syncs the `clusters/production` path

Verify the installation:

```bash
# Check Flux components
flux check

# View all Flux resources
kubectl get all -n flux-system

# Check the GitRepository source
flux get sources git
```

## Step 3: Organize Your Repository

A well-structured repository makes multi-environment management easier:

```text
talos-fleet/
  /clusters/
    /production/
      /infrastructure.yaml    # Kustomization for infrastructure
      /apps.yaml              # Kustomization for applications
    /staging/
      /infrastructure.yaml
      /apps.yaml
  /infrastructure/
    /controllers/
      /ingress-nginx/
        /kustomization.yaml
        /release.yaml
        /namespace.yaml
      /cert-manager/
        /kustomization.yaml
        /release.yaml
        /namespace.yaml
    /configs/
      /cluster-issuer.yaml
  /apps/
    /base/
      /frontend/
        /deployment.yaml
        /service.yaml
        /kustomization.yaml
      /backend/
        /deployment.yaml
        /service.yaml
        /kustomization.yaml
    /production/
      /kustomization.yaml    # Patches for production
    /staging/
      /kustomization.yaml    # Patches for staging
```

## Step 4: Set Up Infrastructure Components

Create a Kustomization that deploys infrastructure components first:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure-controllers
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/controllers
  prune: true
  wait: true
```

Define a HelmRelease for ingress-nginx:

```yaml
# infrastructure/controllers/ingress-nginx/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ingress-nginx
---
# infrastructure/controllers/ingress-nginx/release.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.*"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
      interval: 12h
  values:
    controller:
      replicaCount: 2
      service:
        type: LoadBalancer
```

## Step 5: Deploy Applications

Create a Kustomization for your applications:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  dependsOn:
    - name: infrastructure-controllers
```

Define your application manifests:

```yaml
# apps/base/frontend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: myregistry/frontend:1.0.0
          ports:
            - containerPort: 3000
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
---
# apps/base/frontend/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: default
spec:
  selector:
    app: frontend
  ports:
    - port: 80
      targetPort: 3000
---
# apps/base/frontend/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

Create production overlays:

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base/frontend
  - ../base/backend
patches:
  - target:
      kind: Deployment
      name: frontend
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
```

## Step 6: Set Up Image Automation

Flux can automatically update image tags when new versions are pushed to your container registry:

```yaml
# clusters/production/image-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: frontend
  namespace: flux-system
spec:
  image: myregistry/frontend
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: frontend
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: frontend
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@users.noreply.github.com
      messageTemplate: "Automated image update"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

Add markers to your deployment manifest:

```yaml
containers:
  - name: frontend
    image: myregistry/frontend:1.0.0 # {"$imagepolicy": "flux-system:frontend"}
```

## Step 7: Monitor Flux Health

Check the status of your Flux resources:

```bash
# View all Flux resources and their status
flux get all

# Check specific resource types
flux get sources git
flux get kustomizations
flux get helmreleases

# View Flux events
flux events

# Check reconciliation logs
flux logs --follow
```

Set up Prometheus monitoring for Flux:

```yaml
# flux-monitoring.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
      - flux-system
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  endpoints:
    - port: http-prom
```

## Step 8: Handle Secrets

Flux integrates with Mozilla SOPS and Sealed Secrets for managing secrets in Git:

```bash
# Install SOPS and age for secret encryption
brew install sops age

# Generate an age key
age-keygen -o age.agekey

# Create a Kubernetes secret with the age key
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=age.agekey
```

Configure your Kustomization to decrypt secrets:

```yaml
spec:
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Conclusion

Flux CD brings the same declarative, Git-driven philosophy to your Kubernetes workloads that Talos Linux brings to your operating system. Once set up, your entire stack from OS configuration to application deployments is defined in code and version-controlled. Changes flow through pull requests, giving you review processes, audit trails, and easy rollbacks. Start with a simple repository structure and add complexity as needed with image automation, multi-environment overlays, and encrypted secrets. The result is a Talos Linux cluster that is fully reproducible and manageable through Git.
