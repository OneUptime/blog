# How to Configure Variable Precedence in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Kustomization, Variable Substitution, Configuration

Description: Learn how variable precedence works in Flux Kustomization post-build substitution and how to configure it for predictable results.

---

## Introduction

When using post-build substitution in Flux Kustomization, you can define variables from multiple sources including inline values, ConfigMaps, and Secrets. Understanding how Flux resolves conflicts between these sources is essential for predictable deployments. This guide explains the variable precedence rules and shows you how to structure your configuration to get the exact behavior you need.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Familiarity with Flux Kustomization and post-build substitution basics

## How Variable Precedence Works

Flux evaluates post-build substitution variables in a specific order. When the same variable name appears in multiple sources, the precedence rules determine which value is used. The order from lowest to highest priority is:

1. Values from `substituteFrom` sources (processed in list order, later entries override earlier ones)
2. Inline values defined in the `substitute` field (highest priority)

This means inline variables always win over values from ConfigMaps and Secrets.

## Setting Up Multiple Variable Sources

Consider a scenario where you have a base configuration in a ConfigMap, secrets in a Secret, and environment-specific overrides inline. Here is how to set up the sources:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: base-config
  namespace: flux-system
data:
  REPLICAS: "2"
  LOG_LEVEL: "info"
  APP_ENV: "staging"
  CACHE_TTL: "300"
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: env-overrides
  namespace: flux-system
type: Opaque
stringData:
  APP_ENV: "production"
  DB_HOST: "prod-db.internal"
  DB_PASSWORD: "secure-password-here"
```

## Configuring the Kustomization

The Flux Kustomization ties everything together:

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
      REPLICAS: "5"
      LOG_LEVEL: "warn"
    substituteFrom:
      - kind: ConfigMap
        name: base-config
      - kind: Secret
        name: env-overrides
```

With this configuration, here is how each variable resolves:

| Variable | ConfigMap | Secret | Inline | Final Value | Reason |
|----------|-----------|--------|--------|-------------|--------|
| REPLICAS | 2 | - | 5 | **5** | Inline overrides ConfigMap |
| LOG_LEVEL | info | - | warn | **warn** | Inline overrides ConfigMap |
| APP_ENV | staging | production | - | **production** | Secret listed after ConfigMap |
| CACHE_TTL | 300 | - | - | **300** | Only defined in ConfigMap |
| DB_HOST | - | prod-db.internal | - | **prod-db.internal** | Only defined in Secret |
| DB_PASSWORD | - | secure-password-here | - | **secure-password-here** | Only defined in Secret |

## Ordering substituteFrom Sources

The order of entries in `substituteFrom` matters. Later entries override earlier ones for the same variable name. Use this to create a layered configuration:

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
        name: defaults
      - kind: ConfigMap
        name: cluster-config
      - kind: ConfigMap
        name: app-specific-config
      - kind: Secret
        name: credentials
```

In this layered approach:

- `defaults` provides base values for all applications
- `cluster-config` overrides defaults with cluster-specific settings
- `app-specific-config` overrides cluster config with application-specific values
- `credentials` provides sensitive values that override any matching keys from prior sources

## Using Inline Variables for Critical Overrides

Since inline `substitute` values have the highest precedence, use them for values that must not be overridden by any external source:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-production
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
      CLUSTER_NAME: "prod-us-east-1"
      ENVIRONMENT: "production"
      MIN_REPLICAS: "3"
    substituteFrom:
      - kind: ConfigMap
        name: shared-config
      - kind: Secret
        name: app-secrets
```

No matter what values `shared-config` or `app-secrets` define for `CLUSTER_NAME`, `ENVIRONMENT`, or `MIN_REPLICAS`, the inline values will always be used.

## Debugging Precedence Issues

When variable substitution does not produce the expected results, use these techniques to debug.

Check the Kustomization status for errors:

```bash
flux get kustomization my-app -o yaml
```

Verify the contents of your ConfigMaps and Secrets:

```bash
kubectl get configmap base-config -n flux-system -o yaml
kubectl get secret env-overrides -n flux-system -o jsonpath='{.data}' | jq 'to_entries[] | {key: .key, value: (.value | @base64d)}'
```

Inspect the applied resource to see the resolved values:

```bash
kubectl get deployment my-app -n default -o yaml
```

If a variable is not being substituted, verify that the variable name in your manifest matches a key in one of the configured sources. Variable names are case-sensitive.

## Pattern for Multi-Environment Deployments

A common pattern uses precedence to manage multiple environments from a single set of manifests:

```yaml
# staging kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      ENVIRONMENT: "staging"
      REPLICAS: "1"
    substituteFrom:
      - kind: ConfigMap
        name: shared-defaults
      - kind: Secret
        name: staging-secrets
```

```yaml
# production kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-production
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
      ENVIRONMENT: "production"
      REPLICAS: "3"
    substituteFrom:
      - kind: ConfigMap
        name: shared-defaults
      - kind: Secret
        name: production-secrets
```

Both Kustomizations point to the same manifest path but use inline variables to set environment-specific values that cannot be overridden, while pulling shared defaults and environment-specific secrets from their respective sources.

## Using Default Values as a Fallback

Default values in your manifests act as the lowest precedence layer:

```yaml
env:
  - name: LOG_LEVEL
    value: "${LOG_LEVEL:=info}"
  - name: MAX_CONNECTIONS
    value: "${MAX_CONNECTIONS:=100}"
```

The resolution order from lowest to highest precedence becomes: manifest defaults, first `substituteFrom` source, subsequent `substituteFrom` sources, and finally inline `substitute` values.

## Conclusion

Variable precedence in Flux Kustomization follows a clear and predictable model. Inline values in `substitute` always take the highest priority, followed by `substituteFrom` sources in reverse list order, with manifest-level defaults as the final fallback. By structuring your variable sources with this precedence in mind, you can build layered configuration systems that scale cleanly across environments while keeping sensitive values secure and overrides explicit.
