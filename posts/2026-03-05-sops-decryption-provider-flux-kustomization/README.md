# How to Configure SOPS Decryption Provider in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, Kustomization, Decryption

Description: Learn how to configure the SOPS decryption provider in Flux Kustomization resources for automatic secret decryption during reconciliation.

---

The SOPS decryption provider in Flux CD enables the kustomize-controller to automatically decrypt SOPS-encrypted files during reconciliation. Configuring it correctly is essential for a working GitOps secrets workflow. This guide covers every aspect of the `spec.decryption` configuration in Flux Kustomization resources.

## How SOPS Decryption Works in Flux

When Flux reconciles a Kustomization that has a SOPS decryption provider configured, the kustomize-controller performs these steps:

1. Fetches manifests from the specified source
2. Detects files that contain SOPS metadata
3. Decrypts the encrypted fields using the configured provider
4. Applies the decrypted manifests to the cluster

The decrypted values only exist in memory during reconciliation and are never written back to Git.

## Basic SOPS Decryption Configuration

For key-based decryption, the minimal configuration requires setting the decryption provider to `sops` and referencing a secret that contains the decryption key.

```yaml
# kustomization.yaml - Basic SOPS decryption configuration

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
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Secret Formats for Different Providers

The secret referenced by `spec.decryption.secretRef` must contain specific keys depending on the encryption method used.

### Age Key Secret

For Age encryption, the secret must contain an entry whose key ends with `.agekey`.

```bash
# Create the Age key secret
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

### GPG Key Secret

For OpenPGP encryption, the secret must contain an entry whose key ends with `.asc`.

```bash
# Create the GPG key secret
gpg --export-secret-keys --armor "${KEY_FP}" | \
  kubectl create secret generic sops-gpg \
    --namespace=flux-system \
    --from-file=sops.asc=/dev/stdin
```

### AWS KMS Credentials Secret

For AWS KMS, the secret can contain AWS credentials if IRSA is not being used.

```yaml
# aws-credentials-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sops-aws
  namespace: flux-system
type: Opaque
stringData:
  sops.aws-kms: |
    aws_access_key_id: AKIAIOSFODNN7EXAMPLE
    aws_secret_access_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    aws_session_token: <optional-session-token>
```

### Azure Key Vault Credentials Secret

For Azure Key Vault, the secret contains application certificate credentials.

```yaml
# azure-credentials-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sops-azure
  namespace: flux-system
type: Opaque
stringData:
  sops.azure-kv: |
    tenantId: <azure-tenant-id>
    clientId: <application-client-id>
    clientCertificate: <certificate-and-private-key>
    clientCertificatePassword: <optional-private-key-password>
    clientCertificateSendChain: true
```

### HashiCorp Vault Token Secret

For Vault Transit, the secret contains the Vault token.

```yaml
# vault-token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sops-vault
  namespace: flux-system
type: Opaque
stringData:
  sops.vault-token: <vault-token>
```

## Using Cloud Provider Identity (No secretRef)

When using cloud provider workload identity (IRSA on EKS, Workload Identity on GKE/AKS), Flux can use Kubernetes service account identity instead of static credentials. In this case, you can omit the `secretRef` and set `spec.decryption.serviceAccountName` when using object-level workload identity.

```yaml
# kustomization.yaml - Using cloud provider identity
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
  decryption:
    provider: sops
    serviceAccountName: sops-identity
    # No secretRef needed when using workload identity
```

## Multiple Kustomizations with Different Keys

You can have different Kustomization resources using different decryption keys for different environments.

```yaml
# staging-kustomization.yaml - Staging environment
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: staging-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age-staging
---
# production-kustomization.yaml - Production environment
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: production-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age-production
```

## Combining Multiple Key Types in One Secret

A single decryption secret can contain keys for multiple providers when your repository uses mixed encryption methods.

```bash
# Create a combined secret with both Age and GPG keys
kubectl create secret generic sops-keys \
  --namespace=flux-system \
  --from-file=age.agekey=age.agekey \
  --from-file=sops.asc=sops-gpg-key.asc
```

## Verifying the Decryption Configuration

After setting up the decryption provider, verify that everything works correctly.

```bash
# Check the Kustomization status
flux get kustomizations my-app

# If decryption fails, the status will show the error
kubectl get kustomization my-app -n flux-system -o yaml | grep -A 5 "status:"

# Check kustomize-controller logs for decryption activity
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "sops\|decrypt"

# Force a reconciliation to test immediately
flux reconcile kustomization my-app --with-source
```

## Common Configuration Mistakes

1. **Wrong namespace for the decryption secret.** The secret must be in the same namespace as the Kustomization, such as `flux-system` for a Kustomization in `flux-system`.

2. **Incorrect key name in the secret.** Age expects a key ending with `.agekey`, OpenPGP expects a key ending with `.asc`, and Vault expects `sops.vault-token`.

3. **Missing decryption block entirely.** Without `spec.decryption`, Flux will try to apply SOPS-encrypted files as-is, resulting in mangled secret values.

4. **Referencing a nonexistent secret.** The Kustomization will report a reconciliation error if the referenced secret does not exist.

Properly configuring the SOPS decryption provider is a one-time setup per cluster that enables your entire team to safely store encrypted secrets in Git while Flux handles transparent decryption during deployment.
