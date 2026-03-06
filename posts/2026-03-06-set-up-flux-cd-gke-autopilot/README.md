# How to Set Up Flux CD on GKE Autopilot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, gke autopilot, gcp, kubernetes, gitops, google cloud

Description: A practical guide to installing and configuring Flux CD on GKE Autopilot, addressing resource constraints and Autopilot-specific limitations.

---

## Introduction

GKE Autopilot is a fully managed Kubernetes mode where Google manages the nodes, scaling, and security configuration. While Autopilot simplifies cluster operations, it introduces constraints that affect how you deploy Flux CD. This guide covers the specific adjustments needed to run Flux CD reliably on GKE Autopilot.

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- `kubectl` installed
- Flux CLI installed (`flux` version 2.x)
- A GitHub or GitLab repository for Flux bootstrap

## Understanding GKE Autopilot Constraints

GKE Autopilot enforces several restrictions that affect Flux CD.

| Constraint | Impact on Flux CD |
|---|---|
| Resource requests are required | All Flux pods must have explicit resource requests |
| No privileged containers | Flux controllers run unprivileged by default, so this is fine |
| No host network/PID access | Not needed by Flux |
| Minimum resource requests | Pods must request at least 50m CPU and 52Mi memory |
| Compute class limitations | Affects scheduling of Flux controller pods |
| No DaemonSets by default | Not needed by Flux |

## Step 1: Create a GKE Autopilot Cluster

```bash
# Create a GKE Autopilot cluster
gcloud container clusters create-auto flux-autopilot \
  --region us-central1 \
  --project my-project-id \
  --release-channel regular

# Get credentials for kubectl
gcloud container clusters get-credentials flux-autopilot \
  --region us-central1 \
  --project my-project-id
```

Verify the cluster is running.

```bash
# Confirm cluster access
kubectl cluster-info

# Verify Autopilot mode
gcloud container clusters describe flux-autopilot \
  --region us-central1 \
  --format="value(autopilot.enabled)"
```

## Step 2: Create a GitHub Personal Access Token

Flux bootstrap requires a Git provider token.

```bash
# Export your GitHub token
export GITHUB_TOKEN=<your-github-personal-access-token>
export GITHUB_USER=<your-github-username>
```

## Step 3: Bootstrap Flux CD on Autopilot

Bootstrap Flux with resource limits configured for Autopilot.

```bash
# Bootstrap Flux CD on the Autopilot cluster
flux bootstrap github \
  --owner=${GITHUB_USER} \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/autopilot-cluster \
  --personal
```

After bootstrap, check the initial status.

```bash
# Check Flux components
flux check

# View all Flux pods
kubectl get pods -n flux-system
```

## Step 4: Adjust Resource Requests for Autopilot

GKE Autopilot may scale up resource requests to meet its minimum requirements. To avoid unexpected scaling, explicitly set appropriate resource requests for Flux controllers.

Create patch files in your Flux repository.

```yaml
# clusters/autopilot-cluster/flux-system/patches/resource-patches.yaml
# Patch source-controller resources for Autopilot
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              # Autopilot rounds up to nearest compute class
              cpu: 250m
              memory: 256Mi
              ephemeral-storage: 1Gi
            limits:
              cpu: 1000m
              memory: 1Gi
              ephemeral-storage: 4Gi
---
# Patch kustomize-controller resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
              ephemeral-storage: 1Gi
            limits:
              cpu: 1000m
              memory: 1Gi
              ephemeral-storage: 4Gi
---
# Patch helm-controller resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
              ephemeral-storage: 1Gi
            limits:
              cpu: 1000m
              memory: 1Gi
              ephemeral-storage: 4Gi
---
# Patch notification-controller resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
              ephemeral-storage: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
              ephemeral-storage: 1Gi
```

## Step 5: Update the Flux System Kustomization

Modify the kustomization to include the patches.

```yaml
# clusters/autopilot-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: patches/resource-patches.yaml
    target:
      kind: Deployment
      namespace: flux-system
```

## Step 6: Configure Flux for Autopilot Security Policies

GKE Autopilot enforces a restricted security profile. Ensure Flux controllers comply with these policies.

```yaml
# clusters/autopilot-cluster/flux-system/patches/security-patches.yaml
# Ensure all Flux controllers have appropriate security contexts
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      securityContext:
        # Run as non-root (required by Autopilot)
        runAsNonRoot: true
        runAsUser: 65534
        fsGroup: 65534
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: manager
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

## Step 7: Deploy a Sample Application

Create a sample application deployment managed by Flux.

```yaml
# apps/autopilot-demo/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: demo-app
---
# apps/autopilot-demo/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: demo-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: demo-app
  template:
    metadata:
      labels:
        app: demo-app
    spec:
      containers:
        - name: app
          image: nginx:1.25
          # Resource requests are mandatory on Autopilot
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
              ephemeral-storage: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
              ephemeral-storage: 512Mi
          ports:
            - containerPort: 80
---
# apps/autopilot-demo/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: demo-app
  namespace: demo-app
spec:
  selector:
    app: demo-app
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP
```

Create the Flux Kustomization for the app.

```yaml
# clusters/autopilot-cluster/demo-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: demo-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/autopilot-demo
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  wait: true
```

## Step 8: Configure Image Automation with Artifact Registry

Set up Flux image automation with Google Artifact Registry.

```yaml
# infrastructure/image-automation/image-repository.yaml
# Watch for new images in Artifact Registry
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: demo-app
  namespace: flux-system
spec:
  image: us-central1-docker.pkg.dev/my-project-id/my-repo/demo-app
  interval: 5m
  # Use GKE Workload Identity for authentication
  provider: gcp
---
# infrastructure/image-automation/image-policy.yaml
# Automatically select the latest semver tag
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: demo-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: demo-app
  policy:
    semver:
      range: ">=1.0.0"
```

## Step 9: Monitor Flux on Autopilot

Check the resource consumption and health of Flux controllers.

```bash
# View actual resource allocation by Autopilot
kubectl get pods -n flux-system -o custom-columns=\
NAME:.metadata.name,\
CPU_REQ:.spec.containers[0].resources.requests.cpu,\
MEM_REQ:.spec.containers[0].resources.requests.memory,\
STATUS:.status.phase

# Check Flux reconciliation status
flux get all

# View Flux controller logs
flux logs --all-namespaces --since=1h

# Verify all kustomizations are healthy
flux get kustomizations -A
```

## Step 10: Optimize Costs on Autopilot

Reduce Flux resource usage to minimize Autopilot costs.

```yaml
# clusters/autopilot-cluster/flux-system/patches/optimization.yaml
# Increase reconciliation intervals for less critical resources
# to reduce controller CPU usage
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  # Increase interval for the root kustomization
  # since infrastructure changes are infrequent
  interval: 30m
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  # Reduce git polling frequency
  interval: 5m
  # Use shallow clone to reduce memory usage
  ref:
    branch: main
```

## Troubleshooting

### Pods Stuck in Pending State

Autopilot needs to provision nodes for your pods. This can take 1-2 minutes.

```bash
# Check pod events for scheduling issues
kubectl describe pod -n flux-system -l app=source-controller

# Verify resource requests are within Autopilot limits
kubectl get pods -n flux-system -o yaml | grep -A 5 "resources:"
```

### Ephemeral Storage Errors

Autopilot requires explicit ephemeral storage requests.

```bash
# Check if pods are being evicted due to storage
kubectl get events -n flux-system \
  --field-selector reason=Evicted
```

### Workload Identity Authentication Issues

```bash
# Verify Workload Identity is configured correctly
kubectl get serviceaccount -n flux-system -o yaml | \
  grep "iam.gke.io/gcp-service-account"

# Test GCP authentication from a Flux controller pod
kubectl exec -n flux-system deploy/source-controller -- \
  cat /var/run/secrets/kubernetes.io/serviceaccount/token
```

## Summary

You have successfully set up Flux CD on GKE Autopilot. The key considerations are ensuring all pods have explicit resource requests (including ephemeral storage), complying with Autopilot security policies, and using Workload Identity for GCP service authentication. With these adjustments, Flux CD runs reliably on Autopilot while benefiting from its fully managed node infrastructure, automatic scaling, and built-in security hardening.
