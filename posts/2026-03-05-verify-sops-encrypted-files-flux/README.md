# How to Verify SOPS Encrypted Files Before Committing in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Secret, SOPS, Verification, Pre-Commit, CI/CD

Description: Learn how to verify that SOPS-encrypted files are properly encrypted before committing them to your Flux CD Git repository.

---

One of the biggest risks in a SOPS-based GitOps workflow is accidentally committing plaintext secrets to Git. Once a secret is pushed to a remote repository, it is effectively compromised and must be rotated. This guide covers multiple verification strategies -- from pre-commit hooks to CI pipeline checks -- to ensure SOPS-encrypted files are always properly encrypted before they reach your Flux CD repository.

## The Risk of Unencrypted Secrets

Common scenarios that lead to plaintext secrets in Git:

- Running `sops --decrypt` and forgetting to re-encrypt before committing
- Creating a new secret file and forgetting to encrypt it
- Editing an encrypted file outside of `sops` (using a regular text editor)
- Misconfigured `.sops.yaml` that silently fails to encrypt

## Method 1: Pre-commit Hook with Shell Script

Create a Git pre-commit hook that checks all staged `.enc.yaml` files for SOPS metadata.

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Verify all .enc.yaml files are properly SOPS-encrypted

set -euo pipefail

# Find all staged .enc.yaml files
STAGED_ENC_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.enc\.yaml$' || true)

if [ -z "$STAGED_ENC_FILES" ]; then
  exit 0
fi

ERRORS=0

for file in $STAGED_ENC_FILES; do
  # Check 1: File must contain the sops metadata key
  if ! grep -q "^sops:" "$file"; then
    echo "ERROR: $file is missing SOPS metadata. File may be unencrypted."
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check 2: File must contain ENC[] markers in data fields
  if grep -q "^stringData:" "$file"; then
    # Check that stringData values are encrypted
    if ! grep -A 100 "^stringData:" "$file" | grep -q "ENC\[AES256_GCM"; then
      echo "ERROR: $file has unencrypted values in stringData."
      ERRORS=$((ERRORS + 1))
    fi
  fi

  if grep -q "^data:" "$file"; then
    # For base64-encoded data fields, check for ENC markers
    if ! grep -A 100 "^data:" "$file" | grep -q "ENC\[AES256_GCM"; then
      echo "ERROR: $file has unencrypted values in data."
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check 3: Verify SOPS can parse the file
  if ! sops --decrypt --extract '["sops"]["version"]' "$file" > /dev/null 2>&1; then
    echo "ERROR: $file has invalid SOPS metadata."
    ERRORS=$((ERRORS + 1))
  fi

  echo "OK: $file is properly encrypted"
done

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORS file(s) have encryption issues. Encrypt with: sops --encrypt"
  exit 1
fi

echo "All encrypted files verified successfully."
```

Make the hook executable.

```bash
chmod +x .git/hooks/pre-commit
```

## Method 2: Using the pre-commit Framework

Use the popular `pre-commit` framework for a more maintainable setup.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: verify-sops-encryption
        name: Verify SOPS encryption
        entry: bash -c '
          for file in "$@"; do
            if ! grep -q "^sops:" "$file"; then
              echo "ERROR: $file is not encrypted with SOPS"
              exit 1
            fi
          done
        '
        language: system
        files: '\.enc\.yaml$'
        types: [file]
```

Install the hook.

```bash
# Install pre-commit
pip install pre-commit

# Install the hooks
pre-commit install
```

## Method 3: CI Pipeline Verification

Add a verification step to your CI pipeline (GitHub Actions example).

```yaml
# .github/workflows/verify-secrets.yaml
name: Verify SOPS Encryption
on:
  pull_request:
    paths:
      - '**/*.enc.yaml'

jobs:
  verify-encryption:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install SOPS
        run: |
          curl -LO https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          chmod +x sops-v3.8.1.linux.amd64
          sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops

      - name: Verify all .enc.yaml files are encrypted
        run: |
          ERRORS=0
          for file in $(find . -name "*.enc.yaml" -type f); do
            if ! grep -q "^sops:" "$file"; then
              echo "::error file=$file::File is not SOPS encrypted"
              ERRORS=$((ERRORS + 1))
            else
              echo "OK: $file"
            fi
          done
          if [ $ERRORS -gt 0 ]; then
            echo "::error::$ERRORS file(s) are not properly encrypted"
            exit 1
          fi

      - name: Check for plaintext secret patterns
        run: |
          # Look for common secret patterns that should not appear in plaintext
          PATTERNS="password=|secret=|api.key=|token="
          for file in $(find . -name "*.enc.yaml" -type f); do
            # Check stringData values for plaintext (non-ENC patterns)
            if grep -E "^\s+(password|secret|token|key):" "$file" | grep -v "ENC\[" | grep -qv "^#"; then
              echo "::warning file=$file::Possible plaintext secret value detected"
            fi
          done
```

## Method 4: SOPS File Validation Script

Create a comprehensive validation script that can be used locally and in CI.

```bash
#!/bin/bash
# scripts/validate-sops.sh
# Comprehensive SOPS file validation

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0
WARNINGS=0

echo "Scanning for encrypted files..."

# Find all files that should be encrypted
ENC_FILES=$(find "$REPO_ROOT" -name "*.enc.yaml" -type f)

for file in $ENC_FILES; do
  REL_PATH=${file#$REPO_ROOT/}

  # Check 1: SOPS metadata present
  if ! grep -q "^sops:" "$file"; then
    echo "ERROR: [$REL_PATH] Missing SOPS metadata - file is NOT encrypted"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check 2: Verify the encryption provider matches .sops.yaml
  if [ -f "$REPO_ROOT/.sops.yaml" ]; then
    if grep -q "age:" "$REPO_ROOT/.sops.yaml" && ! grep -q "age:" "$file"; then
      echo "WARNING: [$REL_PATH] Expected Age encryption but not found in SOPS metadata"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  # Check 3: Verify mac (Message Authentication Code) is present
  if ! grep -q "mac:" "$file"; then
    echo "ERROR: [$REL_PATH] Missing MAC in SOPS metadata - file may be tampered"
    ERRORS=$((ERRORS + 1))
  fi

  # Check 4: lastmodified timestamp exists
  if ! grep -q "lastmodified:" "$file"; then
    echo "WARNING: [$REL_PATH] Missing lastmodified timestamp"
    WARNINGS=$((WARNINGS + 1))
  fi

  echo "PASS: [$REL_PATH]"
done

# Check for secret files that are NOT encrypted
echo ""
echo "Checking for unencrypted secret files..."
UNENC_SECRETS=$(find "$REPO_ROOT" -name "*secret*.yaml" -not -name "*.enc.yaml" -not -path "*/node_modules/*" -type f || true)

for file in $UNENC_SECRETS; do
  REL_PATH=${file#$REPO_ROOT/}
  if grep -q "kind: Secret" "$file" && grep -q "stringData:\|data:" "$file"; then
    echo "ERROR: [$REL_PATH] Unencrypted Kubernetes Secret found!"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "Results: $ERRORS error(s), $WARNINGS warning(s)"

if [ $ERRORS -gt 0 ]; then
  exit 1
fi
```

## Method 5: Git Diff-Based Verification

Verify that only encrypted content appears in Git diffs.

```bash
# Check the diff of staged files for potential plaintext leaks
git diff --cached -- '*.enc.yaml' | grep "^+" | grep -v "^+++" | \
  grep -v "ENC\[" | grep -v "sops:" | grep -v "mac:" | \
  grep -v "lastmodified:" | grep -v "version:" | \
  grep -E "(password|secret|token|key|credential)" && \
  echo "WARNING: Possible plaintext secret in staged changes" || \
  echo "No plaintext secrets detected in staged changes"
```

## Integrating with .sops.yaml

Your `.sops.yaml` should enforce consistent encryption rules to prevent files from being accidentally left unencrypted.

```yaml
# .sops.yaml - Strict creation rules
creation_rules:
  - path_regex: .*\.enc\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: age1ql3z7hjy54pw3hyww5ayyfg7zqgvc7w3j2elw8zmrj2kg5sfn9aqmcac8p
```

## Best Practices

1. **Name encrypted files consistently** with an `.enc.yaml` suffix to make them easy to identify and filter.

2. **Add `.gitignore` rules** to prevent committing plaintext secret files.

```bash
# .gitignore - Prevent plaintext secrets
**/secret.yaml
**/secrets.yaml
!**/*.enc.yaml
```

3. **Run validation in CI** to catch anything pre-commit hooks miss.

4. **Use branch protection rules** to require CI checks to pass before merging.

5. **Educate your team** on the SOPS workflow: always use `sops --encrypt` for new files and `sops <file>` for editing existing encrypted files.

Verifying SOPS encryption before committing is a critical safeguard for any Flux CD GitOps workflow. Combining pre-commit hooks with CI pipeline checks provides defense in depth against accidental secret exposure.
