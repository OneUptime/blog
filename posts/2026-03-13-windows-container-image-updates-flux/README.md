# How to Handle Windows Container Image Updates with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, Image Automation, GitOps, Rolling Updates

Description: Automate Windows container image updates using Flux image automation, handling the specific challenges of large Windows images and slower rollout times.

---

## Introduction

Windows container images are significantly larger than their Linux counterparts — a Windows Server Core IIS image can be 6-8GB, while a comparable Linux NGINX image is under 200MB. This size difference has significant implications for how you manage image updates: pulls take longer, rolling updates take more time, and registry storage costs are higher.

Flux CD's image automation system can automatically update Windows container image tags in Git when new images are published, following the same GitOps workflow as Linux workloads. However, the automation configuration needs adjustment for Windows-specific timing constraints and image pull behavior.

This guide covers configuring Flux image automation for Windows containers, setting appropriate update policies, and handling the rollout timing differences unique to Windows workloads.

## Prerequisites

- Flux CD with image automation components installed (`image-reflector-controller`, `image-automation-controller`)
- Container registry with Windows container images
- Kubernetes cluster with Windows nodes
- Git repository with Windows workload manifests
- `flux` and `kubectl` CLI tools

## Step 1: Enable Image Automation Components

Ensure image automation controllers are installed. They may not be included in minimal edge deployments.

```bash
# Check if image automation is installed
kubectl get deployment -n flux-system | grep -E "image-reflector|image-automation"

# If not present, upgrade the Flux installation to include them
flux install \
  --components-extra=image-reflector-controller,image-automation-controller

# Verify installation
flux check
```

## Step 2: Configure ImageRepository for Windows Images

```yaml
# apps/base/windows-workloads/iis-app/imagerepository.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: iis-app
  namespace: flux-system
spec:
  image: my-registry.example.com/windows/iis-app
  # Scan less frequently - Windows images are large and scanning is expensive
  interval: 15m
  # Generous timeout for slow registry responses
  timeout: 60s
  secretRef:
    name: registry-credentials
  # Filter to only Windows-specific tags
  exclusionList:
    - ".*-linux.*"  # Exclude any linux-tagged images
    - ".*-arm64.*"  # Exclude ARM images
```

## Step 3: Configure ImagePolicy for Windows Workloads

```yaml
# apps/base/windows-workloads/iis-app/imagepolicy.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: iis-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: iis-app
  # Use semver to control which updates are applied automatically
  policy:
    semver:
      range: ">=2.0.0 <3.0.0"  # Auto-update within v2.x, not to v3+
```

## Step 4: Annotate Deployment for Automatic Tag Updates

Mark the image tag in your deployment manifest with a Flux automation marker.

```yaml
# apps/base/windows-workloads/iis-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app
  namespace: windows-workloads
spec:
  template:
    spec:
      containers:
        - name: iis-app
          # {"$imagepolicy": "flux-system:iis-app"}
          image: my-registry.example.com/windows/iis-app:v2.1.0
          imagePullPolicy: IfNotPresent
          # ... rest of container spec
```

The `# {"$imagepolicy": "flux-system:iis-app"}` comment tells Flux image automation where to update the image tag when a new one is detected.

## Step 5: Configure ImageUpdateAutomation

```yaml
# clusters/production/flux-system/image-update-automation.yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: windows-image-updates
  namespace: flux-system
spec:
  sourceRef:
    kind: GitRepository
    name: flux-system

  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Image Automation
        email: flux@example.com
      messageTemplate: |
        ci: update Windows image {{ range .Updated.Images -}}
        {{ .NewImage }} {{ end -}}
        [skip ci]
    push:
      branch: main

  update:
    strategy: Setters
    path: ./apps/base/windows-workloads
```

## Step 6: Handle Windows Rolling Update Timing

Windows container image pulls are slow. Configure deployment update strategy to account for this.

```yaml
# apps/base/windows-workloads/iis-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app
  namespace: windows-workloads
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      # Only update one pod at a time for large Windows images
      maxSurge: 1
      maxUnavailable: 0  # Ensure zero downtime

  # Progress deadline - Windows pulls can take 5+ minutes
  progressDeadlineSeconds: 600  # 10 minutes

  template:
    spec:
      containers:
        - name: iis-app
          image: my-registry.example.com/windows/iis-app:v2.1.0
          imagePullPolicy: IfNotPresent  # CRITICAL: use cached image when possible

          readinessProbe:
            httpGet:
              path: /health
              port: 80
            # Allow plenty of time for new pod to become ready
            initialDelaySeconds: 90
            periodSeconds: 15
            timeoutSeconds: 10
            failureThreshold: 8  # More retries for slow Windows startup
```

Update the Flux Kustomization timeout to match:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: iis-app
  namespace: flux-system
spec:
  interval: 5m
  timeout: 30m    # Windows rolling updates with image pulls can take 20-30 min
  path: ./apps/base/windows-workloads/iis-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 7: Monitor Windows Image Update Progress

```bash
# Watch the image automation status
flux get imagerepositories -A
flux get imagepolicies -A
flux get imageupdateautomations -A

# Monitor rolling update progress
kubectl rollout status deployment/iis-app -n windows-workloads --timeout=30m

# Check if pods are pulling the new image
kubectl get pods -n windows-workloads -o wide
kubectl describe pod iis-app-xxx -n windows-workloads | \
  grep -A 10 Events | grep -E "Pulling|Pulled|Started"

# Monitor image pull progress on Windows nodes
kubectl get events -n windows-workloads --field-selector reason=Pulling
```

## Best Practices

- Use `imagePullPolicy: IfNotPresent` for Windows workloads — avoid re-pulling the same 6-8GB image unnecessarily.
- Set `progressDeadlineSeconds` to at least 600 (10 minutes) for Windows deployments to account for image pull time.
- Configure `maxSurge: 1, maxUnavailable: 0` for rolling updates to avoid overloading Windows nodes with simultaneous pulls.
- Use semver ranges in ImagePolicy to control automatic update scope — avoid `>=0.0.0` which would auto-apply major versions.
- Pre-pull Windows images onto nodes during maintenance windows rather than at deployment time.
- Monitor registry storage costs — Windows images have large layer sizes that add up quickly with many versions.

## Conclusion

Flux image automation for Windows containers follows the same GitOps workflow as Linux workloads but requires tuning for the realities of large image sizes and slower startup times. With appropriate timeouts, conservative rolling update settings, and `IfNotPresent` pull policies, Windows image updates roll out reliably without manual intervention. The complete automation loop — detect new image, commit to Git, reconcile to cluster — works identically for Windows and Linux workloads once the timing parameters are correctly set.
