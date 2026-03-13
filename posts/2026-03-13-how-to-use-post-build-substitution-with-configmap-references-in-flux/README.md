# How to Use Post-Build Substitution with ConfigMap References in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kustomization, Kubernetes, GitOps, Post-Build, Variable Substitution, ConfigMap

Description: Learn how to use ConfigMap references in Flux Kustomization post-build variable substitution for dynamic configuration.

---

## Introduction

Flux Kustomization supports post-build variable substitution, which replaces placeholder variables in your manifests with actual values during reconciliation. One of the most powerful features of this mechanism is the ability to reference values from Kubernetes ConfigMaps. This allows you to store configuration data in ConfigMaps and have Flux inject those values into your manifests at apply time.

Using ConfigMap references for variable substitution keeps your configuration data separate from your manifests, makes it easy to change values without modifying Git, and enables environment-specific configuration through different ConfigMaps per cluster.

This guide explains how to configure post-build substitution with ConfigMap references in Flux Kustomizations.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- A GitRepository or OCIRepository source configured
- kubectl access to the cluster
- Basic understanding of Flux Kustomization resources

## Creating a ConfigMap for Substitution

First, create a ConfigMap containing the variables you want to substitute. Each key-value pair in the ConfigMap data becomes a variable:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  namespace: flux-system
data:
  CLUSTER_NAME: production-us-east-1
  ENVIRONMENT: production
  DOMAIN: app.example.com
  REPLICAS: "3"
  LOG_LEVEL: info
```

Apply this ConfigMap to the cluster:

```bash
kubectl apply -f cluster-config.yaml
```

## Referencing ConfigMaps in Kustomization

To use the ConfigMap values in post-build substitution, reference it in the `spec.postBuild.substituteFrom` field of your Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

Flux reads the ConfigMap during reconciliation and makes all its keys available as substitution variables.

## Using Variables in Manifests

In your manifests stored in Git, use the `${VARIABLE_NAME}` syntax to reference the variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    cluster: ${CLUSTER_NAME}
    environment: ${ENVIRONMENT}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        cluster: ${CLUSTER_NAME}
    spec:
      containers:
        - name: app
          image: myregistry.io/my-app:latest
          env:
            - name: ENVIRONMENT
              value: ${ENVIRONMENT}
            - name: LOG_LEVEL
              value: ${LOG_LEVEL}
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: default
spec:
  rules:
    - host: ${DOMAIN}
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

During reconciliation, Flux replaces `${CLUSTER_NAME}` with `production-us-east-1`, `${ENVIRONMENT}` with `production`, and so on.

## Multiple ConfigMap References

You can reference multiple ConfigMaps. Values from later entries override those from earlier ones:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: ConfigMap
        name: app-config
```

If both `cluster-config` and `app-config` contain the same key, the value from `app-config` takes precedence because it appears later in the list.

## Combining ConfigMaps with Inline Variables

You can mix ConfigMap references with inline variable definitions. Inline variables take the highest precedence:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app
  prune: true
  postBuild:
    substitute:
      CUSTOM_ANNOTATION: managed-by-flux
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

The inline variable `CUSTOM_ANNOTATION` is always available and cannot be overridden by the ConfigMap values.

## Combining ConfigMaps with Secrets

For sensitive values, use Secret references alongside ConfigMap references:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: Secret
        name: app-secrets
```

The Secret `app-secrets` might contain database passwords, API keys, or other sensitive configuration that should not be stored in a ConfigMap.

## Optional ConfigMap References

If a ConfigMap might not exist in all environments, mark it as optional to prevent reconciliation failures:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/my-app
  prune: true
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
      - kind: ConfigMap
        name: optional-overrides
        optional: true
```

When `optional: true` is set and the ConfigMap does not exist, Flux proceeds without error and simply skips the missing source.

## Environment-Specific Configuration

Use different ConfigMaps per environment to customize the same manifests for different clusters:

```yaml
# Production cluster ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  namespace: flux-system
data:
  ENVIRONMENT: production
  REPLICAS: "5"
  LOG_LEVEL: warn
  DOMAIN: app.example.com
```

```yaml
# Staging cluster ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-config
  namespace: flux-system
data:
  ENVIRONMENT: staging
  REPLICAS: "2"
  LOG_LEVEL: debug
  DOMAIN: app.staging.example.com
```

The same Kustomization definition works on both clusters because the ConfigMap name is the same but the values differ.

## Verifying Substitution

To verify that variable substitution is working correctly, check the applied resources:

```bash
kubectl get deployment my-app -n default -o yaml
kubectl get ingress my-app -n default -o yaml
```

The output should show the actual values from the ConfigMap, not the `${VARIABLE_NAME}` placeholders. If you see unsubstituted variables, check that the ConfigMap exists and contains the expected keys:

```bash
kubectl get configmap cluster-config -n flux-system -o yaml
```

## Conclusion

Post-build substitution with ConfigMap references in Flux Kustomizations provides a flexible way to inject configuration values into your manifests at reconciliation time. By storing variables in ConfigMaps, you can manage environment-specific settings without modifying the manifests in Git. Use multiple ConfigMap references for layered configuration, optional references for conditional overrides, and combine with Secret references for sensitive values. This approach keeps your Git manifests generic and portable across different clusters and environments.
