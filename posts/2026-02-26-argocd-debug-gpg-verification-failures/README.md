# How to Debug GPG Verification Failures in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GnuPG, Troubleshooting

Description: A practical guide to diagnosing and fixing GPG signature verification failures in ArgoCD when signed commit deployments are blocked unexpectedly.

---

GPG verification failures in ArgoCD can be some of the most frustrating errors to debug. The error messages are often vague, the root cause could be anywhere in the chain from the developer's local Git config to ArgoCD's keyring, and the failure blocks all deployments for affected applications. This guide provides a systematic approach to diagnosing GPG verification failures, covering every common cause and its fix.

## Common Error Messages

### "GnuPG verification required but commit is not signed"

The commit does not have a GPG signature at all:

```text
FATA[0001] rpc error: code = Unknown desc = application spec is invalid:
InvalidSpecError: GnuPG verification required but commit is not signed
```

### "GnuPG signature verification failed"

The commit has a signature, but it could not be verified:

```text
FATA[0001] rpc error: code = Unknown desc = GnuPG signature verification
failed for commit abc123: signature made by unknown key
```

### "GnuPG key not found"

The signing key is not in ArgoCD's keyring:

```text
FATA[0001] rpc error: code = Unknown desc = GnuPG verification failed:
key ID 3AA5C34371567BD2 not found in ArgoCD keyring
```

## Systematic Debugging Process

### Step 1: Identify the Failing Commit

First, find out which commit ArgoCD is trying to verify:

```bash
# Get the target revision for the application
argocd app get my-app -o json | jq '{
  targetRevision: .spec.source.targetRevision,
  syncRevision: .status.sync.revision,
  project: .spec.project
}'

# Get the specific commit SHA that is failing
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.operationState.message}'
```

### Step 2: Check the Commit Signature Locally

Clone the repository and verify the commit signature with your local GPG:

```bash
# Clone the repo
git clone https://github.com/myorg/configs.git /tmp/debug-repo
cd /tmp/debug-repo

# Check the signature on the specific commit
git log --show-signature -1 HEAD

# Expected output for a signed commit:
# gpg: Signature made Thu 26 Feb 2026 10:00:00 AM UTC
# gpg:                using RSA key 3AA5C34371567BD2
# gpg: Good signature from "Alice Developer <alice@example.com>"

# Expected output for an unsigned commit:
# (no gpg lines appear)
```

If the commit is not signed, the developer needs to sign their commits:

```bash
# The developer should configure Git to sign
git config --global commit.gpgsign true
git config --global user.signingkey KEY_ID

# Then amend or create a new signed commit
git commit --amend -S  # Amend with signature
# OR
git commit --allow-empty -S -m "Enable GPG signing"
```

### Step 3: Verify the Key ID

Get the key ID used to sign the commit:

```bash
# Show the key ID that signed the commit
git log --format='%GK' -1 HEAD
# Output: 3AA5C34371567BD2

# Show the signer identity
git log --format='%GS' -1 HEAD
# Output: Alice Developer <alice@example.com>

# Show the verification status
git log --format='%G?' -1 HEAD
# G = Good, B = Bad, U = Unknown validity, N = No signature, E = Expired
```

### Step 4: Check ArgoCD's Keyring

Verify the signing key exists in ArgoCD's keyring:

```bash
# List all keys in ArgoCD
argocd gpg list

# Check for a specific key
argocd gpg get 3AA5C34371567BD2

# If the key is not found, import it
gpg --armor --export 3AA5C34371567BD2 > /tmp/key.asc
argocd gpg add --from /tmp/key.asc
```

Also check the ConfigMap directly:

```bash
# Check the GPG keys ConfigMap
kubectl get configmap argocd-gpg-keys-cm -n argocd -o json | jq '.data | keys'
```

### Step 5: Check the Project Configuration

Verify the project lists the signing key:

```bash
# Get the project's signature key configuration
PROJECT=$(argocd app get my-app -o json | jq -r '.spec.project')

kubectl get appproject "$PROJECT" -n argocd -o json | jq '{
  name: .metadata.name,
  signatureKeys: .spec.signatureKeys
}'
```

Make sure the key ID from Step 3 appears in the project's `signatureKeys` list.

### Step 6: Check the Repo Server

The repo-server handles GPG verification. Check its logs:

```bash
# Check repo-server logs for GPG errors
kubectl logs deployment/argocd-repo-server -n argocd \
  --tail=200 | grep -i "gpg\|gnupg\|signature\|verify"

# Check if the repo-server can access the GPG keyring
kubectl exec deployment/argocd-repo-server -n argocd \
  -c argocd-repo-server -- \
  gpg --list-keys 2>/dev/null
```

## Common Causes and Fixes

### Cause 1: Merge Commits Not Signed

GitHub, GitLab, and Bitbucket create merge commits when PRs are merged. These may or may not be signed:

```bash
# Check if the merge commit (HEAD) is signed
git log --show-signature -1 HEAD

# If it is a GitHub merge commit, check for GitHub's signature
git log --format='%GK %GS' -1 HEAD
# Output: 4AEE18F83AFDEB23 GitHub (web-flow commit signing)
```

**Fix**: Import the Git platform's signing key and add it to the project:

```bash
# Import GitHub's signing key
curl -s https://github.com/web-flow.gpg | argocd gpg add --from -

# Add GitHub's key to the project
kubectl edit appproject production -n argocd
# Add: - keyID: 4AEE18F83AFDEB23
```

### Cause 2: Key Not Imported or Key ID Mismatch

The key ID in the project config might not match the actual signing key:

```bash
# Get the exact key ID used for signing
git log --format='%GK' -1 HEAD
# Output: 3AA5C34371567BD2 (this is the subkey ID)

# ArgoCD might need the master key ID instead
gpg --list-keys --keyid-format long 3AA5C34371567BD2
# Output shows the relationship between master key and subkey
```

GPG keys have master keys and subkeys. Git might sign with a subkey, but ArgoCD's keyring might have the key indexed differently. Make sure the key ID matches exactly.

**Fix**: Import the full key (which includes subkeys) and use the correct key ID:

```bash
# Export the full key with subkeys
gpg --armor --export alice@example.com > /tmp/alice-full-key.asc

# Re-import into ArgoCD
argocd gpg rm 3AA5C34371567BD2 2>/dev/null
argocd gpg add --from /tmp/alice-full-key.asc

# List keys to see the correct ID
argocd gpg list
```

### Cause 3: Key Expired

GPG keys have expiration dates. An expired key will fail verification:

```bash
# Check key expiration
gpg --list-keys --keyid-format long 3AA5C34371567BD2 | grep expires

# Check from ArgoCD
argocd gpg list | grep 3AA5C34371567BD2
```

**Fix**: The key owner needs to extend the expiration or generate a new key:

```bash
# Extend the key expiration (key owner does this)
gpg --edit-key 3AA5C34371567BD2
# gpg> expire
# (set new expiration)
# gpg> save

# Re-export and re-import into ArgoCD
gpg --armor --export 3AA5C34371567BD2 > /tmp/updated-key.asc
argocd gpg rm 3AA5C34371567BD2
argocd gpg add --from /tmp/updated-key.asc
```

### Cause 4: CI Bot Not Signing Commits

Automated tools like image updaters may push unsigned commits:

```bash
# Check if the CI commit is signed
git log --show-signature -1 COMMIT_SHA

# If not signed, check CI pipeline configuration
# The CI pipeline needs GPG_PRIVATE_KEY and signing configured
```

**Fix**: Configure the CI pipeline to sign commits (see the guide on [requiring signed commits](https://oneuptime.com/blog/post/2026-02-26-argocd-require-signed-commits/view)).

### Cause 5: Repo Server Cannot Access GPG Keyring

After importing keys or restarting the repo-server, the keyring might not be properly loaded:

```bash
# Restart the repo-server to reload the keyring
kubectl rollout restart deployment argocd-repo-server -n argocd

# Wait for it to be ready
kubectl rollout status deployment argocd-repo-server -n argocd

# Verify keys are loaded
kubectl exec deployment/argocd-repo-server -n argocd \
  -c argocd-repo-server -- \
  gpg --list-keys --keyid-format long 2>/dev/null
```

### Cause 6: Tracking a Tag Instead of a Branch

If your application tracks a Git tag, the tag itself might need to be signed (annotated tag with GPG signature), not just the commit it points to:

```bash
# Check if a tag is signed
git tag -v v1.0.0

# If not, the tag creator needs to sign it
git tag -s v1.0.0 -m "Release v1.0.0"
```

However, ArgoCD verifies the commit signature, not the tag signature. If the commit pointed to by the tag is not signed, verification will fail.

## Quick Verification Checklist

Run through this checklist when debugging GPG failures:

```bash
#!/bin/bash
# gpg-debug.sh - Quick GPG verification checklist
APP=$1

echo "=== Application: $APP ==="

# Get app details
PROJECT=$(argocd app get "$APP" -o json | jq -r '.spec.project')
REVISION=$(argocd app get "$APP" -o json | jq -r '.status.sync.revision')
REPO=$(argocd app get "$APP" -o json | jq -r '.spec.source.repoURL')

echo "Project: $PROJECT"
echo "Revision: $REVISION"
echo "Repo: $REPO"

# Check project GPG config
echo ""
echo "=== Project GPG Config ==="
kubectl get appproject "$PROJECT" -n argocd -o json | jq '.spec.signatureKeys'

# Check ArgoCD keyring
echo ""
echo "=== ArgoCD GPG Keyring ==="
argocd gpg list

# Check if revision is signed (requires local clone)
echo ""
echo "=== Commit Signature ==="
echo "Run locally: git log --show-signature -1 $REVISION"

echo ""
echo "=== Repo Server Logs ==="
kubectl logs deployment/argocd-repo-server -n argocd --tail=20 | grep -i "gpg\|signature"
```

## Summary

Debugging GPG verification failures in ArgoCD follows a clear path: identify the failing commit, check its signature locally, verify the key exists in ArgoCD's keyring, confirm the project lists the key, and check repo-server logs. The most common causes are unsigned merge commits from Git platforms, missing or expired keys in ArgoCD's keyring, mismatched key IDs, and CI bots that do not sign their commits. A systematic approach using the debugging steps above will resolve most GPG verification issues quickly.
