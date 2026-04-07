# How to Manage Rook-Ceph Secrets in GitOps Workflows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, GitOps, Secret, Security, Kubernetes

Description: Learn how to securely manage Rook-Ceph secrets in GitOps workflows using Sealed Secrets, External Secrets Operator, and SOPS to avoid storing plaintext credentials in Git.

---

## The Secrets Problem in Rook GitOps

Rook-Ceph generates and uses several sensitive secrets:
- Admin keyring for cluster management
- CSI secrets for RBD and CephFS provisioners
- RGW admin credentials
- External cluster access credentials

Storing these in Git as plaintext is a security risk. This guide covers three solutions.

## Option 1: Sealed Secrets

Sealed Secrets encrypts Kubernetes Secrets so they can be stored in Git safely:

```bash
# Install Sealed Secrets controller
helm install sealed-secrets \
  sealed-secrets/sealed-secrets \
  -n kube-system

# Create and seal the RGW admin secret
kubectl create secret generic rgw-admin-secret \
  --from-literal=access-key=AKIAEXAMPLE \
  --from-literal=secret-key=supersecretkey \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-rgw-admin-secret.yaml
```

Commit `sealed-rgw-admin-secret.yaml` to Git. It can only be decrypted by the Sealed Secrets controller.

## Option 2: External Secrets Operator

For teams using AWS Secrets Manager or Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rook-ceph-admin-keyring
  namespace: rook-ceph
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: rook-ceph-admin-keyring
    template:
      data:
        keyring: |
          [client.admin]
              key = {{ .adminKey }}
  data:
  - secretKey: adminKey
    remoteRef:
      key: ceph/admin-keyring
      property: key
```

```bash
kubectl -n rook-ceph apply -f external-secret.yaml
```

## Option 3: SOPS with Age Encryption

For teams using Flux or ArgoCD with SOPS support:

```bash
# Generate an Age key (the public key is printed to stderr)
age-keygen -o age.agekey
# Extract the public key from the key file
export AGE_PUBLIC_KEY=$(grep 'public key:' age.agekey | sed 's/.*public key: //')

# Encrypt the secret file
sops --age=$AGE_PUBLIC_KEY \
  --encrypt \
  --encrypted-regex '^(data|stringData)$' \
  rook-ceph-rgw-secret.yaml > rook-ceph-rgw-secret.enc.yaml
```

Configure Flux to decrypt SOPS secrets:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: rook-ceph
spec:
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Rook's Auto-Generated Secrets

For secrets that Rook generates automatically (CSI keys, monitor keyring), avoid overriding them in Git. Let Rook manage them:

```bash
# View auto-generated secrets (do not commit these)
kubectl -n rook-ceph get secret rook-ceph-csi-rbd-node \
  -o jsonpath='{.data.userKey}' | base64 -d
```

Only store externally-provided credentials (like RGW admin access keys) in your secrets management tool.

## Summary

Rook-Ceph secrets in GitOps workflows should never be stored as plaintext. Sealed Secrets works well for clusters with static credentials, External Secrets Operator integrates with cloud secret managers, and SOPS with Age provides a file-based encryption approach compatible with both ArgoCD and Flux.
