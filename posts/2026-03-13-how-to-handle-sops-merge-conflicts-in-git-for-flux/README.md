# How to Handle SOPS Merge Conflicts in Git for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Git, Merge Conflicts

Description: Learn strategies for resolving Git merge conflicts in SOPS-encrypted files within your Flux GitOps repository.

---

Merge conflicts in SOPS-encrypted files are particularly challenging because the encrypted content is not human-readable. Standard merge conflict resolution does not work since you cannot meaningfully compare encrypted values. This guide covers strategies and tools for handling SOPS merge conflicts in a Flux repository.

## Why SOPS Merge Conflicts Are Different

When two branches modify the same SOPS-encrypted file, Git detects a conflict in the encrypted content. The conflict markers contain encrypted text that cannot be manually merged. Additionally, SOPS files include a MAC (Message Authentication Code) and metadata that must remain consistent. A naive merge that combines encrypted blocks from both branches produces an invalid SOPS file.

## Common Causes of Merge Conflicts

Merge conflicts in SOPS files typically occur when two developers add different secrets to the same file simultaneously, when a key rotation runs in parallel with a secret value change, when environment configurations are modified on separate branches, or when `.sops.yaml` creation rules change while secrets are being updated.

## Strategy 1: Choose One Side and Re-Apply Changes

The safest approach is to accept one side of the conflict and manually re-apply the other side's changes.

```bash
# When you encounter a merge conflict in an encrypted file
git merge feature-branch
# CONFLICT: secrets/app-secret.yaml

# Option A: Accept the current branch version
git checkout --ours secrets/app-secret.yaml

# Option B: Accept the incoming branch version
git checkout --theirs secrets/app-secret.yaml

# Then manually apply the missing changes
sops secrets/app-secret.yaml
# Edit to add the changes from the other side
# Save and close
```

## Strategy 2: Decrypt, Merge, Re-Encrypt

Decrypt both versions, merge the plaintext, and re-encrypt:

```bash
# Before starting the merge, save decrypted versions from both branches
git stash
git checkout main
sops --decrypt secrets/app-secret.yaml > /tmp/main-secret.yaml

git checkout feature-branch
sops --decrypt secrets/app-secret.yaml > /tmp/feature-secret.yaml

# Now perform the merge
git checkout main
git merge feature-branch
# CONFLICT in secrets/app-secret.yaml

# Merge the decrypted versions manually
diff /tmp/main-secret.yaml /tmp/feature-secret.yaml
# or use a visual merge tool
vimdiff /tmp/main-secret.yaml /tmp/feature-secret.yaml

# Create the merged plaintext version
# Save as /tmp/merged-secret.yaml

# Encrypt the merged result
sops --encrypt /tmp/merged-secret.yaml > secrets/app-secret.yaml

# Stage and complete the merge
git add secrets/app-secret.yaml
git merge --continue

# Clean up
rm /tmp/main-secret.yaml /tmp/feature-secret.yaml /tmp/merged-secret.yaml
```

## Strategy 3: Git Merge Driver for SOPS

Configure a custom Git merge driver that handles SOPS files automatically.

Add to `.gitattributes`:

```
*secret*.yaml merge=sops
*credential*.yaml merge=sops
```

Add to `.git/config` or `~/.gitconfig`:

```ini
[merge "sops"]
  name = SOPS merge driver
  driver = ./scripts/sops-merge-driver.sh %O %A %B %P
```

Create the merge driver script at `scripts/sops-merge-driver.sh`:

```bash
#!/bin/bash
set -euo pipefail

# Arguments from Git:
# %O = ancestor (base)
# %A = current (ours)
# %B = other (theirs)
# %P = path

ANCESTOR="$1"
OURS="$2"
THEIRS="$3"
FILEPATH="$4"

# Create temp directory
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Decrypt all three versions
sops --decrypt "$ANCESTOR" > "$TMPDIR/ancestor.yaml" 2>/dev/null || cp "$ANCESTOR" "$TMPDIR/ancestor.yaml"
sops --decrypt "$OURS" > "$TMPDIR/ours.yaml" 2>/dev/null || cp "$OURS" "$TMPDIR/ours.yaml"
sops --decrypt "$THEIRS" > "$TMPDIR/theirs.yaml" 2>/dev/null || cp "$THEIRS" "$TMPDIR/theirs.yaml"

# Attempt a three-way merge on decrypted content
if git merge-file "$TMPDIR/ours.yaml" "$TMPDIR/ancestor.yaml" "$TMPDIR/theirs.yaml"; then
  # Merge succeeded, re-encrypt
  sops --encrypt "$TMPDIR/ours.yaml" > "$OURS"
  exit 0
else
  # Merge had conflicts, leave conflict markers in the decrypted file
  # Copy the conflicted decrypted file so the developer can resolve it
  cp "$TMPDIR/ours.yaml" "$OURS.decrypted-conflict"
  echo "SOPS merge conflict in $FILEPATH"
  echo "Decrypted conflict saved to ${FILEPATH}.decrypted-conflict"
  echo "Resolve, then run: sops --encrypt ${FILEPATH}.decrypted-conflict > ${FILEPATH}"
  exit 1
fi
```

Make it executable:

```bash
chmod +x scripts/sops-merge-driver.sh
```

## Strategy 4: One Secret Per File

Prevent most merge conflicts by storing each secret in its own file:

```
secrets/
  database-password.yaml
  api-key.yaml
  redis-credentials.yaml
  tls-certificate.yaml
```

Instead of:

```
secrets/
  all-secrets.yaml  # Multiple secrets in one file = frequent conflicts
```

With one secret per file, two developers modifying different secrets never conflict. Use a Kustomize configuration to include all files:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - database-password.yaml
  - api-key.yaml
  - redis-credentials.yaml
  - tls-certificate.yaml
```

## Strategy 5: Rebase Instead of Merge

Rebasing avoids merge commits and makes conflicts easier to handle one commit at a time:

```bash
# Instead of merging
git checkout feature-branch
git rebase main

# If conflict occurs, resolve for each commit individually
git checkout --theirs secrets/app-secret.yaml
sops secrets/app-secret.yaml
# Apply your changes
git add secrets/app-secret.yaml
git rebase --continue
```

## Preventing Merge Conflicts

Coordinate secret changes through team communication. Use a lock file or assign secret file ownership to specific team members. Keep the number of secrets per file small. Avoid long-lived branches that diverge significantly on secret files.

## Verifying After Conflict Resolution

After resolving a merge conflict in a SOPS file:

```bash
# Verify the file is valid SOPS
sops --decrypt secrets/app-secret.yaml > /dev/null
echo "Decryption successful"

# Verify the YAML structure
sops --decrypt secrets/app-secret.yaml | python3 -c "import sys, yaml; yaml.safe_load(sys.stdin)"
echo "YAML structure is valid"

# Verify it is a valid Kubernetes manifest
sops --decrypt secrets/app-secret.yaml | kubectl apply --dry-run=client -f -
echo "Valid Kubernetes manifest"
```

## Conclusion

SOPS merge conflicts require special handling because encrypted content cannot be manually merged. The most reliable approaches are to choose one side and re-apply changes, or to decrypt both sides and merge the plaintext. Structural decisions like using one secret per file and keeping branches short-lived significantly reduce the frequency of SOPS merge conflicts in your Flux repository.
