# How to Migrate SOPS from GPG to Age Encryption in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Age, GPG, Migration

Description: A step-by-step guide to migrating SOPS-encrypted secrets from GPG to age encryption in a Flux GitOps repository.

---

Age is a simpler and more modern alternative to GPG for SOPS encryption. If your Flux repository currently uses GPG-encrypted secrets, migrating to age reduces complexity, eliminates GPG keyring management, and improves the developer experience. This guide walks through the migration process from GPG to age encryption.

## Why Migrate from GPG to Age

GPG is powerful but complex. Key management involves keyrings, trust models, and subkeys. The `gpg` command-line tool has a steep learning curve and inconsistent behavior across versions. Age was designed as a simple, modern encryption tool with a straightforward key format and no configuration required beyond the key itself. Flux supports both, but age is now the recommended approach.

## Prerequisites

Before starting the migration:

- A working Flux setup with GPG-based SOPS decryption
- All GPG private keys available for decrypting existing secrets
- SOPS CLI version 3.7 or later (which supports age)
- The `age` CLI tool installed

## Step 1: Generate an Age Key Pair

Generate a new age key:

```bash
age-keygen -o age.agekey
```

This outputs something like:

```bash
# created: 2026-03-13T10:00:00Z
# public key: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
AGE-SECRET-KEY-1QFZN...
```

Save the public key. Store the private key securely.

## Step 2: Update .sops.yaml

Update your `.sops.yaml` to include both GPG and age keys during the transition:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    pgp: ABCDEF1234567890ABCDEF1234567890ABCDEF12
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Having both keys means files can be decrypted by either GPG or age during the transition period.

## Step 3: Re-encrypt Files with Both Keys

Use `sops updatekeys` to add the age key to existing GPG-encrypted files:

```bash
find . -name "*.yaml" -exec grep -l "sops:" {} \; | while read f; do
  echo "Updating keys for $f"
  sops updatekeys -y "$f"
done
```

After this step, each file can be decrypted by either the GPG key or the age key.

## Step 4: Deploy the Age Key to Flux

Create the age key secret in the cluster:

```bash
cat age.agekey | kubectl create secret generic sops-age \
  --namespace=flux-system \
  --from-file=age.agekey=/dev/stdin
```

Update your Flux Kustomization to reference the age key:

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

## Step 5: Verify Flux Decryption with Age

Push the changes and verify Flux can decrypt using the age key:

```bash
# Check Kustomization status
flux get kustomizations secrets

# Look for decryption errors
flux logs --kind=Kustomization --name=secrets

# Verify secrets exist in the cluster
kubectl get secrets -n default
```

## Step 6: Remove GPG Keys from .sops.yaml

Once you have confirmed that age decryption works in all environments, remove the GPG key from `.sops.yaml`:

```yaml
creation_rules:
  - path_regex: .*\.yaml$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

Run `updatekeys` again to remove GPG from all files:

```bash
find . -name "*.yaml" -exec grep -l "sops:" {} \; | while read f; do
  sops updatekeys -y "$f"
done
```

## Step 7: Clean Up GPG Resources

Remove the GPG key secret from the cluster if it was stored there:

```bash
kubectl delete secret sops-gpg -n flux-system --ignore-not-found
```

Remove GPG references from any Flux Kustomizations that referenced the GPG secret.

## Step 8: Update Developer Workflows

Update team documentation and scripts. Developers should set the `SOPS_AGE_KEY_FILE` environment variable:

```bash
# Add to shell profile
export SOPS_AGE_KEY_FILE=/path/to/age.agekey
```

Or place the key in the default location:

```bash
mkdir -p ~/.config/sops/age
cp age.agekey ~/.config/sops/age/keys.txt
```

SOPS automatically checks `~/.config/sops/age/keys.txt` for age keys.

## Handling Multiple Environments

If you have different GPG keys per environment, generate separate age keys:

```bash
age-keygen -o dev.agekey
age-keygen -o staging.agekey
age-keygen -o production.agekey
```

Update `.sops.yaml` with environment-specific rules:

```yaml
creation_rules:
  - path_regex: clusters/dev/.*\.yaml$
    age: age1devkey...

  - path_regex: clusters/staging/.*\.yaml$
    age: age1stagingkey...

  - path_regex: clusters/production/.*\.yaml$
    age: age1prodkey...
```

Deploy the appropriate key to each cluster.

## Batch Migration Script

Automate the full migration:

```bash
#!/bin/bash
set -euo pipefail

AGE_PUBLIC_KEY="age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p"

echo "Finding SOPS-encrypted files..."
FILES=$(find . -name "*.yaml" -exec grep -l "sops:" {} \;)
TOTAL=$(echo "$FILES" | wc -l)

echo "Found $TOTAL encrypted files"
echo "Updating keys to include age recipient..."

COUNT=0
FAILED=0
for f in $FILES; do
  COUNT=$((COUNT + 1))
  if sops updatekeys -y "$f" 2>/dev/null; then
    echo "[$COUNT/$TOTAL] Updated: $f"
  else
    echo "[$COUNT/$TOTAL] FAILED: $f"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Migration complete: $((COUNT - FAILED)) succeeded, $FAILED failed"
```

## Rollback Plan

If issues arise during migration, you can roll back by reverting the `.sops.yaml` changes and using the GPG key for decryption. Since the transition phase keeps both keys active, no data is lost. Always keep GPG keys available until you have fully validated the age-based setup in all environments.

## Conclusion

Migrating from GPG to age encryption in SOPS simplifies your Flux secret management workflow. The migration can be done gradually using a two-phase approach: first adding age as an additional recipient, then removing GPG after validation. Age's simplicity makes it easier for teams to manage encryption keys without the complexity of GPG keyrings and trust models.
