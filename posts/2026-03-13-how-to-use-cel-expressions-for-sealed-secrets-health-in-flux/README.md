# How to Use CEL Expressions for Sealed Secrets Health in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, CEL, Sealed Secrets, Health Checks, Security

Description: Learn how to use CEL expressions in Flux to verify that Sealed Secrets are properly decrypted and synced before dependent workloads deploy.

---

## Introduction

Sealed Secrets allow you to store encrypted secrets in Git safely. The Sealed Secrets controller decrypts them at runtime and creates standard Kubernetes Secrets. If decryption fails due to key rotation, controller issues, or corruption, your applications will not have the credentials they need. CEL expressions in Flux let you verify that Sealed Secrets are successfully decrypted and synced before workloads that depend on them are deployed.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- Sealed Secrets controller installed (kubeseal)
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Sealed Secrets encrypted with the cluster's sealing key

## Sealed Secret Status Structure

When the Sealed Secrets controller processes a SealedSecret, it updates the resource status with conditions. A successfully synced SealedSecret has a status like:

```yaml
status:
  conditions:
    - type: Synced
      status: "True"
      reason: ""
      message: ""
  observedGeneration: 1
```

If decryption fails, the condition shows:

```yaml
status:
  conditions:
    - type: Synced
      status: "False"
      reason: "ErrUnsealFailed"
      message: "no key could decrypt secret"
```

## Basic CEL Health Check for Sealed Secrets

Use a CEL expression to verify the `Synced` condition:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: database-credentials
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

The corresponding SealedSecret:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  encryptedData:
    DB_PASSWORD: AgBY7z...encrypted...data
    DB_USER: AgCXq...encrypted...data
  template:
    metadata:
      name: database-credentials
      namespace: production
    type: Opaque
```

## Health Checking Multiple Sealed Secrets

When your application depends on several secrets:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: database-credentials
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: api-keys
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: tls-certificates
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: oauth-config
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

## Ordering Secrets Before Applications

Use Kustomization dependencies to deploy and verify secrets before applications:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: sealed-secrets-controller
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/sealed-secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: sealed-secrets-controller
  timeout: 5m
  healthChecks:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: database-credentials
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: api-keys
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: application
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/main
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: app-secrets
  wait: true
  timeout: 5m
```

This chain ensures: sealed-secrets controller is running, then SealedSecrets are decrypted and synced, and finally the application deploys with access to the resulting Kubernetes Secrets.

## Checking Synced Status with ObservedGeneration

For stricter verification, ensure the controller has observed the latest generation of the SealedSecret:

```yaml
healthChecks:
  - apiVersion: bitnami.com/v1alpha1
    kind: SealedSecret
    name: database-credentials
    namespace: production
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
        && has(status.observedGeneration) && status.observedGeneration == metadata.generation
```

This expression verifies that the controller has processed the most recent version of the SealedSecret, not just an older version.

## Per-Namespace Sealed Secrets

When using scoped Sealed Secrets (the default mode), each secret is tied to a specific namespace. Organize your health checks by namespace:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./secrets/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: db-creds
      namespace: production
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./secrets/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: bitnami.com/v1alpha1
      kind: SealedSecret
      name: db-creds
      namespace: staging
      cel:
        healthyWhen: >-
          status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

## Handling Key Rotation

When the Sealed Secrets controller's encryption keys are rotated, existing SealedSecrets encrypted with old keys will still decrypt as long as the old key is available. However, if old keys are removed, the `Synced` condition will change to `False`. Your health check will catch this:

```yaml
healthChecks:
  - apiVersion: bitnami.com/v1alpha1
    kind: SealedSecret
    name: database-credentials
    namespace: production
    cel:
      healthyWhen: >-
        status.conditions.exists(c, c.type == 'Synced' && c.status == 'True')
```

If key rotation causes decryption failures, the Kustomization will report the failure, alerting you to re-seal the affected secrets.

## Debugging Sealed Secret Health Check Failures

When a Sealed Secret health check fails:

```bash
# Check Kustomization status
flux get kustomization app-secrets

# Check SealedSecret status
kubectl get sealedsecret database-credentials -n production -o yaml

# Check conditions
kubectl get sealedsecret database-credentials -n production -o jsonpath='{.status.conditions}' | jq .

# Check controller logs
kubectl logs -n kube-system -l name=sealed-secrets-controller --tail=50

# Verify the decrypted Secret was created
kubectl get secret database-credentials -n production

# Check controller is running
kubectl get pods -n kube-system -l name=sealed-secrets-controller
```

Common Sealed Secret health check failure causes:

- Sealed Secrets controller not installed or not running
- Encryption key has been rotated and old keys removed
- SealedSecret encrypted for a different cluster or namespace
- SealedSecret spec is malformed or corrupted
- RBAC permissions preventing the controller from creating Secrets in the target namespace

## Conclusion

CEL expressions for Sealed Secrets health in Flux verify that your encrypted secrets are successfully decrypted before applications that need them are deployed. By checking the `Synced` condition with CEL and combining it with Kustomization dependencies, you create a deployment pipeline where secret decryption failures are caught early rather than causing cryptic application startup errors. This is especially important after key rotation events or when deploying to new clusters where the sealing keys may differ.
