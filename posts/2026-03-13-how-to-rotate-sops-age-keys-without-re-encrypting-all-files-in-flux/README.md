# How to Rotate SOPS Age Keys Without Re-Encrypting All Files in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Age, Key Rotation, Security

Description: Learn strategies to rotate SOPS age encryption keys in Flux without needing to re-encrypt every secret file in your repository.

---

Key rotation is a critical security practice, but re-encrypting hundreds of SOPS-encrypted files across a large Flux repository can be disruptive and error-prone. This guide presents strategies for rotating age keys used with SOPS in a Flux environment while minimizing the number of files that need to be re-encrypted.

## The Key Rotation Challenge

When a team member leaves, a key is compromised, or your security policy mandates periodic rotation, you need to replace encryption keys. The straightforward approach is to re-encrypt every file with the new key, but in a large repository this can mean touching hundreds of files in a single commit, causing merge conflicts and review overhead.

## Strategy 1: Add New Key Before Removing Old Key

The simplest approach is to add the new key as an additional recipient before removing the old key. This is a two-phase process.

### Phase 1: Add the New Key

Generate a new age key:

```bash
age-keygen -o new-key.agekey
# Note the public key: age1newkey...
```

Update `.sops.yaml` to include both old and new keys:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: >-
      age1oldkey...,
      age1newkey...
```

Run `sops updatekeys` on each encrypted file to add the new key without changing the encrypted values:

```bash
find . -name "*.yaml" -exec grep -l "sops:" {} \; | while read f; do
  sops updatekeys -y "$f"
done
```

The `updatekeys` command re-encrypts only the data key (not the actual secret values) for the new set of recipients. This is much faster than full re-encryption.

### Phase 2: Remove the Old Key

After confirming the new key works in all environments, update `.sops.yaml` to remove the old key:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1newkey...
```

Run `updatekeys` again to remove the old key:

```bash
find . -name "*.yaml" -exec grep -l "sops:" {} \; | while read f; do
  sops updatekeys -y "$f"
done
```

This two-phase approach means files are touched twice (adding and removing keys), but the changes are minimal since only the SOPS metadata changes, not the encrypted values.

## Strategy 2: Gradual File-by-File Rotation

Instead of updating all files at once, rotate keys gradually as files are modified for other reasons.

Update `.sops.yaml` with the new key:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: >-
      age1oldkey...,
      age1newkey...
```

Keep both the old and new private keys available in the cluster:

```bash
cat old-key.agekey new-key.agekey > combined-keys.agekey
kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=combined-keys.agekey \
  --dry-run=client -o yaml | kubectl apply -f -
```

Configure the Flux Kustomization normally:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 10m
  path: ./secrets
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

When anyone edits a secret file, SOPS automatically encrypts it with the new key set from `.sops.yaml`. Over time, all files migrate to the new key. You can track progress:

```bash
# Count files still using only the old key
grep -rl "age1oldkey" --include="*.yaml" . | wc -l

# Count files with the new key
grep -rl "age1newkey" --include="*.yaml" . | wc -l
```

## Strategy 3: Directory-Based Rotation

Rotate keys one directory at a time to limit the scope of each change:

```bash
# Rotate keys for dev environment
for f in clusters/dev/secrets/*.yaml; do
  sops updatekeys -y "$f"
done
git add clusters/dev/secrets/
git commit -m "Rotate SOPS keys for dev environment"

# Later, rotate staging
for f in clusters/staging/secrets/*.yaml; do
  sops updatekeys -y "$f"
done
git add clusters/staging/secrets/
git commit -m "Rotate SOPS keys for staging environment"

# Finally, rotate production
for f in clusters/production/secrets/*.yaml; do
  sops updatekeys -y "$f"
done
git add clusters/production/secrets/
git commit -m "Rotate SOPS keys for production environment"
```

## Updating the Flux Decryption Secret

After rotation, update the Kubernetes secret in each cluster:

```bash
cat new-key.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin \
  --dry-run=client -o yaml | kubectl apply -f -
```

During the transition period when both old and new keys are in use, include both private keys:

```bash
cat old-key.agekey new-key.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Understanding updatekeys vs Re-encryption

The `sops updatekeys` command is different from full re-encryption:

- `updatekeys` re-wraps the data key for new recipients but does not change the encrypted values. The MAC and encrypted data remain the same. This produces minimal diffs.
- Full re-encryption (`sops --rotate --in-place`) generates a new data key and re-encrypts all values. This changes every encrypted field in the file.

For key rotation where the old key holder should no longer have access, `updatekeys` is sufficient because the data key is re-encrypted for only the new recipients.

## Scripting the Rotation

Create a script to automate the rotation:

```bash
#!/bin/bash
set -euo pipefail

# Find all SOPS-encrypted files
ENCRYPTED_FILES=$(find . -name "*.yaml" -exec grep -l "sops:" {} \;)
TOTAL=$(echo "$ENCRYPTED_FILES" | wc -l)
COUNT=0

for f in $ENCRYPTED_FILES; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Updating keys for $f"
  sops updatekeys -y "$f"
done

echo "Key rotation complete. $TOTAL files updated."
```

## Verifying After Rotation

After completing the rotation:

```bash
# Verify decryption works with the new key
SOPS_AGE_KEY_FILE=new-key.agekey sops --decrypt secrets/test-secret.yaml

# Verify the old key no longer works (after phase 2)
SOPS_AGE_KEY_FILE=old-key.agekey sops --decrypt secrets/test-secret.yaml
# Should fail if old key was removed

# Check Flux reconciliation
flux get kustomizations --all-namespaces
```

## Conclusion

Rotating SOPS age keys does not have to mean re-encrypting every file in your repository. By using `sops updatekeys`, adopting a two-phase add-then-remove approach, and optionally rotating directory by directory, you can manage key rotation with minimal disruption to your Flux GitOps workflow. The key is to plan the transition period and ensure both old and new keys are available in the cluster until the rotation is complete.
