# How to Use Post-Build Substitution with Nested Kustomizations in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, gitops, kubernetes, kustomization, post-build, substitution, nested

Description: Learn how post-build variable substitution works with nested Flux Kustomizations, including variable inheritance, scoping rules, and best practices for complex deployments.

---

## Introduction

Flux allows you to create hierarchies of Kustomization resources where a parent Kustomization deploys child Kustomizations. This is common in multi-tenant or multi-application setups. Understanding how post-build substitution interacts with nested Kustomizations is important because variables do not automatically inherit from parent to child. Each Kustomization has its own substitution scope, and you need to explicitly configure variable passing at each level.

## Prerequisites

- Flux CD v2.0 or later installed on your cluster
- A Git repository configured as a GitRepository source
- Familiarity with Flux Kustomization resources
- kubectl access to your cluster

## How Nested Kustomizations Work

A parent Kustomization can deploy child Kustomization resources. The parent points to a path in your Git repository that contains child Kustomization YAML files. When Flux reconciles the parent, it creates the child Kustomization resources on the cluster, which then independently reconcile their own paths.

```
Parent Kustomization (clusters/production/)
├── Child Kustomization: apps (apps/base/)
├── Child Kustomization: monitoring (monitoring/base/)
└── Child Kustomization: ingress (ingress/base/)
```

## Variables Do Not Inherit Automatically

A critical point to understand is that post-build substitution variables defined on a parent Kustomization are not automatically available to child Kustomizations. Each Kustomization operates independently with its own `postBuild` configuration.

Consider this parent Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "production"
      ENVIRONMENT: "prod"
```

If this parent deploys a child Kustomization at `./infrastructure/apps.yaml`, the child will not have access to `CLUSTER_NAME` or `ENVIRONMENT` unless it defines its own `postBuild` section.

## Passing Variables to Child Kustomizations

To make variables available to child Kustomizations, you must use post-build substitution on the parent to inject variable definitions into the child Kustomization manifests themselves. The child Kustomization YAML files in your repository should contain `${VAR_NAME}` placeholders:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "${CLUSTER_NAME}"
      ENVIRONMENT: "${ENVIRONMENT}"
      APP_REPLICAS: "${WEB_APP_REPLICAS}"
```

When the parent Kustomization processes this file, it substitutes `${CLUSTER_NAME}` and `${ENVIRONMENT}` with the parent's values. The resulting child Kustomization on the cluster will have the concrete values in its `postBuild.substitute` map, which it then uses when reconciling its own path.

## Complete Nested Example

Here is a full example showing the parent and child configuration.

Parent Kustomization deployed by Flux bootstrap:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "production"
      ENVIRONMENT: "prod"
      DOMAIN: "prod.example.com"
      WEB_APP_REPLICAS: "3"
      API_REPLICAS: "5"
```

Child Kustomization file at `./clusters/production/web-app.yaml`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: web-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/web-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: "${CLUSTER_NAME}"
      ENVIRONMENT: "${ENVIRONMENT}"
      REPLICAS: "${WEB_APP_REPLICAS}"
      INGRESS_HOST: "web.${DOMAIN}"
```

Application manifest at `./apps/web-app/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  labels:
    cluster: ${CLUSTER_NAME}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: web-app:latest
          env:
            - name: ENVIRONMENT
              value: "${ENVIRONMENT}"
```

## Using ConfigMaps Across Nesting Levels

Instead of passing every variable through inline substitution, you can have both parent and child reference the same ConfigMap on the cluster:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-vars
  namespace: flux-system
data:
  CLUSTER_NAME: "production"
  ENVIRONMENT: "prod"
  DOMAIN: "prod.example.com"
```

Both parent and child Kustomizations reference it:

```yaml
# In child Kustomization
spec:
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
```

This approach is simpler because you do not need to thread variables through the parent. Each Kustomization at any nesting level independently reads from the shared ConfigMap. The ConfigMap must exist on the cluster before the Kustomizations that reference it are reconciled.

## Deploying the Shared ConfigMap

To ensure the ConfigMap exists before the child Kustomizations need it, deploy it through a Kustomization with a higher priority using the `dependsOn` field:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cluster-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: cluster-config
  interval: 10m
  path: ./clusters/production/apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
```

## Three-Level Nesting

For deeply nested structures, the same rules apply. Each level must explicitly configure its own `postBuild`. Here is a three-level example:

```
Level 1: platform (defines CLUSTER_NAME, ENVIRONMENT)
  └── Level 2: apps (inherits CLUSTER_NAME, adds APP_NAMESPACE)
        └── Level 3: web-app (inherits all, adds REPLICAS)
```

At each level, variables must be explicitly passed down or read from a shared ConfigMap. There is no implicit inheritance chain.

## Debugging Nested Substitution

When troubleshooting nested substitution issues, check each level independently:

```bash
# Check parent Kustomization status
flux get kustomization platform

# Check child Kustomization status
flux get kustomization web-app

# Inspect the child Kustomization resource on the cluster
kubectl get kustomization web-app -n flux-system -o yaml
```

Look at the child Kustomization resource on the cluster to verify that the parent's substitution correctly resolved the variables in the child's `postBuild.substitute` map.

## Conclusion

Post-build substitution in nested Flux Kustomizations requires explicit configuration at each level. Variables do not flow automatically from parent to child. You can either thread variables through by using placeholders in child Kustomization manifests, or use a shared ConfigMap that each Kustomization independently references. The shared ConfigMap approach is generally simpler and scales better for deep nesting. Whichever method you choose, always verify substitution results at each nesting level to ensure variables are resolving as expected.
