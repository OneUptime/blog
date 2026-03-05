# How to Configure Kustomization CommonLabels in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Kustomization, Labels

Description: Learn how to use the commonLabels field in kustomization.yaml to automatically apply consistent labels across all Kubernetes resources managed by Flux.

---

## Introduction

Labels in Kubernetes serve as the primary mechanism for organizing, selecting, and querying resources. When managing many resources through Flux CD, manually adding labels to every manifest is tedious and error-prone. The `commonLabels` field in `kustomization.yaml` solves this by automatically injecting a set of labels into all resources and their selectors.

This guide shows you how to configure `commonLabels` within a Kustomize overlay that Flux manages through its Kustomization custom resource.

## How CommonLabels Works

When you define `commonLabels` in a `kustomization.yaml`, Kustomize adds those labels to:

- The `metadata.labels` field of every resource
- The `spec.selector.matchLabels` field of Deployments, StatefulSets, DaemonSets, and Jobs
- The `spec.template.metadata.labels` field of pod templates

This automatic injection ensures that selectors and pod labels stay consistent, which is critical for Kubernetes controllers to function correctly.

## Repository Structure

```
apps/
  webapp/
    base/
      deployment.yaml
      service.yaml
      kustomization.yaml
    overlays/
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
```

## Step 1: Create the Base Manifests

Define a simple deployment and service without environment-specific labels.

```yaml
# apps/webapp/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
        - name: webapp
          image: webapp:1.0.0
          ports:
            - containerPort: 8080
```

```yaml
# apps/webapp/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: webapp
spec:
  selector:
    app: webapp
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# apps/webapp/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

## Step 2: Add CommonLabels in Overlays

In the staging overlay, add labels that identify the environment and team.

```yaml
# apps/webapp/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

# These labels will be added to all resources and their selectors
commonLabels:
  environment: staging
  team: platform
  managed-by: flux
```

For production, use a different environment label.

```yaml
# apps/webapp/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonLabels:
  environment: production
  team: platform
  managed-by: flux
```

## Step 3: Verify the Output

Run `kustomize build` to see what the transformed manifests look like.

```bash
# Build the staging overlay
kustomize build apps/webapp/overlays/staging
```

The output for the Deployment will show that `commonLabels` have been injected into three places: resource metadata, selector matchLabels, and pod template labels.

```yaml
# Expected output (abbreviated)
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: webapp
    environment: staging       # added by commonLabels
    managed-by: flux           # added by commonLabels
    team: platform             # added by commonLabels
  name: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
      environment: staging     # added to selector
      managed-by: flux         # added to selector
      team: platform           # added to selector
  template:
    metadata:
      labels:
        app: webapp
        environment: staging   # added to pod template
        managed-by: flux       # added to pod template
        team: platform         # added to pod template
```

The Service selector will also include the common labels, ensuring it still matches the pods.

## Step 4: Configure Flux Kustomization

Point Flux at the overlay directories.

```yaml
# clusters/my-cluster/webapp-staging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp-staging
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/webapp/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: staging
```

```yaml
# clusters/my-cluster/webapp-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/webapp/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  targetNamespace: production
```

## Step 5: Reconcile and Verify

```bash
# Trigger reconciliation
flux reconcile kustomization webapp-staging --with-source

# Check that labels are applied to the deployment
kubectl get deployment webapp -n staging --show-labels

# Query resources by the common label
kubectl get all -n staging -l managed-by=flux

# Query resources by environment
kubectl get all -l environment=staging --all-namespaces
```

## Important Caveats

### Selector Immutability

Once a Deployment is created, Kubernetes does not allow changes to `spec.selector.matchLabels`. Because `commonLabels` injects labels into selectors, changing or removing a common label after the initial deployment will cause an error.

If you need labels that you might change later, use the `labels` transformer instead of `commonLabels`. The `labels` transformer (available in Kustomize v5+) lets you control whether labels are added to selectors.

```yaml
# Using the labels transformer for more control
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

labels:
  - pairs:
      environment: staging
      team: platform
    # Do not include these labels in selectors
    includeSelectors: false
  - pairs:
      managed-by: flux
    # Include this label in selectors
    includeSelectors: true
```

### Labels vs CommonLabels

| Feature | `commonLabels` | `labels` transformer |
|---------|---------------|---------------------|
| Adds to metadata.labels | Yes | Yes |
| Adds to selectors | Always | Configurable |
| Adds to pod templates | Always | Configurable |
| Safe to change after deploy | No (selector change fails) | Yes (if includeSelectors: false) |

## Using CommonLabels with Flux Postbuild Substitution

You can combine `commonLabels` with Flux variable substitution to dynamically set label values.

```yaml
# apps/webapp/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

commonLabels:
  environment: staging
  team: platform
  app-version: "${APP_VERSION}"
```

Then configure Flux to substitute the variable.

```yaml
# clusters/my-cluster/webapp-staging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: webapp-staging
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/webapp/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      APP_VERSION: "1.2.3"
```

## Conclusion

The `commonLabels` field in `kustomization.yaml` provides a straightforward way to apply consistent labels across all resources in a Flux-managed deployment. Use it for labels that are stable and should be included in selectors. For labels that might change over time, prefer the `labels` transformer with `includeSelectors: false` to avoid issues with Kubernetes selector immutability.
