# How to Implement Git Commit Signing Verification in Kubernetes Deployment Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Git, Security, CI/CD, Kubernetes, Supply Chain Security

Description: Implement Git commit signing verification in CI/CD pipelines to ensure only code from verified, trusted developers gets deployed to Kubernetes clusters with GPG signature validation.

---

Git commit signing provides cryptographic proof that commits come from trusted developers. Verifying signatures in CI/CD pipelines prevents unauthorized code from reaching production. This guide shows you how to implement commit signature verification as a security gate in Kubernetes deployment workflows, ensuring supply chain integrity from code to deployment.

## Understanding Commit Signing

GPG commit signing attaches a cryptographic signature to each commit using the developer's private key. CI/CD pipelines can verify these signatures against trusted public keys before building and deploying code. This prevents malicious commits from untrusted sources.

## Setting Up GPG for Developers

Generate and configure GPG keys:

```bash
# Generate GPG key
gpg --full-generate-key

# Use RSA, 4096 bits
# Set expiration (1-2 years recommended)

# List keys
gpg --list-secret-keys --keyid-format=long

# Get key ID (after 'rsa4096/')
# Export public key
gpg --armor --export YOUR_KEY_ID > public-key.asc

# Configure Git to use the key
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true
git config --global tag.gpgsign true
```

Sign commits:

```bash
# Commits are now signed automatically
git commit -m "Add feature"

# Verify signature
git log --show-signature -1

# Sign existing commits (rebase)
git rebase --exec 'git commit --amend --no-edit -n -S' -i HEAD~3
```

## Collecting Developer Public Keys

Create a keyring for CI/CD:

```bash
# Create directory for keys
mkdir -p ci/trusted-keys

# Add each developer's public key
# Developers export: gpg --armor --export user@example.com > dev-name.asc
# Add to repo: cp dev-name.asc ci/trusted-keys/

# Import all keys
for key in ci/trusted-keys/*.asc; do
  gpg --import "$key"
done

# Trust keys
gpg --edit-key user@example.com
# Type: trust
# Select: 5 (ultimate)
# Type: quit
```

## Verifying Signatures in CI

GitHub Actions verification workflow:

```yaml
name: Verify Commit Signatures
on: [push, pull_request]

jobs:
  verify-signatures:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Import trusted keys
        run: |
          # Import GPG keys from repository
          for key in ci/trusted-keys/*.asc; do
            gpg --import "$key"
          done

          # Or from secrets
          echo "${{ secrets.TRUSTED_GPG_KEYS }}" | gpg --import

      - name: Verify commit signatures
        run: |
          #!/bin/bash
          set -e

          # Get commits to verify
          if [ "${{ github.event_name }}" == "pull_request" ]; then
            # PR: verify all commits in the PR
            COMMITS=$(git rev-list ${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }})
          else
            # Push: verify pushed commits
            COMMITS=$(git rev-list ${{ github.event.before }}..${{ github.event.after }})
          fi

          # Verify each commit
          FAILED=0
          for commit in $COMMITS; do
            echo "Verifying commit: $commit"

            if ! git verify-commit $commit 2>&1 | grep -q "Good signature"; then
              echo "ERROR: Commit $commit is not signed or has invalid signature"
              git log --format="%H %an <%ae> %s" -n 1 $commit
              FAILED=1
            else
              echo "✓ Commit $commit has valid signature"
              git log --format="%H %an <%ae> %s" -n 1 $commit
            fi
          done

          if [ $FAILED -eq 1 ]; then
            echo "One or more commits failed signature verification"
            exit 1
          fi

          echo "All commits verified successfully"

      - name: Block unsigned commits
        if: failure()
        run: |
          echo "::error::Unsigned or improperly signed commits detected"
          echo "All commits must be signed with trusted GPG keys"
          exit 1
```

## GitLab CI Verification

Verify signatures in GitLab:

```yaml
stages:
  - verify
  - build
  - deploy

verify-signatures:
  stage: verify
  image: alpine:latest
  before_script:
    - apk add --no-cache git gnupg
  script:
    - |
      # Import trusted keys
      for key in ci/trusted-keys/*.asc; do
        gpg --import "$key"
      done

      # Get commits to verify
      git fetch origin $CI_MERGE_REQUEST_TARGET_BRANCH_NAME
      COMMITS=$(git rev-list origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME..HEAD)

      # Verify each commit
      for commit in $COMMITS; do
        if ! git verify-commit $commit; then
          echo "Commit $commit verification failed"
          exit 1
        fi
      done
  only:
    - merge_requests

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
  needs:
    - verify-signatures
```

## Tekton Verification Task

Create a Tekton task for signature verification:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: verify-commit-signatures
spec:
  params:
    - name: repo-url
    - name: revision
    - name: base-revision
      default: ""

  workspaces:
    - name: source

  steps:
    - name: clone
      image: gcr.io/tekton-releases/github.com/tektoncd/pipeline/cmd/git-init:latest
      script: |
        #!/bin/sh
        git clone $(params.repo-url) $(workspaces.source.path)
        cd $(workspaces.source.path)
        git checkout $(params.revision)

    - name: import-keys
      image: alpine:latest
      script: |
        #!/bin/sh
        apk add --no-cache gnupg

        # Import keys from ConfigMap or workspace
        for key in /keys/*.asc; do
          gpg --import "$key"
        done
      volumeMounts:
        - name: trusted-keys
          mountPath: /keys

    - name: verify-signatures
      image: alpine:latest
      workingDir: $(workspaces.source.path)
      script: |
        #!/bin/sh
        set -e

        apk add --no-cache git gnupg

        # Determine commits to verify
        if [ -n "$(params.base-revision)" ]; then
          COMMITS=$(git rev-list $(params.base-revision)..$(params.revision))
        else
          COMMITS=$(params.revision)
        fi

        # Verify each commit
        for commit in $COMMITS; do
          echo "Verifying commit: $commit"

          if git verify-commit $commit 2>&1 | grep -q "Good signature"; then
            echo "✓ Valid signature for commit $commit"
          else
            echo "✗ Invalid or missing signature for commit $commit"
            exit 1
          fi
        done

  volumes:
    - name: trusted-keys
      configMap:
        name: gpg-trusted-keys
```

Create ConfigMap with keys:

```bash
kubectl create configmap gpg-trusted-keys \
  --from-file=ci/trusted-keys/ \
  -n tekton-pipelines
```

## Extracting Signer Information

Get commit author and signer:

```bash
# Show commit with signature
git log --show-signature -1

# Extract signer email
git log --format="%G? %GS %s" -1

# %G? = G (good), B (bad), U (unknown), N (no signature)
# %GS = signer name/email
```

Validate in pipeline:

```yaml
- name: Verify authorized signers
  run: |
    ALLOWED_SIGNERS="user1@example.com user2@example.com user3@example.com"

    for commit in $COMMITS; do
      SIGNER=$(git log --format="%GS" -n 1 $commit)
      VERIFIED=$(git log --format="%G?" -n 1 $commit)

      if [ "$VERIFIED" != "G" ]; then
        echo "Commit $commit has invalid signature"
        exit 1
      fi

      if ! echo "$ALLOWED_SIGNERS" | grep -q "$SIGNER"; then
        echo "Commit $commit signed by unauthorized user: $SIGNER"
        exit 1
      fi

      echo "✓ Commit $commit signed by authorized user: $SIGNER"
    done
```

## Integrating with Branch Protection

Require signed commits in GitHub:

```bash
# Via GitHub CLI
gh api repos/owner/repo/branches/main/protection \
  --method PUT \
  --field required_signatures[enabled]=true

# Via API
curl -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/owner/repo/branches/main/protection/required_signatures \
  -d '{"enabled":true}'
```

## Handling Key Rotation

Update keys in CI/CD:

```bash
# Export new key
gpg --armor --export new-key-id > ci/trusted-keys/user-new.asc

# Keep old key temporarily
# Don't remove old key immediately

# After transition period, remove old key
rm ci/trusted-keys/user-old.asc

# Commit changes
git add ci/trusted-keys/
git commit -S -m "Update GPG keys for user"
```

## Verifying Tag Signatures

Verify signed tags:

```yaml
- name: Verify release tag
  if: startsWith(github.ref, 'refs/tags/')
  run: |
    TAG=${GITHUB_REF#refs/tags/}

    # Import keys
    for key in ci/trusted-keys/*.asc; do
      gpg --import "$key"
    done

    # Verify tag signature
    if git verify-tag $TAG 2>&1 | grep -q "Good signature"; then
      echo "✓ Tag $TAG has valid signature"
    else
      echo "✗ Tag $TAG has invalid or missing signature"
      exit 1
    fi
```

## Monitoring and Alerts

Track unsigned commits:

```yaml
- name: Report unsigned commits
  if: failure()
  run: |
    # Send alert
    curl -X POST $SLACK_WEBHOOK \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "⚠️ Unsigned commits detected",
        "attachments": [{
          "color": "danger",
          "fields": [{
            "title": "Repository",
            "value": "${{ github.repository }}",
            "short": true
          }, {
            "title": "Branch",
            "value": "${{ github.ref }}",
            "short": true
          }]
        }]
      }'
```

## Conclusion

Implementing Git commit signing verification in CI/CD pipelines adds a crucial security layer to your deployment process. By verifying that every commit comes from a trusted, authenticated developer, you prevent unauthorized code changes and maintain supply chain integrity. Combined with branch protection rules and comprehensive key management, commit signing creates a verifiable chain of custody from developer workstation to production deployment. This approach strengthens security while maintaining development velocity through automation.
