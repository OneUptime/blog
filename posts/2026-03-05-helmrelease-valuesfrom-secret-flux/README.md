# How to Configure HelmRelease ValuesFrom Secret in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Secrets, ValuesFrom, Security

Description: Learn how to use spec.valuesFrom to load sensitive Helm chart values from Kubernetes Secrets in Flux CD HelmReleases.

---

## Introduction

Many Helm charts require sensitive configuration such as database passwords, API keys, or TLS certificates. Storing these values inline in a HelmRelease manifest is a security risk, especially when manifests are committed to Git. Flux CD solves this with the `spec.valuesFrom` field, which can reference Kubernetes Secrets as value sources. This keeps secrets out of your Git repository while still maintaining a GitOps workflow.

## Why Use Secrets for Helm Values

Secrets are the appropriate Kubernetes resource for sensitive data:

- **Encryption at rest**: Kubernetes can encrypt Secrets at rest using encryption providers
- **RBAC isolation**: Access to Secrets can be restricted with fine-grained RBAC policies
- **External secret management**: Tools like External Secrets Operator or Sealed Secrets can manage Secret lifecycle
- **Audit trail**: Access to Secrets can be audited through Kubernetes audit logging

## Step 1: Create a Secret with Values

Create a Kubernetes Secret containing your sensitive Helm values. The values are stored as a YAML string.

```yaml
# secret-values.yaml - Secret containing sensitive Helm values
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: default
type: Opaque
stringData:
  # Use stringData for plain text; Kubernetes encodes it automatically
  values.yaml: |
    database:
      host: postgres.database.svc
      port: 5432
      username: myapp
      password: super-secret-password
    redis:
      host: redis.cache.svc
      password: redis-secret-password
    externalApi:
      key: ak_live_abc123def456
      secret: sk_live_xyz789ghi012
```

Apply the Secret to your cluster.

```bash
# Create the Secret
kubectl apply -f secret-values.yaml

# Verify the Secret was created
kubectl get secret my-app-secrets -n default
```

In a production GitOps setup, you would not commit this plain-text Secret to Git. Instead, use Sealed Secrets, SOPS, or an external secrets manager.

## Step 2: Reference the Secret in HelmRelease

Use `spec.valuesFrom` with `kind: Secret` to reference the Secret.

```yaml
# helmrelease.yaml - HelmRelease loading values from a Secret
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Load sensitive values from a Secret
  valuesFrom:
    - kind: Secret
      name: my-app-secrets
      # Key in the Secret containing the YAML values
      valuesKey: values.yaml
  # Non-sensitive values defined inline
  values:
    replicaCount: 3
    image:
      repository: my-registry/my-app
      tag: "1.5.0"
    service:
      type: ClusterIP
      port: 8080
```

The sensitive values from the Secret are merged with the inline values. Inline `spec.values` take higher priority than `spec.valuesFrom` entries.

## Step 3: Using targetPath for Individual Secret Values

When a Secret contains individual keys rather than a full values YAML, use `targetPath` to map each key to the correct location in the chart values.

```yaml
# Secret with individual sensitive values
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
stringData:
  db-password: "super-secret-password"
  db-username: "myapp"
```

```yaml
# HelmRelease mapping individual Secret keys to chart values
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  valuesFrom:
    # Map each Secret key to a specific path in the chart values
    - kind: Secret
      name: db-credentials
      valuesKey: db-password
      targetPath: database.password
    - kind: Secret
      name: db-credentials
      valuesKey: db-username
      targetPath: database.username
  values:
    database:
      host: postgres.database.svc
      port: 5432
```

## Step 4: Combining Secrets and ConfigMaps

A common pattern is to use ConfigMaps for non-sensitive values and Secrets for sensitive ones.

```yaml
# HelmRelease combining ConfigMap and Secret sources
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  valuesFrom:
    # Non-sensitive base configuration from ConfigMap
    - kind: ConfigMap
      name: my-app-config
      valuesKey: values.yaml
    # Sensitive values from Secret (overrides ConfigMap values)
    - kind: Secret
      name: my-app-secrets
      valuesKey: values.yaml
  # Inline values override everything above
  values:
    replicaCount: 3
```

The merge order is: chart defaults, then valuesFrom entries in order, then inline values.

## Step 5: Optional Secret References

Mark a Secret reference as optional if the Secret may not exist in all environments.

```yaml
# HelmRelease with optional Secret reference
spec:
  valuesFrom:
    - kind: Secret
      name: my-app-secrets
      valuesKey: values.yaml
    # Optional Secret for environment-specific overrides
    - kind: Secret
      name: my-app-extra-secrets
      valuesKey: values.yaml
      optional: true
```

When `optional: true` is set, the HelmRelease reconciles successfully even if the Secret does not exist.

## Using SOPS-Encrypted Secrets

In a GitOps workflow, you can use Mozilla SOPS to encrypt Secrets before committing them to Git. Flux has built-in support for SOPS decryption.

```yaml
# encrypted-secret.yaml - SOPS-encrypted Secret (safe to commit to Git)
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secrets
  namespace: default
type: Opaque
stringData:
  values.yaml: ENC[AES256_GCM,data:encrypted-data-here,type:str]
sops:
  kms: []
  gcp_kms: []
  azure_kv: []
  age:
    - recipient: age1...
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-03-05T00:00:00Z"
  mac: ENC[AES256_GCM,data:mac-here,type:str]
  version: 3.7.3
```

Flux's Kustomize Controller decrypts SOPS-encrypted Secrets before they are applied to the cluster, making them available for the Helm Controller to use with `valuesFrom`.

## Verifying Secret-based Values

After applying the HelmRelease, verify the values were applied correctly.

```bash
# Check HelmRelease status
flux get helmreleases -n default

# View the applied values (sensitive values will be visible)
helm get values my-app -n default

# Check for errors in the Helm Controller logs
kubectl logs -n flux-system deploy/helm-controller | grep my-app
```

## Security Considerations

When working with Secrets in valuesFrom, keep the following in mind:

- Never commit plain-text Secrets to Git repositories
- Use SOPS, Sealed Secrets, or External Secrets Operator for Secret management
- Apply least-privilege RBAC to limit which ServiceAccounts can read Secrets
- Enable encryption at rest for Secrets in your Kubernetes cluster
- Audit access to Secrets using Kubernetes audit logging
- The Helm Controller ServiceAccount needs read access to referenced Secrets

## Conclusion

Using `spec.valuesFrom` with Secrets is the recommended way to pass sensitive configuration to Helm charts in Flux CD. It keeps secrets separate from your HelmRelease definitions, supports encryption tools like SOPS for safe Git storage, and integrates cleanly with Kubernetes RBAC. By combining Secrets for sensitive data with ConfigMaps for general configuration and inline values for overrides, you get a layered, secure, and maintainable configuration strategy.
