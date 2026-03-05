# How to Encrypt Secrets with SOPS and GPG for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, GPG, Encryption

Description: Learn how to encrypt Kubernetes secrets using SOPS with GPG keys for secure GitOps secret management with Flux CD.

---

GPG (GNU Privacy Guard) is one of the most established encryption tools available and is fully supported by SOPS for encrypting Kubernetes secrets in a Flux CD GitOps workflow. While Age is newer and simpler, GPG remains widely used in enterprise environments where PGP infrastructure already exists.

This guide walks through setting up GPG-based secret encryption with SOPS and configuring Flux CD to automatically decrypt secrets during reconciliation.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- `sops` CLI installed (v3.7+)
- `gpg` CLI installed (GnuPG 2.x)
- `kubectl` access to your cluster

## Step 1: Generate a GPG Key Pair

Generate a GPG key pair without a passphrase, as Flux needs non-interactive access for decryption.

```bash
# Generate a GPG key pair for SOPS
# The key must not have a passphrase for automated decryption
export KEY_NAME="flux-sops"
export KEY_COMMENT="Flux SOPS secret encryption"

gpg --batch --full-generate-key <<EOF
%no-protection
Key-Type: eddsa
Key-Curve: ed25519
Subkey-Type: ecdh
Subkey-Curve: cv25519
Name-Real: ${KEY_NAME}
Name-Comment: ${KEY_COMMENT}
Name-Email: flux@example.com
Expire-Date: 0
%commit
EOF
```

## Step 2: Retrieve the GPG Key Fingerprint

Get the fingerprint of the newly created key, which you will use when encrypting secrets.

```bash
# List GPG keys and get the fingerprint
gpg --list-secret-keys "${KEY_NAME}"

# Export the fingerprint to an environment variable
export KEY_FP=$(gpg --list-secret-keys "${KEY_NAME}" \
  --with-colons 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')

echo "Key fingerprint: ${KEY_FP}"
```

## Step 3: Export and Store the GPG Key in Kubernetes

Export the GPG private key and create a Kubernetes secret that Flux will use for decryption.

```bash
# Export the GPG secret key and create a Kubernetes secret
gpg --export-secret-keys --armor "${KEY_FP}" | \
  kubectl create secret generic sops-gpg \
    --namespace=flux-system \
    --from-file=sops.asc=/dev/stdin
```

## Step 4: Create a Secret Manifest

Create a standard Kubernetes secret manifest that you will encrypt.

```yaml
# secret.yaml - Plaintext secret to be encrypted
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: default
type: Opaque
stringData:
  db-host: postgres.example.com
  db-user: appuser
  db-password: my-database-password
```

## Step 5: Encrypt the Secret with SOPS and GPG

Use the `sops` CLI with the `--pgp` flag to encrypt the secret using your GPG key.

```bash
# Encrypt the secret file using the GPG fingerprint
sops --encrypt \
  --pgp ${KEY_FP} \
  --encrypted-regex '^(data|stringData)$' \
  secret.yaml > secret.enc.yaml
```

## Step 6: Verify the Encrypted Output

Inspect the encrypted file to confirm that only sensitive fields were encrypted.

```yaml
# secret.enc.yaml - Encrypted output
apiVersion: v1
kind: Secret
metadata:
  name: app-credentials
  namespace: default
type: Opaque
stringData:
  db-host: ENC[AES256_GCM,data:dGVzdA==...,iv:...,tag:...,type:str]
  db-user: ENC[AES256_GCM,data:YXBwdXNlcg==...,iv:...,tag:...,type:str]
  db-password: ENC[AES256_GCM,data:bXktZGF0YWJhc2U=...,iv:...,tag:...,type:str]
sops:
  pgp:
    - created_at: "2026-03-05T00:00:00Z"
      enc: |
        -----BEGIN PGP MESSAGE-----
        ...
        -----END PGP MESSAGE-----
      fp: ABCDEF1234567890ABCDEF1234567890ABCDEF12
  lastmodified: "2026-03-05T00:00:00Z"
  version: 3.7.3
```

## Step 7: Configure the Flux Kustomization

Configure the Flux Kustomization to use the SOPS decryption provider with the GPG secret reference.

```yaml
# clusters/my-cluster/apps-kustomization.yaml
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
  # Enable SOPS decryption with GPG
  decryption:
    provider: sops
    secretRef:
      name: sops-gpg
```

## Step 8: Commit and Verify

Commit the encrypted secret and verify that Flux decrypts it correctly.

```bash
# Remove plaintext and commit encrypted version
rm secret.yaml
git add secret.enc.yaml
git commit -m "Add GPG-encrypted application credentials"
git push

# Wait for reconciliation and verify
flux reconcile kustomization my-app --with-source

# Check the decrypted secret in the cluster
kubectl get secret app-credentials -n default -o yaml
```

## Setting Up .sops.yaml for Team Use

To make encryption consistent across your team, create a `.sops.yaml` configuration file at the root of your repository.

```yaml
# .sops.yaml - Define creation rules for the team
creation_rules:
  # Encrypt secrets in the production path
  - path_regex: clusters/production/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    pgp: ABCDEF1234567890ABCDEF1234567890ABCDEF12

  # Encrypt secrets in the staging path
  - path_regex: clusters/staging/.*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    pgp: 1234567890ABCDEF1234567890ABCDEF12345678
```

With this file in place, team members can encrypt without specifying the key fingerprint each time.

```bash
# Encrypt using rules from .sops.yaml (no flags needed)
sops --encrypt secret.yaml > secret.enc.yaml
```

## Decrypting Locally for Editing

When you need to edit an encrypted secret, use `sops` to decrypt it in place.

```bash
# Open the encrypted file in your editor for editing
sops secret.enc.yaml

# Or decrypt to stdout for inspection
sops --decrypt secret.enc.yaml
```

## GPG Key Management Best Practices

1. **Back up the GPG key securely.** Export it and store in a password manager or hardware security module.

```bash
# Export private key for backup
gpg --export-secret-keys --armor "${KEY_FP}" > flux-sops-key.asc
```

2. **Set a key expiration policy** in production environments and rotate keys regularly.

3. **Distribute only the public key** to team members who need to encrypt secrets.

```bash
# Export public key for team distribution
gpg --export --armor "${KEY_FP}" > flux-sops-public.asc
```

4. **Use separate GPG keys** for different environments (development, staging, production).

## Troubleshooting

If Flux reports decryption failures, check that the GPG secret exists and contains the correct key.

```bash
# Verify the GPG secret exists in the flux-system namespace
kubectl get secret sops-gpg -n flux-system

# Check kustomize-controller logs for decryption errors
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "decryption"

# Verify the key fingerprint matches what was used for encryption
sops --decrypt --extract '["sops"]["pgp"][0]["fp"]' secret.enc.yaml
```

GPG-based SOPS encryption works reliably with Flux CD and is a strong choice for organizations already invested in PGP key infrastructure. For new setups without existing GPG infrastructure, consider Age as a simpler alternative.
