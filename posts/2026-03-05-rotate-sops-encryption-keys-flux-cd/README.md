# How to Rotate SOPS Encryption Keys in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secrets, SOPS, Key Rotation, Security

Description: Learn how to safely rotate SOPS encryption keys in a Flux CD GitOps workflow without disrupting secret decryption.

---

Regular key rotation is a security best practice that limits the impact of a potential key compromise. Rotating SOPS encryption keys in a Flux CD environment requires careful coordination to ensure that Flux can still decrypt all secrets during and after the rotation. This guide walks through the complete key rotation process for Age, GPG, and cloud KMS providers.

## Key Rotation Overview

SOPS key rotation involves three phases:

1. **Generate a new key** and add it alongside the existing key
2. **Re-encrypt all secrets** with the new key using `sops updatekeys`
3. **Remove the old key** from the cluster and repository configuration

During the transition, both keys should be available to the kustomize-controller so that secrets encrypted with either key can be decrypted.

## Rotating Age Keys

### Step 1: Generate a New Age Key

Create a new Age key pair while keeping the old one.

```bash
# Generate a new Age key
age-keygen -o age-new.agekey

# Note the new public key
cat age-new.agekey | grep "public key"
# Example: age1newkey...
```

### Step 2: Update .sops.yaml with Both Keys

Add the new key to your `.sops.yaml` while keeping the old key.

```yaml
# .sops.yaml - Both old and new keys during rotation
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1oldkey...,
      age1newkey...
```

### Step 3: Re-encrypt All Secrets

Use `sops updatekeys` to add the new key to each encrypted file.

```bash
# Update keys for each encrypted file
# This re-encrypts the data key with both the old and new Age keys
find . -name "*.enc.yaml" -exec sops updatekeys {} -y \;
```

### Step 4: Update the Cluster Secret

Create a new Kubernetes secret that contains both Age keys, so Flux can decrypt during the transition.

```bash
# Combine both Age keys into one file
cat age-old.agekey age-new.agekey > age-combined.agekey

# Update the Kubernetes secret
kubectl delete secret sops-age -n flux-system
cat age-combined.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

### Step 5: Commit the Re-encrypted Secrets

Commit all re-encrypted files to Git.

```bash
# Commit the re-encrypted secrets and updated .sops.yaml
git add -A '*.enc.yaml' .sops.yaml
git commit -m "Rotate SOPS Age encryption key"
git push
```

### Step 6: Verify and Remove the Old Key

After confirming all secrets work with the new key, remove the old key.

```bash
# Verify all Kustomizations are healthy
flux get kustomizations

# Update .sops.yaml to only use the new key
# Remove the old key from creation_rules
```

```yaml
# .sops.yaml - Only the new key after rotation
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1newkey...
```

```bash
# Re-encrypt all secrets with only the new key
find . -name "*.enc.yaml" -exec sops updatekeys {} -y \;

# Update the cluster secret to only contain the new key
kubectl delete secret sops-age -n flux-system
cat age-new.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin

# Commit the final state
git add -A '*.enc.yaml' .sops.yaml
git commit -m "Remove old SOPS Age key after rotation"
git push
```

## Rotating GPG Keys

The process for GPG keys follows the same pattern. Generate a new key and update the configuration.

```bash
# Generate a new GPG key
gpg --batch --full-generate-key <<EOF
%no-protection
Key-Type: eddsa
Key-Curve: ed25519
Subkey-Type: ecdh
Subkey-Curve: cv25519
Name-Real: flux-sops-new
Name-Email: flux-new@example.com
Expire-Date: 0
%commit
EOF

# Get the new fingerprint
export NEW_KEY_FP=$(gpg --list-secret-keys "flux-sops-new" \
  --with-colons 2>/dev/null | awk -F: '/^fpr/{print $10; exit}')
```

Update `.sops.yaml` to include both fingerprints during rotation.

```yaml
# .sops.yaml - Both GPG keys during rotation
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    pgp: >-
      OLD_FINGERPRINT,
      NEW_FINGERPRINT
```

```bash
# Re-encrypt all files with both keys
find . -name "*.enc.yaml" -exec sops updatekeys {} -y \;

# Export both private keys and update the cluster secret
(gpg --export-secret-keys --armor OLD_FINGERPRINT; \
 gpg --export-secret-keys --armor ${NEW_KEY_FP}) | \
  kubectl create secret generic sops-gpg \
    --namespace=flux-system \
    --from-file=sops.asc=/dev/stdin \
    --dry-run=client -o yaml | kubectl apply -f -
```

## Rotating Cloud KMS Keys

For cloud KMS providers (AWS KMS, Azure Key Vault, GCP KMS), key rotation is managed by the cloud provider. Create a new key version or a new key and update the SOPS configuration.

```bash
# AWS KMS - Enable automatic key rotation
aws kms enable-key-rotation --key-id <key-id>

# Or create a new KMS key and update .sops.yaml
aws kms create-key --description "SOPS key v2"
```

```yaml
# .sops.yaml - Updated with new KMS key
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    kms: arn:aws:kms:us-east-1:123456789012:key/<new-key-id>
```

```bash
# Re-encrypt all secrets with the new key
find . -name "*.enc.yaml" -exec sops updatekeys {} -y \;
```

## Automation Script for Key Rotation

Automate the re-encryption process with a script that handles all encrypted files.

```bash
#!/bin/bash
# rotate-keys.sh - Re-encrypt all SOPS files after .sops.yaml update

set -euo pipefail

# Find all encrypted files
ENCRYPTED_FILES=$(find . -name "*.enc.yaml" -type f)

echo "Found $(echo "$ENCRYPTED_FILES" | wc -l) encrypted files to update"

for file in $ENCRYPTED_FILES; do
  echo "Updating keys for: $file"
  sops updatekeys "$file" -y
  if [ $? -ne 0 ]; then
    echo "ERROR: Failed to update keys for $file"
    exit 1
  fi
done

echo "All files updated successfully"
echo "Run 'git diff' to review changes before committing"
```

## Verification After Rotation

Always verify that Flux can decrypt all secrets after rotation.

```bash
# Force reconciliation of all Kustomizations
flux reconcile kustomization --all

# Check for any failed Kustomizations
flux get kustomizations | grep -v "True"

# Verify specific secrets are accessible
kubectl get secrets -A -l app.kubernetes.io/managed-by=flux

# Check controller logs for any decryption errors
kubectl logs -n flux-system deployment/kustomize-controller --since=5m | grep -i "error\|decrypt"
```

Key rotation should be performed on a regular schedule, typically every 90 days for high-security environments. Automating the process reduces the risk of human error and ensures consistency across all encrypted files in your repository.
