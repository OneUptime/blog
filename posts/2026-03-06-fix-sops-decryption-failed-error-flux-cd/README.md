# How to Fix 'SOPS decryption failed' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, SOPS, Secret, Encryption, GitOps, Troubleshooting, Kubernetes

Description: A step-by-step guide to diagnosing and resolving SOPS decryption failures in Flux CD, covering Age keys, GPG keys, and common configuration mistakes.

---

## Introduction

Flux CD integrates with Mozilla SOPS to enable encrypted secrets in your Git repositories. When SOPS decryption fails, your Kustomization resources get stuck in a failed state, and secrets are not created or updated in your cluster. This guide covers the most common causes of SOPS decryption failures and how to fix them.

## Identifying the Error

Check the Kustomization status to confirm the decryption error:

```bash
# List all Kustomizations and their status
kubectl get kustomizations -A

# Get detailed error information
kubectl describe kustomization <name> -n flux-system
```

You will typically see an error like:

```yaml
Status:
  Conditions:
    - Type: Ready
      Status: "False"
      Reason: DecryptionFailed
      Message: "SOPS decryption failed: error decrypting key: could not decrypt data key"
```

Check the kustomize-controller logs for more details:

```bash
# View decryption-related errors in the kustomize-controller
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "decrypt"
```

## Cause 1: Missing Decryption Key in the Cluster

The most common cause is that the SOPS decryption key has not been deployed to the cluster.

### Fix for Age Keys

Age is the recommended encryption method for SOPS with Flux CD.

#### Step 1: Verify the Age Key Exists

```bash
# Check if the SOPS Age secret exists
kubectl get secret sops-age -n flux-system
```

If it does not exist, create it:

```bash
# Create the Age secret from your key file
# The key file should contain your Age private key
kubectl create secret generic sops-age \
  --from-file=age.agekey=/path/to/age-key.txt \
  -n flux-system
```

The age key file should look like this:

```text
# created: 2026-01-01T00:00:00Z
# public key: age1abc123...
AGE-SECRET-KEY-1ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQ
```

#### Step 2: Reference the Key in Your Kustomization

```yaml
# kustomization.yaml
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
  # Decryption configuration for SOPS
  decryption:
    provider: sops
    secretRef:
      # This secret must contain the Age private key
      name: sops-age
```

### Fix for GPG Keys

If you are using GPG instead of Age:

```bash
# Export your GPG private key
gpg --export-secret-keys --armor YOUR_KEY_FINGERPRINT > /tmp/sops-gpg.asc

# Create the secret in the flux-system namespace
kubectl create secret generic sops-gpg \
  --from-file=sops.asc=/tmp/sops-gpg.asc \
  -n flux-system

# Clean up the exported key
rm /tmp/sops-gpg.asc
```

Update the Kustomization to reference the GPG secret:

```yaml
# kustomization-gpg.yaml
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
      # This secret must contain the GPG private key
      name: sops-gpg
```

## Cause 2: Wrong Key Used for Encryption

The encrypted file was created with a different key than the one deployed in the cluster.

### Diagnosing Key Mismatch

```bash
# View the SOPS metadata in your encrypted file to see which key was used
cat path/to/encrypted-secret.yaml | grep -A 20 "sops:"
```

The output shows which keys were used for encryption:

```yaml
sops:
    age:
        - recipient: age1abc123def456...
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-03-01T10:00:00Z"
    version: 3.7.3
```

### Fix: Re-encrypt with the Correct Key

```bash
# First, decrypt the file with the original key
sops --decrypt secret.yaml > /tmp/decrypted-secret.yaml

# Then re-encrypt with the correct key (the one deployed in your cluster)
sops --encrypt \
  --age age1correctkeyhere... \
  /tmp/decrypted-secret.yaml > secret.yaml

# Clean up
rm /tmp/decrypted-secret.yaml
```

### Fix: Update the .sops.yaml Configuration

Make sure your `.sops.yaml` file in the repository root references the correct key:

```yaml
# .sops.yaml
creation_rules:
  # Encrypt all secret files in the cluster directory
  - path_regex: .*.yaml
    encrypted_regex: "^(data|stringData)$"
    age: >-
      age1correctkeyhere...
```

## Cause 3: SOPS Configuration File Missing or Incorrect

SOPS needs a `.sops.yaml` file to know how to decrypt files, or the files must have inline SOPS metadata.

### Verify SOPS Metadata in Encrypted Files

Every SOPS-encrypted file must contain a `sops` section:

```yaml
# Example of a properly encrypted secret
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: default
type: Opaque
data:
    username: ENC[AES256_GCM,data:abc123...,iv:...,tag:...,type:str]
    password: ENC[AES256_GCM,data:def456...,iv:...,tag:...,type:str]
sops:
    kms: []
    gcp_kms: []
    azure_kv: []
    hc_vault: []
    age:
        - recipient: age1abc123...
          enc: |
            -----BEGIN AGE ENCRYPTED FILE-----
            ...
            -----END AGE ENCRYPTED FILE-----
    lastmodified: "2026-03-01T10:00:00Z"
    mac: ENC[AES256_GCM,data:...,iv:...,tag:...,type:str]
    version: 3.7.3
```

### Fix: Re-encrypt Files Properly

```bash
# Encrypt a plain secret file with SOPS
sops --encrypt \
  --encrypted-regex '^(data|stringData)$' \
  --age age1yourpublickey... \
  plain-secret.yaml > encrypted-secret.yaml
```

## Cause 4: Age vs GPG Format Mismatch

If you encrypted with Age but configured GPG decryption (or vice versa), decryption will fail.

### Identifying the Encryption Method

```bash
# Check what encryption method was used
grep -A 5 "sops:" encrypted-secret.yaml
```

If you see `age:` entries, you need an Age key. If you see `pgp:` entries, you need a GPG key.

### Fix: Ensure Consistent Key Format

```bash
# Generate a new Age key if needed
age-keygen -o age-key.txt

# View the public key
cat age-key.txt | grep "public key"

# Create the cluster secret with the Age key
kubectl create secret generic sops-age \
  --from-file=age.agekey=age-key.txt \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Cause 5: Encrypted File Not in the Correct Path

Sometimes the Kustomization path does not include the encrypted files, or files are in unexpected locations.

### Verify File Locations

```bash
# Check what path the Kustomization is reconciling
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.path}'

# List files in the GitRepository artifact
kubectl exec -n flux-system deploy/source-controller -- ls -la /data/gitrepository/flux-system/flux-system/
```

## Cause 6: Key Rotation Issues

After rotating your SOPS keys, old files encrypted with the previous key will fail to decrypt.

### Fix: Re-encrypt All Files After Key Rotation

```bash
# Use SOPS updatekeys to re-encrypt with new keys
# First update .sops.yaml with the new key

# Then run updatekeys on each encrypted file
find . -name "*.enc.yaml" -exec sops updatekeys {} \;

# Or manually re-encrypt each file
for file in $(find . -name "*.enc.yaml"); do
  sops --decrypt "$file" | sops --encrypt --input-type yaml --output-type yaml /dev/stdin > "$file.tmp"
  mv "$file.tmp" "$file"
done
```

### Deploy the New Key to the Cluster

```bash
# Update the cluster secret with the new key
kubectl create secret generic sops-age \
  --from-file=age.agekey=new-age-key.txt \
  -n flux-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Force reconciliation
flux reconcile kustomization my-app --with-source
```

## Quick Troubleshooting Checklist

```bash
# 1. Verify the decryption secret exists
kubectl get secret sops-age -n flux-system

# 2. Verify the Kustomization references the secret
kubectl get kustomization <name> -n flux-system -o yaml | grep -A 3 "decryption"

# 3. Check that the encrypted file has valid SOPS metadata
sops --decrypt encrypted-secret.yaml

# 4. Verify the key matches what was used for encryption
cat encrypted-secret.yaml | grep "recipient"

# 5. Check kustomize-controller logs
kubectl logs -n flux-system deploy/kustomize-controller --tail=100 | grep -i sops

# 6. Force reconciliation after fixes
flux reconcile kustomization <name> --with-source
```

## Summary

SOPS decryption failures in Flux CD typically stem from missing keys, key mismatches, or incorrect configuration. The key steps to resolve these issues are: verify that your decryption secret exists in the cluster, ensure the encryption key matches the decryption key, confirm the SOPS metadata in your encrypted files is valid, and check that your Kustomization resource properly references the decryption secret. After applying any fix, always force a reconciliation to verify the issue is resolved.
