# How to Organize Secrets Decryption as Dependency in Flux Repository

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets Management, Repository Structure

Description: Learn how to structure your Flux repository so that secrets decryption is properly configured as a dependency before other resources attempt to use decrypted secrets.

---

## The Problem with Secrets Ordering

When managing Kubernetes clusters with Flux, encrypted secrets (using SOPS, Sealed Secrets, or External Secrets Operator) must be decrypted before any workload that references them can start. Without explicit dependency ordering, Flux may attempt to deploy applications before the decryption infrastructure is ready, leading to failed reconciliations and broken deployments.

## Repository Structure

A well-organized Flux repository separates the secrets decryption infrastructure from the workloads that consume secrets:

```
flux-repo/
├── clusters/
│   └── production/
│       ├── infrastructure.yaml
│       ├── secrets.yaml
│       └── apps.yaml
├── infrastructure/
│   ├── sops-gpg/
│   │   └── kustomization.yaml
│   └── controllers/
│       └── kustomization.yaml
├── secrets/
│   └── production/
│       ├── kustomization.yaml
│       ├── database-secret.yaml
│       └── api-keys.yaml
└── apps/
    └── production/
        ├── kustomization.yaml
        └── my-app/
            ├── release.yaml
            └── values.yaml
```

## Defining the Infrastructure Kustomization

First, define the infrastructure layer that installs the secrets operator or configures SOPS decryption:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/controllers
  prune: true
  wait: true
```

The `wait: true` field is critical here. It tells Flux to wait until all resources in this Kustomization are fully ready before reporting success.

## Defining the Secrets Layer

Next, create a Kustomization for the secrets layer that depends on infrastructure:

```yaml
# clusters/production/secrets.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./secrets/production
  prune: true
  wait: true
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

The `dependsOn` field ensures that the infrastructure Kustomization is fully reconciled before Flux attempts to decrypt and apply secrets.

## Defining the Apps Layer

Finally, define the applications layer that depends on both infrastructure and secrets:

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  dependsOn:
    - name: infrastructure
    - name: secrets
  interval: 1h
  retryInterval: 1m
  timeout: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/production
  prune: true
```

## Configuring SOPS Decryption

The SOPS GPG key or age key must be available as a Kubernetes secret before any encrypted secret can be decrypted. Here is how to set up the SOPS secret:

```yaml
# infrastructure/sops-gpg/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - sops-gpg-secret.yaml
```

Create the SOPS key secret (this is typically bootstrapped manually or via a secure pipeline):

```bash
gpg --export-secret-keys --armor "${GPG_KEY_ID}" |
kubectl create secret generic sops-gpg \
  --namespace=flux-system \
  --from-file=sops.asc=/dev/stdin
```

## Encrypted Secret Example

An encrypted secret in the secrets layer looks like this:

```yaml
# secrets/production/database-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: default
type: Opaque
data:
  username: ENC[AES256_GCM,data:abc123...,type:str]
  password: ENC[AES256_GCM,data:def456...,type:str]
sops:
  kms: []
  gcp_kms: []
  azure_kv: []
  hc_vault: []
  age: []
  lastmodified: "2026-03-13T00:00:00Z"
  mac: ENC[AES256_GCM,data:xyz789...,type:str]
  pgp:
    - created_at: "2026-03-13T00:00:00Z"
      enc: |
        -----BEGIN PGP MESSAGE-----
        ...
        -----END PGP MESSAGE-----
  version: 3.7.3
```

## Verifying the Dependency Chain

After applying the configuration, verify the dependency chain is working:

```bash
flux get kustomizations

# Expected output shows the order:
# NAME             READY   STATUS
# infrastructure   True    Applied revision: main/abc123
# secrets          True    Applied revision: main/abc123
# apps             True    Applied revision: main/abc123
```

If any layer fails, downstream layers will not be reconciled:

```bash
flux get kustomizations

# If infrastructure fails:
# NAME             READY   STATUS
# infrastructure   False   validation failed
# secrets          False   dependency 'flux-system/infrastructure' is not ready
# apps             False   dependency 'flux-system/secrets' is not ready
```

## Health Checks for Decryption Resources

Add health checks to ensure the decryption infrastructure is fully operational:

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/controllers
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: sealed-secrets-controller
      namespace: kube-system
```

## Conclusion

Organizing secrets decryption as an explicit dependency in your Flux repository prevents race conditions where applications start before their secrets are available. The three-layer pattern of infrastructure, secrets, and apps provides a clear and reliable deployment order. Always use `dependsOn` and `wait: true` to enforce these relationships, and add health checks to verify that decryption controllers are fully operational before proceeding.
