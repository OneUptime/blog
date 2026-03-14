# How to Use Optional Secret References in Flux Kustomization Substitution

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, Kustomization, Secrets, Substitution, Optional

Description: Learn how to use optional Secret references in Flux post-build substitution for flexible and resilient configuration of sensitive values.

---

## Introduction

Flux post-build substitution supports referencing Kubernetes Secrets as variable sources through `substituteFrom`. This is essential for injecting sensitive values like database passwords, API keys, and TLS certificates into your manifests. Just like ConfigMaps, Secret references can be marked as optional so that a missing Secret does not block reconciliation. This article covers how to use optional Secret references effectively, including practical patterns for managing sensitive configuration across environments.

## Prerequisites

- Flux CD v2.0 or later installed on your cluster
- A Git repository configured as a GitRepository source
- kubectl access to your cluster
- Understanding of Kubernetes Secrets and Flux post-build substitution basics

## Referencing Secrets in Post-Build Substitution

To use a Secret as a variable source, reference it in the `substituteFrom` list with `kind: Secret`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
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
      - kind: Secret
        name: app-secrets
```

The Secret must be in the same namespace as the Kustomization (typically `flux-system`). Each key in the Secret's `data` or `stringData` becomes a substitution variable.

## Creating the Secret

Create a Secret with your sensitive values:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_PASSWORD: "s3cur3-p@ssw0rd"
  API_KEY: "sk-abc123def456"
  REDIS_URL: "redis://:authpass@redis.internal:6379"
```

Or create it imperatively:

```bash
kubectl create secret generic app-secrets \
  --namespace flux-system \
  --from-literal=DATABASE_PASSWORD='s3cur3-p@ssw0rd' \
  --from-literal=API_KEY='sk-abc123def456' \
  --from-literal=REDIS_URL='redis://:authpass@redis.internal:6379'
```

## Making Secret References Optional

Mark a Secret reference as optional using `optional: true`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
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
      - kind: Secret
        name: app-secrets
      - kind: Secret
        name: extra-credentials
        optional: true
```

If `extra-credentials` does not exist, Flux continues reconciliation using variables from `cluster-config` and `app-secrets`.

## Use Case: Environment-Specific Secrets

Different environments often have different sensitive values. Use required and optional Secrets to handle this:

```yaml
postBuild:
  substituteFrom:
    - kind: ConfigMap
      name: cluster-config
    - kind: Secret
      name: common-secrets          # Shared across environments
    - kind: Secret
      name: production-secrets      # Only exists on production
      optional: true
    - kind: Secret
      name: monitoring-credentials  # Only on clusters with monitoring
      optional: true
```

## Use Case: Gradual Secret Migration

When migrating secrets from one management system to another, optional references let you transition without downtime:

```yaml
postBuild:
  substituteFrom:
    - kind: Secret
      name: app-secrets-v2    # New secret format
      optional: true
    - kind: Secret
      name: app-secrets-v1    # Old secret format (fallback)
```

Since earlier entries take precedence, when `app-secrets-v2` exists, its values override `app-secrets-v1`. You can deploy the new Secret to clusters one at a time, and on clusters where it does not yet exist, the old Secret provides the values.

## Using Secrets in Application Manifests

In your manifests, reference the Secret-sourced variables just like any other substitution variable:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
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
            - name: DATABASE_PASSWORD
              value: "${DATABASE_PASSWORD}"
            - name: API_KEY
              value: "${API_KEY}"
            - name: REDIS_URL
              value: "${REDIS_URL}"
```

Note that this approach puts the secret values directly into the Deployment manifest as plain-text environment variables. For better security, consider creating Kubernetes Secrets in your manifests and referencing them via `secretKeyRef`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
type: Opaque
stringData:
  database-password: "${DATABASE_PASSWORD}"
  api-key: "${API_KEY}"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
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
          envFrom:
            - secretRef:
                name: my-app-secrets
```

## Combining ConfigMaps and Secrets with Defaults

A comprehensive pattern uses inline defaults, required ConfigMaps, and optional Secrets:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
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
      REPLICAS: "2"
      LOG_LEVEL: "info"
      DATABASE_PASSWORD: "changeme"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: Secret
        name: app-secrets
        optional: true
```

When the Secret does not exist, `DATABASE_PASSWORD` uses the inline default "changeme". Once the proper Secret is created on the cluster, the real password overrides the default.

## Security Considerations

When using Secrets in post-build substitution, keep these points in mind:

1. The Secret must exist in the `flux-system` namespace, which means anyone with read access to that namespace can see the values
2. After substitution, the secret values appear in plain text in the rendered manifests stored in the cluster
3. Consider using SOPS-encrypted Secrets or Sealed Secrets to manage the source Secrets in Git
4. Audit who has access to the `flux-system` namespace

## Verifying Secret-Based Substitution

Check that the Secret exists and has the expected keys:

```bash
kubectl get secret app-secrets -n flux-system -o jsonpath='{.data}' | jq 'keys'
```

Check the Kustomization status:

```bash
flux get kustomization my-app
```

Verify the substituted values in the resulting resources:

```bash
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[0].env}'
```

## Conclusion

Optional Secret references in Flux post-build substitution provide flexibility when managing sensitive configuration values across multiple environments. By marking Secret references as optional, you ensure that missing Secrets do not block deployments, which is especially useful during initial cluster setup, progressive rollouts, and secret migration workflows. Always combine this with inline defaults for critical variables and follow security best practices for managing the Secrets themselves.
