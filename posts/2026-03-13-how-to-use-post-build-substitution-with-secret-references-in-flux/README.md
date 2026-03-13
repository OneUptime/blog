# How to Use Post-Build Substitution with Secret References in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Secrets, Post-Build Substitution, Kustomization

Description: Learn how to securely inject secret values into your Kubernetes manifests using Flux post-build substitution with secret references.

---

## Introduction

Managing secrets in a GitOps workflow presents a fundamental challenge. You want your manifests version-controlled in Git, but you cannot store sensitive values like API keys, passwords, or tokens in plain text. Flux solves this elegantly through post-build substitution with secret references, allowing you to inject values from Kubernetes Secrets into your manifests at reconciliation time without ever exposing them in your repository.

This guide walks you through setting up post-build substitution with secret references in Flux, covering practical patterns for real-world deployments.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Basic familiarity with Kustomize and Flux Kustomization resources

## Understanding Post-Build Substitution

Post-build substitution in Flux allows you to replace variable placeholders in your rendered manifests with values sourced from ConfigMaps or Secrets. When Flux reconciles a Kustomization, it first runs Kustomize to build the manifests, then performs variable substitution before applying them to the cluster.

Variables use the `${VAR_NAME}` syntax, and Flux replaces them with corresponding values from the referenced sources.

## Creating a Secret for Substitution

First, create a Kubernetes Secret containing the values you want to inject. This secret lives in the same namespace as your Flux Kustomization resource.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: flux-system
type: Opaque
stringData:
  DB_PASSWORD: "my-secure-database-password"
  API_KEY: "sk-live-abc123def456"
  REDIS_URL: "redis://:authpass@redis-master:6379/0"
```

Apply this secret directly to your cluster or manage it through a secrets management tool like SOPS or Sealed Secrets:

```bash
kubectl apply -f app-secrets.yaml
```

## Configuring the Kustomization with Secret References

Next, configure your Flux Kustomization to reference the secret using the `postBuild.substituteFrom` field:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-application
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: Secret
        name: app-secrets
```

The `substituteFrom` field accepts a list of references, each specifying a `kind` (either `Secret` or `ConfigMap`) and a `name`. Flux reads the key-value pairs from the referenced resource and uses them for substitution.

## Using Variables in Your Manifests

With the secret reference configured, you can use variable placeholders in any manifest under the Kustomization path. Here is a Deployment that references the secret values:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-application
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-application
  template:
    metadata:
      labels:
        app: my-application
    spec:
      containers:
        - name: app
          image: myregistry/my-app:v1.2.0
          env:
            - name: DATABASE_PASSWORD
              value: "${DB_PASSWORD}"
            - name: EXTERNAL_API_KEY
              value: "${API_KEY}"
            - name: REDIS_CONNECTION
              value: "${REDIS_URL}"
```

When Flux reconciles this Kustomization, it replaces `${DB_PASSWORD}`, `${API_KEY}`, and `${REDIS_URL}` with the actual values from the `app-secrets` Secret.

## Combining Secrets with Inline Variables

You can mix secret references with inline variable definitions. Inline variables take precedence over values from referenced sources:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-application
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      APP_ENV: "production"
      LOG_LEVEL: "warn"
    substituteFrom:
      - kind: Secret
        name: app-secrets
      - kind: ConfigMap
        name: app-config
```

In this configuration, `APP_ENV` and `LOG_LEVEL` are defined inline, while other variables come from the referenced Secret and ConfigMap. If the same variable name exists in both `substitute` and a referenced source, the inline value in `substitute` wins.

## Using Default Values for Safety

To prevent errors when a variable is not defined in any source, use the default value syntax:

```yaml
env:
  - name: DATABASE_PASSWORD
    value: "${DB_PASSWORD}"
  - name: CACHE_TTL
    value: "${CACHE_TTL:=3600}"
  - name: FEATURE_FLAG
    value: "${ENABLE_BETA:=false}"
```

The `${VAR:=default}` syntax assigns the default value if the variable is not found in any substitution source. This is particularly useful when rolling out new configuration options that older secrets may not yet include.

## Referencing Multiple Secrets

For better organization, you can split secrets across multiple resources and reference them all:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-application
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: Secret
        name: database-credentials
      - kind: Secret
        name: third-party-api-keys
      - kind: Secret
        name: tls-config
      - kind: ConfigMap
        name: app-settings
```

When multiple sources define the same variable, the last source in the list takes precedence.

## Verifying Substitution Results

After Flux reconciles, verify that the substitution worked correctly by checking the Kustomization status:

```bash
flux get kustomization my-application
```

If a variable is undefined and has no default value, Flux will report a substitution error in the Kustomization status. You can also inspect the applied manifests:

```bash
kubectl get deployment my-application -o yaml | grep -A 5 "env:"
```

## Security Considerations

Post-build substitution with secrets keeps sensitive values out of Git while making them available at deployment time. However, keep these points in mind:

- The substituted values appear in the final applied manifests, so anyone with read access to the Deployment resource can see the values in the `env` section.
- For stronger security, consider using Kubernetes Secrets as volume mounts or `envFrom` references instead of embedding values directly in environment variable definitions.
- Combine post-build substitution with SOPS or Sealed Secrets to encrypt the source secrets in Git.

## Conclusion

Post-build substitution with secret references in Flux provides a clean way to separate sensitive configuration from your Git-stored manifests. By referencing Kubernetes Secrets in your Kustomization resources, you can inject passwords, API keys, and connection strings at reconciliation time without compromising your GitOps workflow. Combined with default values and multiple source references, this feature gives you flexible and secure configuration management across all your environments.
