# How to Enable GnuPG Signature Verification in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GnuPG, Security

Description: Learn how to enable and configure GnuPG signature verification in ArgoCD to ensure only signed Git commits are deployed to your Kubernetes clusters.

---

In a GitOps workflow, the Git repository is the single source of truth for your infrastructure. But what happens if someone gains unauthorized access to the repository and pushes malicious changes? GnuPG (GPG) signature verification adds a cryptographic guarantee that the Git revision deployed by ArgoCD was signed by an authorized key. If a required commit is not signed or signed by an untrusted key, ArgoCD refuses to sync it.

This guide walks through enabling GPG signature verification in ArgoCD from scratch, including key management, project configuration, and handling the operational aspects of running verified deployments.

## How GPG Verification Works in ArgoCD

When GPG verification is enabled for an ArgoCD project, the system checks the target Git revision before syncing. In strict mode, ArgoCD can also verify the reachable commit history:

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Git as Git Repository
    participant AC as ArgoCD Controller
    participant GPG as GPG Keyring

    Dev->>Dev: Sign commit with GPG key
    Dev->>Git: Push signed commit
    AC->>Git: Detect new commit
    AC->>GPG: Verify commit signature
    alt Signature valid and trusted
        GPG-->>AC: Verification passed
        AC->>AC: Proceed with sync
    else Signature invalid or untrusted
        GPG-->>AC: Verification failed
        AC->>AC: Block sync, report error
    end
```

ArgoCD maintains its own GPG keyring, separate from any system keyrings. You import the public keys of trusted signers, and ArgoCD verifies that the required Git revision is signed by one of those keys.

## Prerequisites

Before enabling verification, make sure your developers have GPG signing set up:

```bash
# Generate a GPG key pair (if you don't have one)

gpg --full-generate-key
# Select RSA and RSA, 4096 bits, set expiration

# List your GPG keys
gpg --list-secret-keys --keyid-format long

# Configure Git to sign commits
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# Export the public key for importing into ArgoCD
gpg --armor --export YOUR_KEY_ID > my-public-key.asc
```

## Step 1: Import GPG Keys into ArgoCD

ArgoCD stores GPG public keys in its own keyring. Import each trusted signer's key using the CLI:

```bash
# Import a public key from a file
argocd gpg add --from my-public-key.asc

# List all imported keys
argocd gpg list

# Output:
# KEYID                  TYPE     IDENTITY
# 3AA5C34371567BD2       RSA 4096 John Doe <john@example.com>
# 9B2C5A6E8F3D1E7A       RSA 4096 Jane Smith <jane@example.com>
```

You can also import keys declaratively by creating a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-gpg-keys-cm
  namespace: argocd
  labels:
    app.kubernetes.io/part-of: argocd
data:
  # Key ID as the key, ASCII-armored public key as the value
  3AA5C34371567BD2: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----

    mQINBGV...
    (your ASCII-armored public key here)
    ...
    -----END PGP PUBLIC KEY BLOCK-----
  9B2C5A6E8F3D1E7A: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----

    mQINBGV...
    -----END PGP PUBLIC KEY BLOCK-----
```

Apply the ConfigMap:

```bash
kubectl apply -f argocd-gpg-keys-cm.yaml
```

After importing keys, it may take a short time for the keys to propagate. If the repo-server keyring stays out of sync, restart the ArgoCD repo-server:

```bash
kubectl rollout restart deployment argocd-repo-server -n argocd
```

## Step 2: Enable Verification on a Project

GPG verification is configured at the ArgoCD project level using source integrity policies:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: production
  namespace: argocd
spec:
  description: Production applications - GPG verification required
  sourceRepos:
    - https://github.com/myorg/k8s-production.git
  destinations:
    - namespace: '*'
      server: https://kubernetes.default.svc
  # Enable GPG verification
  sourceIntegrity:
    git:
      policies:
        - repos:
            - url: https://github.com/myorg/k8s-production.git
          gpg:
            mode: head
            keys:
              - "3AA5C34371567BD2"
              - "9B2C5A6E8F3D1E7A"
```

Once the policy is set on a project, applications in that project that match the policy's repository rules require valid signatures. Older ArgoCD versions used the legacy `signatureKeys` field for project-wide verification, but current versions use `sourceIntegrity`.

## Step 3: Verify the Configuration

Test that verification is working:

```bash
# Create a test application in the verified project
argocd app create test-gpg \
  --repo https://github.com/myorg/k8s-production.git \
  --path apps/test \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace test \
  --project production

# Try to sync - this should succeed if the target revision is signed
argocd app sync test-gpg

# Check application status and conditions
argocd app get test-gpg -o json | jq '.status.sync, .status.conditions'
```

If the commit is not signed or signed by an untrusted key, ArgoCD rejects the sync with an error similar to:

```text
rpc error: code = Unknown desc = failed to verify source:
GnuPG verification failed for target revision
```

## Step 4: Check Verification Status

ArgoCD reports GPG verification failures in the application details:

```bash
# Refresh the application and check for sync errors or conditions
argocd app get my-app --refresh
argocd app get my-app -o json | jq '.status.conditions'

# Check the current synced revision
kubectl get application my-app -n argocd \
  -o jsonpath='{.status.sync.revision}'
```

In the ArgoCD UI, GPG verification failures appear in the application's sync or comparison errors.

## Handling Multiple Signers

In team environments, you typically have multiple developers who need to sign commits. Each signer's public key must be imported and listed in the project configuration:

```yaml
# Project with multiple trusted signers
spec:
  sourceIntegrity:
    git:
      policies:
        - repos:
            - url: https://github.com/myorg/k8s-production.git
          gpg:
            mode: head
            keys:
              - "3AA5C34371567BD2"   # Developer 1
              - "9B2C5A6E8F3D1E7A"   # Developer 2
              - "1C4D5E6F7A8B9C0D"   # CI Bot
              - "2D3E4F5A6B7C8D9E"   # Release Manager
```

The target revision only needs to be signed by ANY ONE of the listed keys - not all of them.

## Signing Commits in CI/CD

For automated workflows, your CI system needs a GPG key to sign commits:

```bash
# In your CI pipeline
# Import the signing key (stored as CI secret)
echo "$GPG_PRIVATE_KEY" | gpg --batch --import

# Configure Git
git config user.signingkey "$GPG_KEY_ID"
git config commit.gpgsign true

# Make a signed commit
git add .
git commit -S -m "Automated update: bump image to v2.0"
git push
```

For GitHub Actions:

```yaml
# .github/workflows/deploy.yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Import GPG key
        uses: crazy-max/ghaction-import-gpg@v6
        with:
          gpg_private_key: ${{ secrets.GPG_PRIVATE_KEY }}
          passphrase: ${{ secrets.GPG_PASSPHRASE }}
          git_user_signingkey: true
          git_commit_gpgsign: true

      - name: Make signed commit
        run: |
          # Make changes
          sed -i "s/tag: .*/tag: v2.0/" values.yaml
          git add values.yaml
          git commit -S -m "Update image tag to v2.0"
          git push
```

## Handling Merge Commits

Merge commits on platforms like GitHub can be signed or unsigned depending on the platform and merge method:

- **GitHub**: Commits created through GitHub's web interface and merge buttons are signed with GitHub's GPG key
- **GitLab**: Merge commits can be signed if the server has GPG signing configured
- **Bitbucket**: Merge commits are typically unsigned

If your workflow relies on merge commits, you may need to import the platform's GPG key:

```bash
# Import GitHub's merge signing key
# (Check GitHub docs for the current key)
curl -fsSL https://github.com/web-flow.gpg -o github-web-flow.gpg
argocd gpg add --from github-web-flow.gpg
```

And add GitHub's key ID to your project:

```yaml
spec:
  sourceIntegrity:
    git:
      policies:
        - repos:
            - url: https://github.com/myorg/k8s-production.git
          gpg:
            mode: head
            keys:
              - "3AA5C34371567BD2"   # Your developer
              - "B5690EEEBB952194"   # GitHub web-flow (merge commits)
```

## Key Rotation

When a team member leaves or a key expires, update the configuration:

```bash
# Remove an old key
argocd gpg rm 3AA5C34371567BD2

# Add the new key
argocd gpg add --from new-key.asc

# Update the project
kubectl edit appproject production -n argocd
# Remove old key ID, add new key ID in sourceIntegrity.git.policies[].gpg.keys
```

## Disabling Verification

To disable GPG verification for a project, remove the `sourceIntegrity` field entirely:

```bash
kubectl patch appproject production -n argocd \
  --type json \
  -p '[{"op": "remove", "path": "/spec/sourceIntegrity"}]'
```

Or set the policy mode to `none` for the repositories you want to exempt:

```yaml
spec:
  sourceIntegrity:
    git:
      policies:
        - repos:
            - url: https://github.com/myorg/k8s-production.git
          gpg:
            mode: none
```

## Summary

GnuPG signature verification in ArgoCD adds a critical security layer to your GitOps pipeline by ensuring only cryptographically signed commits from trusted keys can trigger deployments. Enable it by importing public GPG keys into ArgoCD's keyring, then configure source integrity policies on your ArgoCD projects. Make sure all developers and CI systems have GPG signing configured, and plan for key rotation and merge commit signing from your Git platform.
