# How to Use Kustomize Bases Library Pattern in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Kustomize, Repository Structure, DRY Patterns

Description: Learn how to use the Kustomize bases library pattern in Flux to share common resource definitions across multiple environments without duplication.

---

## What is the Bases Library Pattern

The Kustomize bases library pattern involves creating a shared library of base resource definitions that are referenced and customized by environment-specific overlays. This eliminates duplication and ensures consistency across environments while allowing environment-specific configuration through patches and overrides.

## Repository Structure

```text
flux-repo/
├── clusters/
│   ├── staging/
│   │   └── apps.yaml
│   └── production/
│       └── apps.yaml
├── base/
│   ├── app-a/
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── app-b/
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── monitoring/
│       ├── kustomization.yaml
│       ├── prometheus.yaml
│       └── grafana.yaml
└── environments/
    ├── staging/
    │   ├── kustomization.yaml
    │   ├── app-a/
    │   │   ├── kustomization.yaml
    │   │   └── patch-replicas.yaml
    │   └── app-b/
    │       ├── kustomization.yaml
    │       └── patch-resources.yaml
    └── production/
        ├── kustomization.yaml
        ├── app-a/
        │   ├── kustomization.yaml
        │   └── patch-replicas.yaml
        └── app-b/
            ├── kustomization.yaml
            └── patch-resources.yaml
```

## Defining a Base

The base contains the canonical resource definitions without environment-specific values:

```yaml
# base/app-a/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - hpa.yaml
```

```yaml
# base/app-a/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-a
  labels:
    app: app-a
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-a
  template:
    metadata:
      labels:
        app: app-a
    spec:
      containers:
        - name: app-a
          image: myregistry/app-a:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

```yaml
# base/app-a/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: app-a
spec:
  selector:
    app: app-a
  ports:
    - port: 80
      targetPort: 8080
```

## Creating Environment Overlays

Each environment references the base and applies patches:

```yaml
# environments/staging/app-a/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/app-a
patches:
  - path: patch-replicas.yaml
images:
  - name: myregistry/app-a
    newTag: staging-latest
```

```yaml
# environments/staging/app-a/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-a
spec:
  replicas: 2
```

For production with higher resource allocations:

```yaml
# environments/production/app-a/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../../base/app-a
patches:
  - path: patch-replicas.yaml
images:
  - name: myregistry/app-a
    newTag: v1.5.0
```

```yaml
# environments/production/app-a/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-a
spec:
  replicas: 5
```

## Environment-Level Kustomization

The environment-level kustomization.yaml aggregates all apps for that environment:

```yaml
# environments/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - app-a
  - app-b
commonLabels:
  environment: staging
```

```yaml
# environments/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - app-a
  - app-b
commonLabels:
  environment: production
```

## Flux Kustomization Per Environment

Point Flux at each environment overlay:

```yaml
# clusters/staging/apps.yaml
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
  path: ./environments/staging
  prune: true
```

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./environments/production
  prune: true
```

## Using Namespace Transformers in Overlays

You can use namespace transformers to deploy the same base into different namespaces:

```yaml
# environments/staging/app-a/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: staging
resources:
  - ../../../base/app-a
patches:
  - path: patch-replicas.yaml
```

## Validating the Base Library

Before committing, validate that the overlays correctly render:

```bash
# Validate staging overlay
kustomize build environments/staging/app-a

# Validate production overlay
kustomize build environments/production/app-a

# Diff between environments
diff <(kustomize build environments/staging/app-a) \
     <(kustomize build environments/production/app-a)
```

## Conclusion

The Kustomize bases library pattern provides a clean separation between shared resource definitions and environment-specific customizations. By maintaining a single source of truth in the base directory and applying targeted patches per environment, you reduce duplication, minimize drift between environments, and make it easy to add new environments by simply creating a new overlay directory that references the existing bases.
