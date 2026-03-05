# How to Migrate from SOPS to External Secrets Operator in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOPS, External Secrets Operator, Secrets Management, Migration

Description: Learn how to migrate your Flux CD secrets management from Mozilla SOPS encrypted secrets to the External Secrets Operator for centralized secret management.

---

Mozilla SOPS is a popular choice for encrypting secrets in Git repositories managed by Flux CD. However, as organizations grow, they often prefer centralizing secrets in dedicated secret management platforms like AWS Secrets Manager, HashiCorp Vault, or Azure Key Vault. The External Secrets Operator (ESO) bridges Kubernetes with these platforms. This guide covers migrating from SOPS-encrypted secrets to ESO in a Flux-managed environment.

## Why Migrate from SOPS to External Secrets Operator

SOPS works well for small teams but has limitations at scale:

- **Key management complexity**: Each cluster or environment may need its own encryption keys.
- **Secret rotation**: Updating a SOPS-encrypted secret requires decrypting, editing, re-encrypting, and committing.
- **Access control**: SOPS does not provide fine-grained access control over individual secrets.
- **Audit logging**: External secret managers provide built-in audit logs for secret access.

ESO addresses these by delegating secret storage to purpose-built platforms while keeping the Kubernetes Secret creation declarative and GitOps-compatible.

## Current SOPS Setup Overview

A typical SOPS setup with Flux includes:

```yaml
# .sops.yaml at the repository root
creation_rules:
  - path_regex: .*.yaml
    encrypted_regex: ^(data|stringData)$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

An encrypted secret in Git:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-database
  namespace: default
type: Opaque
data:
  username: ENC[AES256_GCM,data:...,type:str]
  password: ENC[AES256_GCM,data:...,type:str]
sops:
  age:
    - recipient: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      enc: |
        ...
```

And a Flux Kustomization with decryption enabled:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/secrets
  prune: true
  decryption:
    provider: sops
    secretRef:
      name: sops-age-key
```

## Step 1: Install External Secrets Operator

Deploy ESO using Flux:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: external-secrets
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.external-secrets.io
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: external-secrets
  namespace: external-secrets
spec:
  interval: 1h
  chart:
    spec:
      chart: external-secrets
      version: "0.9.x"
      sourceRef:
        kind: HelmRepository
        name: external-secrets
        namespace: flux-system
  install:
    createNamespace: true
```

## Step 2: Configure the SecretStore

Create a SecretStore or ClusterSecretStore pointing to your external secret provider. Here is an example for AWS Secrets Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: aws-secrets-manager
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

For HashiCorp Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault
spec:
  provider:
    vault:
      server: "https://vault.example.com:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets-sa
            namespace: external-secrets
```

## Step 3: Create Secrets in the External Provider

Before migrating, ensure all secrets exist in your external provider. For each SOPS-encrypted secret, create a corresponding entry:

```bash
# Decrypt the SOPS secret to get the values
sops -d clusters/production/secrets/app-database.yaml

# Create the secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name production/app-database \
  --secret-string '{"username":"myuser","password":"mypassword"}'
```

## Step 4: Create ExternalSecret Resources

Replace each SOPS-encrypted Secret file with an ExternalSecret resource:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-database
  namespace: default
spec:
  refreshInterval: 1h
  secretStoreRef:
    kind: ClusterSecretStore
    name: aws-secrets-manager
  target:
    name: app-database
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: production/app-database
        property: username
    - secretKey: password
      remoteRef:
        key: production/app-database
        property: password
```

The `target.name` matches the original Secret name, so applications referencing the Secret do not need changes.

## Step 5: Migrate One Secret at a Time

To minimize risk, migrate secrets one at a time:

1. Create the secret in your external provider
2. Add the ExternalSecret resource to your Git repository
3. Verify the Kubernetes Secret is created correctly
4. Remove the SOPS-encrypted file from Git
5. Commit and push

Check that the generated Secret matches the original:

```bash
# Compare the old SOPS secret (decrypted) with the ESO-generated secret
kubectl get secret app-database -n default -o yaml
```

## Step 6: Update Flux Kustomization

Once all secrets are migrated, you can remove the SOPS decryption configuration from your Flux Kustomization:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/production/secrets
  prune: true
  # decryption block removed
```

## Step 7: Clean Up SOPS Resources

After confirming all secrets work through ESO:

1. Remove the `.sops.yaml` file if no longer needed
2. Delete the `sops-age-key` secret from the cluster
3. Remove any SOPS-related configuration from Flux

```bash
kubectl delete secret sops-age-key -n flux-system
```

## Rollback Plan

If issues arise during migration, you can keep both systems running simultaneously. The SOPS-encrypted secrets and ExternalSecret resources can coexist as long as they do not target the same Kubernetes Secret name. During the transition period, use a temporary name for the ESO-generated secret and update application references only after verifying it works correctly.

## Troubleshooting

**ExternalSecret stuck in SecretSyncedError**: Check the SecretStore connectivity and authentication. Examine the ExternalSecret status:

```bash
kubectl describe externalsecret app-database -n default
```

**Secret values differ from SOPS version**: Compare the raw values. SOPS secrets may have been base64-encoded in the `data` field, while ESO may use `stringData` semantics depending on the provider configuration.

**Applications failing after migration**: Verify the Secret name, namespace, and key names match exactly. A mismatch in any of these will cause applications to fail to read the secret.

Migrating from SOPS to External Secrets Operator centralizes your secrets management and simplifies rotation and access control. The key to a smooth migration is proceeding one secret at a time and verifying each step before moving to the next.
