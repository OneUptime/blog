# How to Map ArgoCD ApplicationSet to Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, ApplicationSet, Migration, GitOps, Kubernetes, Variable Substitution

Description: Learn how to convert ArgoCD ApplicationSets to Flux Kustomizations using Flux's variable substitution feature for multi-tenant and multi-environment deployments.

---

## Introduction

ArgoCD ApplicationSets generate multiple ArgoCD Applications from a single template using generators like list, cluster, git directory, or pull request generators. Flux CD achieves similar results through variable substitution in Kustomizations, combined with a base manifest structure and per-environment overlays. While Flux doesn't have a direct ApplicationSet equivalent, the combination of variable substitution and Kustomize overlays is equally powerful.

## Prerequisites

- Flux CD bootstrapped on your cluster
- Existing ArgoCD ApplicationSet YAML to migrate
- Understanding of Kustomize overlays

## Step 1: Understand the ApplicationSet Pattern

A typical ArgoCD ApplicationSet using a list generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: microservices
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - service: frontend
            namespace: frontend
            port: "3000"
          - service: backend
            namespace: backend
            port: "8080"
          - service: worker
            namespace: worker
            port: "9090"
  template:
    metadata:
      name: '{{service}}'
    spec:
      project: production
      source:
        repoURL: https://github.com/your-org/fleet-repo
        targetRevision: main
        path: 'apps/{{service}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{namespace}}'
      syncPolicy:
        automated:
          prune: true
```

## Step 2: Flux Variable Substitution Approach

Create a base Kustomization with variable substitution:

```yaml
# clusters/production/apps/microservices.yaml
# Three separate Kustomizations (one per service, replacing ApplicationSet)

---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: frontend
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/frontend
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: frontend
  postBuild:
    substitute:
      SERVICE_NAME: "frontend"
      SERVICE_PORT: "3000"
      ENVIRONMENT: "production"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: backend
  postBuild:
    substitute:
      SERVICE_NAME: "backend"
      SERVICE_PORT: "8080"
      ENVIRONMENT: "production"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
```

## Step 3: Use a Shared Base with Variable Substitution

Instead of duplicating Kustomizations, use a shared base manifest:

```yaml
# apps/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${SERVICE_NAME}
  namespace: ${SERVICE_NAMESPACE}
spec:
  replicas: ${REPLICAS:=2}  # Default value if not set
  selector:
    matchLabels:
      app: ${SERVICE_NAME}
  template:
    metadata:
      labels:
        app: ${SERVICE_NAME}
        environment: ${ENVIRONMENT}
    spec:
      containers:
        - name: ${SERVICE_NAME}
          image: your-registry/${SERVICE_NAME}:${SERVICE_VERSION}
          ports:
            - containerPort: $SERVICE_PORT
```

Then reference it in each service's kustomization:

```yaml
# apps/frontend/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
```

## Step 4: Using ConfigMap for Shared Variables

```yaml
# clusters/production/cluster-vars-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-vars
  namespace: flux-system
data:
  CLUSTER_NAME: "production-cluster"
  ENVIRONMENT: "production"
  REGION: "us-east-1"
  LOG_LEVEL: "info"
```

## Step 5: Git Directory Generator Equivalent

ArgoCD's git directory generator creates one Application per directory. In Flux, you can achieve this with explicit Kustomizations or with a shell script to generate them:

```bash
#!/bin/bash
# generate-kustomizations.sh
# Generates a Flux Kustomization for each directory under apps/

FLEET_REPO_PATH="clusters/production/apps"

for dir in apps/*/; do
  service=$(basename "$dir")
  cat > "$FLEET_REPO_PATH/${service}.yaml" << EOF
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ${service}
  namespace: flux-system
spec:
  interval: 5m
  path: ./${dir}
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: ${service}
  postBuild:
    substitute:
      SERVICE_NAME: "${service}"
EOF
  echo "Generated Kustomization for $service"
done
```

## Step 6: Cluster Generator Equivalent

ArgoCD's cluster generator creates Applications across multiple clusters. Flux achieves this by bootstrapping Flux on each cluster with cluster-specific Kustomizations:

```yaml
# Each cluster has its own path in the fleet repo
# clusters/prod-us-east-1/apps.yaml
# clusters/prod-eu-west-1/apps.yaml
# clusters/staging/apps.yaml
```

## Best Practices

- For a small number of services (< 10), explicit individual Kustomizations are clearer than a generated approach.
- Use variable substitution for environment-specific values; use Kustomize overlays for structural differences.
- Document the variable substitution pattern in a README in the apps/base directory so new team members understand the template.
- Commit generated Kustomizations to Git so they are version-controlled; avoid generating them at runtime.
- Use `substituteFrom` with ConfigMaps for cluster-wide variables rather than duplicating them in every Kustomization.

## Conclusion

While Flux CD does not have a direct ApplicationSet equivalent, the combination of variable substitution and explicit Kustomizations provides a clean, readable alternative. The key mindset shift is from a single template generating N applications to N explicit Kustomizations sharing a common base through Kustomize overlays. This is more verbose but easier to debug and reason about, especially when individual services need divergent configurations.
