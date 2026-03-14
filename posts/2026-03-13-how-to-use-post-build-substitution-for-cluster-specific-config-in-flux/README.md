# How to Use Post-Build Substitution for Cluster-Specific Config in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, Kustomization, Post-Build, Substitution, Multi-Cluster

Description: Learn how to use Flux post-build variable substitution to manage cluster-specific configurations across multiple Kubernetes clusters from a single Git repository.

---

## Introduction

When managing multiple Kubernetes clusters with Flux CD, you often need to deploy the same application with slightly different configurations per cluster. For example, you might want different replica counts, resource limits, or ingress hostnames depending on whether you are deploying to a staging or production cluster. Flux post-build variable substitution allows you to define variables inline or reference ConfigMaps and Secrets, then substitute those values into your manifests after Kustomize builds them. This approach keeps your Git repository DRY while supporting cluster-specific overrides.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- Basic familiarity with Kustomize overlays
- A Git repository connected to Flux via a GitRepository source
- kubectl access to your cluster

## Understanding Post-Build Substitution

Flux Kustomization resources support a `postBuild` field that enables variable substitution on the rendered manifests. After Kustomize builds the final YAML, Flux scans for `${VAR_NAME}` placeholders and replaces them with the corresponding values. Variables can come from two sources: inline definitions in the `substitute` map, or references to ConfigMaps and Secrets via `substituteFrom`.

## Setting Up Cluster-Specific Variables Inline

The simplest way to provide cluster-specific values is by defining them directly in the Kustomization resource. Each cluster gets its own Kustomization with different variable values.

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "production"
      REPLICAS: "3"
      INGRESS_HOST: "app.prod.example.com"
      LOG_LEVEL: "warn"
```

For a staging cluster, you would define a separate Kustomization with different values:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "staging"
      REPLICAS: "1"
      INGRESS_HOST: "app.staging.example.com"
      LOG_LEVEL: "debug"
```

## Using Variables in Your Manifests

In the application manifests under `./apps/my-app`, you reference these variables using the `${VAR_NAME}` syntax:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
    cluster: ${CLUSTER_NAME}
spec:
  replicas: ${REPLICAS}
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
          image: my-app:latest
          env:
            - name: LOG_LEVEL
              value: "${LOG_LEVEL}"
            - name: CLUSTER_NAME
              value: "${CLUSTER_NAME}"
```

And the corresponding Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
spec:
  rules:
    - host: ${INGRESS_HOST}
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

## Using ConfigMaps for Cluster-Specific Variables

For better organization, you can store cluster-specific variables in a ConfigMap and reference it from the Kustomization. This is especially useful when you have many variables or want to manage them separately from the Kustomization resource.

First, create a ConfigMap on the target cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  namespace: flux-system
data:
  CLUSTER_NAME: "production"
  REPLICAS: "3"
  INGRESS_HOST: "app.prod.example.com"
  LOG_LEVEL: "warn"
  NODE_ENV: "production"
  CACHE_TTL: "3600"
```

Then reference it in the Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

## Combining Inline and ConfigMap Variables

You can combine both inline variables and ConfigMap references. Inline variables take precedence over ConfigMap values, allowing you to override specific settings:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      REPLICAS: "5"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

In this example, `REPLICAS` will be "5" regardless of what the ConfigMap contains, while all other variables come from the ConfigMap.

## Organizing a Multi-Cluster Repository

A common pattern is to structure your repository with a shared base and per-cluster overlays that contain the Kustomization definitions:

```text
├── clusters/
│   ├── production/
│   │   ├── app.yaml          # Kustomization with prod variables
│   │   └── cluster-config.yaml
│   └── staging/
│       ├── app.yaml          # Kustomization with staging variables
│       └── cluster-config.yaml
└── apps/
    └── my-app/
        ├── kustomization.yaml
        ├── deployment.yaml    # Uses ${VAR_NAME} placeholders
        ├── service.yaml
        └── ingress.yaml
```

Each cluster's Flux instance points to its own directory under `clusters/`, and the shared application manifests under `apps/` use variable placeholders that get resolved per cluster.

## Verifying Substitution Results

After Flux reconciles, verify that the substitution worked correctly:

```bash
kubectl get deployment my-app -o yaml | grep replicas
kubectl get ingress my-app -o jsonpath='{.spec.rules[0].host}'
```

You can also check the Kustomization status for any substitution errors:

```bash
flux get kustomization app
```

If a variable is referenced in a manifest but not defined, Flux will leave the placeholder as-is and report a warning in the Kustomization status.

## Conclusion

Post-build substitution in Flux provides a clean way to manage cluster-specific configurations without duplicating manifests. By combining inline variables with ConfigMap references, you can maintain a single set of application templates and customize deployments per cluster. This approach scales well across many clusters and keeps your Git repository maintainable. For sensitive values like database passwords, use Secret references in `substituteFrom` instead of ConfigMaps.
