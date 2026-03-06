# How to Migrate from Kustomize CLI to Flux CD Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kustomize, Migration, Kubernetes, GitOps, Kustomization, Deployment

Description: A hands-on guide to migrating from manual kustomize build and apply workflows to automated Flux CD Kustomization resources.

---

## Introduction

Kustomize is a powerful tool for customizing Kubernetes manifests without templating. Many teams use it with `kustomize build | kubectl apply` or `kubectl apply -k` to deploy applications. While this works, it relies on manual or scripted execution. By migrating to Flux CD Kustomization resources, you get automatic reconciliation, drift detection, and a full GitOps workflow built on top of your existing Kustomize overlays.

## Why Migrate

The Kustomize CLI workflow has limitations:

- **Manual execution**: Someone must run the command or trigger a pipeline
- **No drift detection**: Manual changes in the cluster are not corrected
- **No dependency management**: You must manually order deployments
- **Limited visibility**: No built-in status reporting or health checks

Flux CD Kustomization adds:

- Automatic reconciliation at configurable intervals
- Drift detection and correction
- Dependency ordering between Kustomizations
- Health checks and status reporting
- Pruning of removed resources

## Prerequisites

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify Kustomize is installed (for testing)
kustomize version

# Check cluster prerequisites
flux check --pre
```

## Step 1: Audit Your Current Kustomize Structure

Document your existing Kustomize overlays and the commands used to apply them.

```bash
# Typical Kustomize directory structure:
# base/
#   deployment.yaml
#   service.yaml
#   kustomization.yaml
# overlays/
#   development/
#     kustomization.yaml
#     replicas-patch.yaml
#   staging/
#     kustomization.yaml
#     replicas-patch.yaml
#     ingress.yaml
#   production/
#     kustomization.yaml
#     replicas-patch.yaml
#     ingress.yaml
#     hpa.yaml

# Typical deployment commands:
# kustomize build overlays/production | kubectl apply -f -
# or
# kubectl apply -k overlays/production
```

### Example Base Kustomization

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
commonLabels:
  app: my-app
```

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
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
          image: myregistry/my-app:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

```yaml
# base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-app
```

### Example Production Overlay

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - ingress.yaml
  - hpa.yaml
# Production-specific patches
patches:
  - path: replicas-patch.yaml
  - path: resources-patch.yaml
# Production namespace
namespace: production
# Production-specific labels
commonLabels:
  environment: production
# Production image tag
images:
  - name: myregistry/my-app
    newTag: "1.5.2"
```

```yaml
# overlays/production/replicas-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
```

```yaml
# overlays/production/resources-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 1Gi
```

```yaml
# overlays/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - my-app.example.com
      secretName: my-app-tls
  rules:
    - host: my-app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

```yaml
# overlays/production/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 5
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Step 2: Bootstrap Flux CD

Bootstrap Flux into your cluster.

```bash
# Bootstrap Flux with your Git repository
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-config \
  --path=clusters/production \
  --branch=main \
  --personal

# Verify Flux is running
flux check
```

## Step 3: Create Flux Kustomization Resources

The key difference is that Flux uses its own `Kustomization` CRD (from `kustomize.toolkit.fluxcd.io`) which wraps and extends the native Kustomize `kustomization.yaml` files. Your existing Kustomize files remain unchanged.

```yaml
# clusters/production/apps/my-app.yaml
# Flux Kustomization that points to your Kustomize overlay
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  # Reconciliation interval
  interval: 10m
  # Retry on failure
  retryInterval: 2m
  # Source Git repository
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Path to the Kustomize overlay directory
  # Flux will automatically run kustomize build on this path
  path: ./overlays/production
  # Delete resources when they are removed from Git
  prune: true
  # Wait for resources to be ready
  wait: true
  # Timeout for health checks
  timeout: 5m
  # Force apply to resolve conflicts
  force: false
```

That is it for basic migration. Flux will run `kustomize build` on the specified path and apply the result, just like running `kustomize build overlays/production | kubectl apply -f -` but automatically and continuously.

## Step 4: Handle Multiple Applications

If you have multiple applications with Kustomize overlays, create a Flux Kustomization for each.

```yaml
# clusters/production/apps/frontend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/frontend/overlays/production
  prune: true
  wait: true
  timeout: 5m
---
# clusters/production/apps/backend.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/backend/overlays/production
  prune: true
  wait: true
  timeout: 5m
---
# clusters/production/apps/worker.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: worker
  namespace: flux-system
spec:
  interval: 10m
  # Worker depends on the backend being deployed first
  dependsOn:
    - name: backend
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/worker/overlays/production
  prune: true
  wait: true
  timeout: 5m
```

## Step 5: Add Dependencies Between Kustomizations

Flux Kustomizations support dependency ordering, which replaces manual sequencing of `kubectl apply` commands.

```yaml
# clusters/production/infrastructure.yaml
# Infrastructure must be deployed before applications
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/production
  prune: true
  wait: true
  timeout: 10m
  # Health checks to verify infrastructure is ready
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-nginx-controller
      namespace: ingress-nginx
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
---
# clusters/production/apps.yaml
# Applications depend on infrastructure
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  # Wait for infrastructure to be ready
  dependsOn:
    - name: infrastructure
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
  wait: true
  timeout: 10m
```

## Step 6: Use Flux-Specific Kustomize Features

Flux extends native Kustomize with additional capabilities through its Kustomization CRD.

### Post-Build Variable Substitution

Replace environment-specific values without modifying the base manifests.

```yaml
# clusters/production/apps/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./overlays/production
  prune: true
  # Substitute variables after kustomize build
  postBuild:
    substitute:
      CLUSTER_NAME: production-us-east-1
      DOMAIN: prod.example.com
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
      - kind: Secret
        name: cluster-secrets
```

```yaml
# In your manifests, use ${VARIABLE} syntax
# overlays/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
spec:
  rules:
    - host: my-app.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

### Decryption for Secrets

```yaml
# clusters/production/apps/my-app.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./overlays/production
  prune: true
  # Enable SOPS decryption for encrypted secrets
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

## Step 7: Replace CI/CD Pipeline Commands

Update your CI/CD pipelines to remove `kustomize build | kubectl apply` commands.

```yaml
# BEFORE: CI/CD pipeline with kustomize CLI
# .github/workflows/deploy.yaml
# jobs:
#   deploy:
#     steps:
#       - run: kustomize build overlays/production | kubectl apply -f -

# AFTER: CI/CD pipeline that pushes changes to Git
# .github/workflows/deploy.yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Update image tag in overlay
        run: |
          cd overlays/production
          kustomize edit set image myregistry/my-app:${GITHUB_SHA::8}
      - name: Commit and push
        run: |
          git config user.name "CI Bot"
          git config user.email "ci@example.com"
          git add overlays/production/kustomization.yaml
          git commit -m "Update my-app to ${GITHUB_SHA::8}"
          git push origin main
          # Flux will automatically detect and apply the change
```

## Step 8: Verify the Migration

```bash
# Check that Flux Kustomizations are reconciling
flux get kustomizations -A

# Verify the resources are being applied correctly
# Compare kustomize build output with what is in the cluster
kustomize build overlays/production | kubectl diff -f -

# Force a reconciliation
flux reconcile kustomization my-app -n flux-system --with-source

# Check for any errors
flux get kustomization my-app -n flux-system

# Watch reconciliation in real time
flux get kustomization my-app -w
```

## Step 9: Test Drift Detection

Verify that Flux detects and corrects manual changes.

```bash
# Make a manual change
kubectl scale deployment my-app -n production --replicas=1

# Wait for the next reconciliation cycle (or force it)
flux reconcile kustomization my-app -n flux-system

# Verify replicas are restored to the value defined in Git
kubectl get deployment my-app -n production -o jsonpath='{.spec.replicas}'
# Should show 5 (from the production overlay patch)
```

## Comparison Summary

| Feature | Kustomize CLI | Flux CD Kustomization |
|---|---|---|
| Build and apply | Manual / scripted | Automatic |
| Drift detection | None | Built-in |
| Dependency ordering | Manual | declarative `dependsOn` |
| Pruning | Manual cleanup | Automatic with `prune: true` |
| Health checks | None | Built-in |
| Secret management | External tools | SOPS integration |
| Variable substitution | Not available | `postBuild.substitute` |
| Retry on failure | Must script | Built-in `retryInterval` |

## Conclusion

Migrating from the Kustomize CLI to Flux CD Kustomization resources is straightforward because Flux natively supports Kustomize overlays. Your existing `kustomization.yaml` files and overlay structure remain unchanged. You simply create Flux Kustomization resources that point to your overlay paths, and Flux handles the build, apply, health checking, and drift correction automatically. This migration adds GitOps automation to your existing Kustomize workflow with minimal changes to your manifest structure.
