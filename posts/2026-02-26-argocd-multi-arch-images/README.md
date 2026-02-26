# How to Make ArgoCD Work with Multi-Arch Images

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Docker, Multi-Architecture

Description: Configure ArgoCD to deploy multi-architecture container images across mixed ARM64 and AMD64 Kubernetes clusters with proper node scheduling.

---

As Kubernetes clusters increasingly mix ARM64 and AMD64 nodes - especially with AWS Graviton, Apple Silicon development machines, and Azure Ampere instances - your ArgoCD-managed deployments need to handle multi-architecture images properly. The good news is that ArgoCD itself does not need special configuration for multi-arch. The work is in how you build your images and structure your Kubernetes manifests.

Let me walk through the complete setup.

## Understanding Multi-Arch in Kubernetes

Kubernetes nodes report their architecture through the `kubernetes.io/arch` label. When you schedule a pod, the container runtime pulls the appropriate image variant for the node's architecture. This works automatically if your container images are built as multi-arch manifest lists.

```bash
# Check the architecture of your nodes
kubectl get nodes -L kubernetes.io/arch

# Output example:
# NAME           STATUS   ROLES    AGE   VERSION   ARCH
# node-1         Ready    <none>   10d   v1.28.0   amd64
# node-2         Ready    <none>   10d   v1.28.0   arm64
# node-3         Ready    <none>   10d   v1.28.0   amd64
```

## Step 1: Build Multi-Arch Container Images

The foundation is building your container images for multiple architectures. Use Docker Buildx to create multi-arch images.

```bash
# Create a multi-arch builder
docker buildx create --name multiarch --driver docker-container --use

# Build and push a multi-arch image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myregistry.com/myapp:v1.0.0 \
  --push .
```

Verify the image supports multiple architectures.

```bash
# Inspect the image manifest
docker manifest inspect myregistry.com/myapp:v1.0.0

# Or use crane
crane manifest myregistry.com/myapp:v1.0.0 | jq '.manifests[].platform'
```

The output should show both `amd64` and `arm64` variants.

## Step 2: Configure ArgoCD Deployments for Mixed Clusters

When your cluster has both AMD64 and ARM64 nodes, your Kubernetes manifests managed by ArgoCD need to account for node architecture.

### Option A: Use Multi-Arch Images (Recommended)

If all your images are built as multi-arch manifest lists, you do not need any special node affinity or scheduling configuration. Kubernetes handles it automatically.

```yaml
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
    spec:
      containers:
        - name: myapp
          # Multi-arch image - works on both amd64 and arm64
          image: myregistry.com/myapp:v1.0.0
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

### Option B: Pin to Specific Architecture

If some images only support one architecture, use node affinity to ensure pods are scheduled on compatible nodes.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-amd64-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: legacy-app
  template:
    spec:
      # Only schedule on AMD64 nodes
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
        - name: legacy-app
          image: myregistry.com/legacy-app:v2.0.0
```

### Option C: Use Topology Spread with Architecture Awareness

For high availability across architectures, use topology spread constraints.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 4
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/arch
          whenUnsatisfiable: ScheduleAnyway
          labelSelector:
            matchLabels:
              app: myapp
      containers:
        - name: myapp
          image: myregistry.com/myapp:v1.0.0
```

## Step 3: Handle Helm Charts with Multi-Arch

When managing Helm deployments through ArgoCD, you can pass architecture-specific values through the Application spec.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-production
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/my-org/helm-charts.git
    targetRevision: main
    path: charts/myapp
    helm:
      values: |
        image:
          repository: myregistry.com/myapp
          tag: v1.0.0
        # Use node affinity for mixed clusters
        nodeSelector:
          kubernetes.io/arch: amd64
  destination:
    server: https://kubernetes.default.svc
    namespace: production
```

For clusters that are entirely ARM64 (like Graviton-only EKS clusters), you might want a different values file.

```yaml
# values-arm64.yaml
image:
  repository: myregistry.com/myapp
  tag: v1.0.0
nodeSelector:
  kubernetes.io/arch: arm64
tolerations:
  - key: "arch"
    operator: "Equal"
    value: "arm64"
    effect: "NoSchedule"
```

Reference it in your ArgoCD Application.

```yaml
spec:
  source:
    helm:
      valueFiles:
        - values.yaml
        - values-arm64.yaml
```

## Step 4: ArgoCD Image Updater with Multi-Arch

If you use the ArgoCD Image Updater to automatically update image tags, it works with multi-arch images without any special configuration. The Image Updater checks for new tags and updates the Git repository - it does not care about the image architecture.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    argocd-image-updater.argoproj.io/image-list: myapp=myregistry.com/myapp
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
spec:
  # ...
```

However, make sure your CI pipeline builds multi-arch images for every tag. If a new tag only has an AMD64 image, ARM64 nodes will fail to pull it.

## Step 5: CI Pipeline for Multi-Arch Images

Here is a GitHub Actions workflow that builds multi-arch images and triggers ArgoCD sync.

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU for multi-arch builds
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: myregistry.com
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push multi-arch image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: myregistry.com/myapp:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Troubleshooting Multi-Arch Issues

**Pods stuck in ImagePullBackOff**: Check if the image supports the node's architecture.

```bash
# Check which node the pod is scheduled on and its arch
kubectl get pod myapp-xxx -o jsonpath='{.spec.nodeName}'
kubectl get node <node-name> -L kubernetes.io/arch

# Check the image manifest
crane manifest myregistry.com/myapp:v1.0.0 | jq '.manifests[].platform.architecture'
```

**Performance differences between architectures**: ARM64 and AMD64 can have different performance characteristics. Monitor resource usage across architectures and adjust resource requests accordingly.

**Init containers with wrong architecture**: Remember that init containers also need multi-arch support. A common mistake is having a multi-arch main container but an AMD64-only init container.

```yaml
spec:
  initContainers:
    - name: init
      # Make sure this is also multi-arch
      image: myregistry.com/init-container:v1.0.0
  containers:
    - name: myapp
      image: myregistry.com/myapp:v1.0.0
```

## Monitoring Multi-Arch Deployments

Use [OneUptime](https://oneuptime.com) to monitor your multi-arch deployments. Set up separate monitoring for pods running on different architectures to catch architecture-specific issues early. Performance baselines may differ between ARM64 and AMD64, so having per-architecture monitoring helps identify when one architecture is underperforming.

Multi-arch support in ArgoCD is mostly about getting your images and manifests right. ArgoCD itself is architecture-agnostic - it just deploys whatever manifests you give it. Focus on building proper multi-arch images and using the right scheduling constraints, and ArgoCD will handle the rest.
