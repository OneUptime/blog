# How to Use Post-Build Substitution with Inline Variables in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kustomization, Kubernetes, GitOps, Post-Build, Variable Substitution, Inline Variables

Description: Learn how to use inline variable definitions in Flux Kustomization post-build substitution for simple configuration injection.

---

## Introduction

Flux Kustomization supports post-build variable substitution, which replaces placeholder variables in your Kubernetes manifests with actual values during reconciliation. The simplest way to define substitution variables is inline, directly within the Kustomization resource using the `spec.postBuild.substitute` field.

Inline variables are ideal for values that are specific to a particular Kustomization and do not change frequently. They provide a straightforward way to parameterize your manifests without creating separate ConfigMaps or Secrets.

This guide covers how to configure and use inline post-build variable substitution in Flux Kustomizations.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux CD installed (v2.0 or later)
- A GitRepository or OCIRepository source configured
- kubectl access to the cluster
- Basic understanding of Flux Kustomization resources

## Basic Inline Variable Substitution

Define inline variables in the `spec.postBuild.substitute` field of your Kustomization:

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
      CLUSTER_NAME: production-us-east-1
      ENVIRONMENT: production
      REPLICAS: "3"
```

Each key-value pair under `substitute` defines a variable that can be used in your manifests. Note that all values must be strings, even for numeric values like replica counts.

## Using Variables in Manifests

In your manifest files stored in Git, reference the variables using the `${VARIABLE_NAME}` syntax:

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
        environment: ${ENVIRONMENT}
    spec:
      containers:
        - name: app
          image: myregistry.io/my-app:latest
          env:
            - name: CLUSTER
              value: ${CLUSTER_NAME}
            - name: ENV
              value: ${ENVIRONMENT}
```

When Flux reconciles the Kustomization, it replaces `${CLUSTER_NAME}` with `production-us-east-1`, `${ENVIRONMENT}` with `production`, and `${REPLICAS}` with `3`.

## Configuring Multiple Resources

The same variables apply to all manifests within the Kustomization path. This lets you parameterize multiple resources with a single set of variables:

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
      APP_DOMAIN: app.example.com
      TLS_SECRET: app-tls-cert
      NAMESPACE: production
```

Your Ingress manifest can use the same variables:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: ${NAMESPACE}
spec:
  tls:
    - hosts:
        - ${APP_DOMAIN}
      secretName: ${TLS_SECRET}
  rules:
    - host: ${APP_DOMAIN}
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

## Nested Kustomizations with Variable Inheritance

When you have nested Kustomizations, each one can define its own inline variables. Child Kustomizations do not automatically inherit variables from parent Kustomizations. You need to define them at each level:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./deploy/apps
  prune: true
  postBuild:
    substitute:
      ENVIRONMENT: production
      CLUSTER_REGION: us-east-1
```

If the path `./deploy/apps` contains child Kustomization definitions, those children would need their own `postBuild.substitute` sections.

## Combining Inline Variables with ConfigMap References

Inline variables can be combined with ConfigMap and Secret references. The precedence order is: inline variables have the lowest priority, then ConfigMap values, then Secret values. However, when using `substitute` alongside `substituteFrom`, inline variables defined in `substitute` actually take the highest priority:

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
      OVERRIDE_VALUE: always-this-value
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

The `OVERRIDE_VALUE` defined inline will always be used, even if `cluster-config` contains a key with the same name.

## Default Values with Variable Substitution

You can provide default values in your manifests using the `${VARIABLE:=default}` syntax:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: ${REPLICAS:=1}
  selector:
    matchLabels:
      app: my-app
  template:
    spec:
      containers:
        - name: app
          image: myregistry.io/my-app:latest
          env:
            - name: LOG_LEVEL
              value: ${LOG_LEVEL:=info}
```

If `REPLICAS` is not defined in the Kustomization's `postBuild.substitute`, the default value of `1` is used. If it is defined, the inline value takes precedence.

## Practical Example: Multi-Environment Setup

Here is how you might use inline variables for different environments. Each Kustomization targets the same source path but with different variable values:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-staging
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
      ENVIRONMENT: staging
      REPLICAS: "1"
      LOG_LEVEL: debug
      DOMAIN: app.staging.example.com
      IMAGE_TAG: latest
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-production
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
      ENVIRONMENT: production
      REPLICAS: "5"
      LOG_LEVEL: warn
      DOMAIN: app.example.com
      IMAGE_TAG: v2.1.0
```

Both Kustomizations deploy the same manifests from `./deploy/my-app` but with different configurations.

## Escaping Dollar Signs

If your manifests contain literal dollar signs that should not be treated as variable references, use double dollar signs to escape them:

```yaml
env:
  - name: PRICE_FORMAT
    value: "$${LITERAL_DOLLAR}100"
```

The `$$` is preserved as a single `$` in the output, and `{LITERAL_DOLLAR}` is not interpreted as a variable reference.

## Verifying Substitution Results

After Flux reconciles the Kustomization, verify that variables were substituted correctly:

```bash
kubectl get deployment my-app -n default -o yaml | grep -A 5 "env:"
kubectl get ingress my-app -n default -o jsonpath='{.spec.rules[0].host}'
```

If variables are not being substituted, check the Kustomization status:

```bash
flux get kustomizations my-app -n flux-system
kubectl describe kustomization my-app -n flux-system
```

## Conclusion

Inline post-build variable substitution in Flux Kustomizations provides a simple mechanism for parameterizing your Kubernetes manifests. By defining variables directly in the Kustomization spec, you can customize deployments per environment without modifying the source manifests in Git. Inline variables are best suited for small sets of values that are specific to a particular Kustomization. For larger or shared configuration sets, consider using ConfigMap references. Combine both approaches for a layered configuration strategy with inline variables providing overrides on top of ConfigMap defaults.
