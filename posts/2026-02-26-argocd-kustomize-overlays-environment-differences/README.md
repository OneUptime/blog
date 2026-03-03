# How to Use Kustomize Overlays for Environment Differences in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize, Environment Management

Description: Learn how to use Kustomize overlays with ArgoCD to manage configuration differences across dev, staging, and production environments without duplicating manifests.

---

Managing multiple environments - dev, staging, and production - is one of the most common challenges in Kubernetes. You need the same application running in each environment but with different resource limits, replica counts, image tags, and configuration values. Kustomize overlays solve this elegantly, and when combined with ArgoCD, you get a fully automated GitOps pipeline that keeps every environment in sync with its Git-defined state.

## Why Kustomize Overlays Work Well with ArgoCD

Kustomize is built into kubectl and ArgoCD supports it natively. Unlike Helm, which uses templating, Kustomize uses a patching approach. You define a base set of manifests and then layer environment-specific patches on top. This means your base manifests are valid Kubernetes YAML at all times - no template syntax to debug.

ArgoCD detects Kustomize projects automatically when it finds a `kustomization.yaml` file in the target directory. It runs `kustomize build` internally and compares the rendered output against the live cluster state.

## Setting Up the Directory Structure

The standard pattern for a Kustomize-based multi-environment repository looks like this:

```text
my-app/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    dev/
      kustomization.yaml
      replica-patch.yaml
      resource-patch.yaml
    staging/
      kustomization.yaml
      replica-patch.yaml
      resource-patch.yaml
    production/
      kustomization.yaml
      replica-patch.yaml
      resource-patch.yaml
      hpa.yaml
```

The `base/` directory contains your core manifests. Each overlay directory contains patches and additional resources specific to that environment.

## Defining the Base Resources

Start with your base `kustomization.yaml`:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml

commonLabels:
  app: my-app
  managed-by: argocd
```

Your base deployment should use sensible defaults:

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
            limits:
              cpu: 200m
              memory: 256Mi
```

## Creating Environment Overlays

Each environment overlay references the base and applies patches. Here is the dev overlay:

```yaml
# overlays/dev/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base

namespace: dev

# Override the image tag for dev
images:
  - name: myregistry/my-app
    newTag: dev-latest

patches:
  - path: replica-patch.yaml
  - path: resource-patch.yaml

commonAnnotations:
  environment: dev
```

The dev replica patch keeps things minimal:

```yaml
# overlays/dev/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
```

The production overlay is where things get more serious:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base
  - hpa.yaml  # Additional resource only in production

namespace: production

images:
  - name: myregistry/my-app
    newTag: v1.2.3  # Pinned version in production

patches:
  - path: replica-patch.yaml
  - path: resource-patch.yaml

commonAnnotations:
  environment: production
```

Production gets higher replicas and resources:

```yaml
# overlays/production/replica-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
```

```yaml
# overlays/production/resource-patch.yaml
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
              cpu: "1"
              memory: 1Gi
```

And production also gets an HPA that dev does not need:

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
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Configuring ArgoCD Applications

Create an ArgoCD Application for each environment, pointing to the correct overlay path:

```yaml
# argocd/dev-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app-config.git
    targetRevision: main
    path: overlays/dev  # Point to the dev overlay
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
# argocd/production-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app-config.git
    targetRevision: main
    path: overlays/production  # Point to the production overlay
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Using ApplicationSets for Less Repetition

Instead of creating separate Application manifests for each environment, use an ApplicationSet with a list generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-app-environments
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - env: dev
            autoSync: "true"
          - env: staging
            autoSync: "true"
          - env: production
            autoSync: "false"  # Manual sync for production
  template:
    metadata:
      name: 'my-app-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/my-app-config.git
        targetRevision: main
        path: 'overlays/{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{env}}'
```

## Using Strategic Merge Patches vs JSON Patches

Kustomize supports two patching strategies. Strategic merge patches (shown above) are simpler and work well for most cases. For more precise modifications, use JSON patches:

```yaml
# overlays/staging/kustomization.yaml
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 2
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: LOG_LEVEL
          value: debug
```

JSON patches are useful when you need to add items to arrays or make very specific changes without providing the full resource structure.

## Handling ConfigMap and Secret Generators

Kustomize can generate ConfigMaps and Secrets from files or literals, with unique hash suffixes that trigger rolling updates:

```yaml
# overlays/production/kustomization.yaml
configMapGenerator:
  - name: my-app-config
    behavior: merge
    literals:
      - DATABASE_POOL_SIZE=20
      - CACHE_TTL=3600
      - LOG_LEVEL=warn
```

The `behavior: merge` option merges with the base ConfigMap generator if one exists, or you can use `replace` to completely override it.

## Verifying Overlays Locally

Before pushing changes, always verify your overlays render correctly:

```bash
# Build and review the dev overlay
kustomize build overlays/dev

# Build and diff against production
diff <(kustomize build overlays/dev) <(kustomize build overlays/production)

# Validate the output is valid Kubernetes YAML
kustomize build overlays/production | kubectl apply --dry-run=client -f -
```

## Common Pitfalls to Avoid

One frequent mistake is duplicating entire manifests in overlays instead of using patches. If you find yourself copying full deployment specs into overlay directories, you are losing the benefits of Kustomize. Only the differences should live in overlays.

Another common issue is forgetting to update the base when adding new fields. If you add a new container to the base deployment, make sure your overlay patches still target the correct container by name.

Finally, be careful with `commonLabels` in overlays. Kustomize injects these into selector fields, which are immutable on existing Deployments. If you change common labels on an existing deployment, ArgoCD will not be able to apply the change and you will need to delete and recreate the Deployment.

Kustomize overlays combined with ArgoCD give you a clean, maintainable way to manage environment differences. The base stays DRY, patches are minimal and easy to review, and ArgoCD keeps every environment converged to its declared state automatically.
