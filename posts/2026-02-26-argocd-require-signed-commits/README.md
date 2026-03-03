# How to Require Signed Commits for ArgoCD Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GnuPG, Security

Description: Learn how to enforce signed Git commits as a requirement for ArgoCD application deployments to prevent unauthorized changes from being deployed.

---

Requiring signed commits for ArgoCD applications creates a trust chain from developer to deployment. Every change that reaches your Kubernetes cluster must be cryptographically signed by someone you trust. This is not just a security best practice - for regulated industries, it is often a compliance requirement. This guide covers the practical implementation of mandatory commit signing, including enforcement policies, team workflows, and handling edge cases.

## Why Require Signed Commits?

Without commit signing, anyone with push access to your Git repository can deploy changes to your cluster. Even with branch protection rules, there are scenarios where unsigned commits can slip through:

- Force pushes (if allowed)
- Compromised Git credentials
- CI bots making unverified changes
- Merge commits from platforms that do not sign
- Repository administrators bypassing branch protections

GPG signature verification adds a second factor: even if someone pushes to the repository, ArgoCD will refuse to deploy unless the commit carries a valid signature from a trusted key.

## Setting Up the Requirement

### Step 1: Prepare GPG Keys for Your Team

Every person and system that will commit changes needs a GPG key:

```bash
# For each developer
gpg --full-generate-key
# Choose: RSA and RSA, 4096 bits, expiry of 1-2 years

# Export the public key
gpg --armor --export developer@example.com > developer-key.asc

# Configure Git to always sign
git config --global commit.gpgsign true
git config --global tag.gpgsign true
git config --global user.signingkey $(gpg --list-secret-keys --keyid-format long | grep sec | head -1 | awk '{print $2}' | cut -d/ -f2)
```

### Step 2: Create a Key Registry

Maintain a list of all trusted keys and their owners:

```yaml
# gpg-keys/key-registry.yaml (for documentation)
keys:
  - id: 3AA5C34371567BD2
    owner: "Alice Developer"
    email: "alice@example.com"
    expires: "2027-01-01"
    purpose: "Application commits"

  - id: 9B2C5A6E8F3D1E7A
    owner: "Bob Engineer"
    email: "bob@example.com"
    expires: "2027-06-15"
    purpose: "Application commits"

  - id: 1C4D5E6F7A8B9C0D
    owner: "CI Bot"
    email: "ci@example.com"
    expires: "2026-12-31"
    purpose: "Automated image updates"

  - id: 4AEE18F83AFDEB23
    owner: "GitHub web-flow"
    email: "noreply@github.com"
    expires: "never"
    purpose: "GitHub merge commits"
```

### Step 3: Import All Keys into ArgoCD

```bash
# Import all keys from the gpg-keys directory
for keyfile in gpg-keys/*.asc; do
  echo "Importing $keyfile..."
  argocd gpg add --from "$keyfile"
done

# Verify all keys are imported
argocd gpg list
```

Or use the declarative ConfigMap approach:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-gpg-keys-cm
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: argocd
data:
  3AA5C34371567BD2: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    ...alice's key...
    -----END PGP PUBLIC KEY BLOCK-----
  9B2C5A6E8F3D1E7A: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    ...bob's key...
    -----END PGP PUBLIC KEY BLOCK-----
  1C4D5E6F7A8B9C0D: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    ...ci bot's key...
    -----END PGP PUBLIC KEY BLOCK-----
```

### Step 4: Configure Projects to Require Signatures

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production - signed commits required
  sourceRepos:
    - https://github.com/myorg/production-configs.git
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  signatureKeys:
    - keyID: 3AA5C34371567BD2   # Alice
    - keyID: 9B2C5A6E8F3D1E7A   # Bob
    - keyID: 1C4D5E6F7A8B9C0D   # CI Bot
    - keyID: 4AEE18F83AFDEB23   # GitHub merge commits
---
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: staging
  namespace: argocd
spec:
  description: Staging - signed commits required
  sourceRepos:
    - https://github.com/myorg/staging-configs.git
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  signatureKeys:
    - keyID: 3AA5C34371567BD2
    - keyID: 9B2C5A6E8F3D1E7A
    - keyID: 1C4D5E6F7A8B9C0D
    - keyID: 4AEE18F83AFDEB23
```

## Handling CI/CD Automation

Automated systems that update manifests (like image updaters or dependency bots) need their own GPG keys:

### GitHub Actions with Signed Commits

```yaml
name: Update Image Tag
on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: 'New image tag'
        required: true

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.BOT_GITHUB_TOKEN }}

      - name: Import GPG Key
        uses: crazy-max/ghaction-import-gpg@v6
        with:
          gpg_private_key: ${{ secrets.BOT_GPG_PRIVATE_KEY }}
          passphrase: ${{ secrets.BOT_GPG_PASSPHRASE }}
          git_user_signingkey: true
          git_commit_gpgsign: true

      - name: Update and push signed commit
        run: |
          # Update the image tag
          sed -i "s|image: myapp:.*|image: myapp:${{ inputs.image_tag }}|g" \
            apps/my-app/deployment.yaml

          git add apps/my-app/deployment.yaml
          git commit -S -m "chore: update myapp to ${{ inputs.image_tag }}"
          git push
```

### ArgoCD Image Updater with Signed Commits

If you use ArgoCD Image Updater, it needs GPG signing configured:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-image-updater
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-image-updater
          env:
            - name: GIT_COMMIT_SIGNING_KEY
              valueFrom:
                secretKeyRef:
                  name: image-updater-gpg
                  key: key-id
          volumeMounts:
            - name: gpg-keyring
              mountPath: /home/argocd/.gnupg
      volumes:
        - name: gpg-keyring
          secret:
            secretName: image-updater-gpg-keyring
```

## Enforcing Signing at the Git Level Too

For defense in depth, enforce signing at both the Git platform level and ArgoCD:

### GitHub Branch Protection

```text
Repository Settings > Branches > Branch protection rules:
  - Require signed commits: ON
  - Include administrators: ON
```

### GitLab Push Rules

```text
Settings > Repository > Push rules:
  - Reject unsigned commits: ON
```

## Handling Unsigned Historical Commits

When you enable GPG verification on a project that already has applications, existing applications might be tracking unsigned commits. Handle this gracefully:

```bash
# Check current commit signature status for all production apps
for app in $(argocd app list -p production -o name); do
  REVISION=$(argocd app get "$app" -o json | jq -r '.status.sync.revision')
  echo -n "$app ($REVISION): "
  git -C /path/to/repo log --format="%G?" -1 "$REVISION"
done

# G = Good signature
# B = Bad signature
# N = No signature
# U = Good signature with unknown validity
```

If existing applications track unsigned commits, you have two options:

1. Create a new signed commit (even if no changes are needed):
```bash
git commit --allow-empty -S -m "chore: signed commit for GPG verification"
```

2. Temporarily disable verification while migrating:
```yaml
# Remove signatureKeys temporarily
spec:
  signatureKeys: []
```

## Monitoring Verification Failures

Set up alerts for GPG verification failures so you know immediately when someone tries to deploy unsigned changes:

```bash
# Check for verification errors in ArgoCD logs
kubectl logs deployment/argocd-application-controller -n argocd | \
  grep -i "gpg\|signature\|verification"
```

ArgoCD also exposes metrics that can be used with Prometheus:

```yaml
# Alert when sync fails due to GPG verification
groups:
  - name: argocd-gpg
    rules:
      - alert: GPGVerificationFailure
        expr: |
          increase(argocd_app_sync_total{phase="Error"}[5m]) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "ArgoCD sync failure - possible GPG verification issue"
```

## Key Expiration and Rotation

Plan for key rotation before keys expire:

```bash
# Check key expiration dates
argocd gpg list

# Before a key expires:
# 1. Generate a new key for the user
# 2. Import the new key into ArgoCD
argocd gpg add --from new-key.asc

# 3. Update project signatureKeys
kubectl edit appproject production -n argocd

# 4. After all old signed commits are deployed, remove the old key
argocd gpg rm OLD_KEY_ID
```

## Emergency Override

In an emergency, you might need to deploy an unsigned commit. Document the process and restrict it:

```bash
# Emergency: temporarily disable GPG verification for a specific project
# This should require approval from security team
kubectl patch appproject production -n argocd \
  --type json \
  -p '[{"op": "remove", "path": "/spec/signatureKeys"}]'

# Deploy the emergency fix
argocd app sync critical-app

# RE-ENABLE verification immediately after
kubectl patch appproject production -n argocd \
  --type merge \
  -p '{"spec":{"signatureKeys":[{"keyID":"3AA5C34371567BD2"},{"keyID":"9B2C5A6E8F3D1E7A"}]}}'
```

Always re-enable verification after the emergency. Log the override for audit purposes.

## Summary

Requiring signed commits for ArgoCD applications involves importing trusted GPG public keys, configuring the `signatureKeys` field on ArgoCD projects, and ensuring all developers and CI systems sign their commits. The key operational challenges are handling CI automation (which needs its own GPG keys), managing key rotation, and dealing with merge commits from Git platforms. Combined with Git platform-level signing enforcement, this creates a strong trust chain from developer to production deployment.
