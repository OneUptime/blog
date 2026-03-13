# How to Validate SOPS Encrypted Files in CI/CD Pipeline for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, CI/CD, Validation, GitHub Actions

Description: Learn how to validate SOPS-encrypted files in your CI/CD pipeline to ensure all secrets are properly encrypted before merging into your Flux repository.

---

Pre-commit hooks protect against local mistakes, but they can be bypassed. A CI/CD pipeline validation step provides a server-side guarantee that no unencrypted secrets reach your main branch. This guide shows how to set up SOPS validation in CI/CD pipelines for Flux repositories.

## Why CI/CD Validation Matters

Pre-commit hooks run on developer machines and can be skipped with `--no-verify`. Direct pushes to protected branches bypass hooks entirely. CI/CD validation runs in a controlled environment and cannot be bypassed, making it the definitive check for secret encryption compliance.

## What to Validate

Your CI/CD pipeline should check several things:

1. Files in secret directories are SOPS-encrypted
2. Encrypted files have valid SOPS metadata
3. No plaintext sensitive patterns exist in committed YAML files
4. The `.sops.yaml` configuration is valid
5. Encrypted files can be decrypted (optional, requires a key)

## GitHub Actions Workflow

Create `.github/workflows/validate-sops.yaml`:

```yaml
name: Validate SOPS Encryption
on:
  pull_request:
    paths:
      - '**.yaml'
      - '**.yml'
      - '.sops.yaml'

jobs:
  validate-sops:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install SOPS
        run: |
          curl -Lo sops https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          chmod +x sops
          sudo mv sops /usr/local/bin/

      - name: Validate .sops.yaml exists
        run: |
          if [ ! -f .sops.yaml ]; then
            echo "ERROR: .sops.yaml not found in repository root"
            exit 1
          fi
          echo ".sops.yaml found"

      - name: Check secret files are encrypted
        run: |
          EXIT_CODE=0
          for file in $(find . -path './.git' -prune -o -name '*.yaml' -print | grep -iE '(secret|credential|token)'); do
            if [ -f "$file" ]; then
              if ! grep -q "sops:" "$file"; then
                echo "ERROR: $file appears to be a secret file but is not SOPS-encrypted"
                EXIT_CODE=1
              else
                echo "OK: $file is encrypted"
              fi
            fi
          done
          exit $EXIT_CODE

      - name: Check for plaintext sensitive data
        run: |
          EXIT_CODE=0
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD -- '*.yaml' '*.yml' || true)
          for file in $CHANGED_FILES; do
            if [ -f "$file" ] && ! grep -q "sops:" "$file"; then
              if grep -qiE '(password|secret_key|api_key|private_key|access_key):\s*[a-zA-Z0-9]' "$file"; then
                echo "WARNING: $file may contain plaintext sensitive data"
                EXIT_CODE=1
              fi
            fi
          done
          exit $EXIT_CODE

      - name: Validate SOPS metadata structure
        run: |
          EXIT_CODE=0
          for file in $(find . -path './.git' -prune -o -name '*.yaml' -print -exec grep -l "sops:" {} \;); do
            if ! grep -q "lastmodified:" "$file" || ! grep -q "mac:" "$file"; then
              echo "ERROR: $file has incomplete SOPS metadata"
              EXIT_CODE=1
            else
              echo "OK: $file has valid SOPS metadata"
            fi
          done
          exit $EXIT_CODE
```

## GitLab CI Pipeline

Create `.gitlab-ci.yml`:

```yaml
validate-sops:
  stage: validate
  image: alpine:latest
  before_script:
    - apk add --no-cache curl bash grep findutils git
    - curl -Lo /usr/local/bin/sops https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
    - chmod +x /usr/local/bin/sops
  script:
    - |
      EXIT_CODE=0
      for file in $(find . -path './.git' -prune -o -name '*secret*.yaml' -print); do
        if [ -f "$file" ] && ! grep -q "sops:" "$file"; then
          echo "ERROR: Unencrypted secret file: $file"
          EXIT_CODE=1
        fi
      done
      exit $EXIT_CODE
  rules:
    - changes:
        - "**/*.yaml"
        - ".sops.yaml"
```

## Decryption Validation

If you want to verify that encrypted files can actually be decrypted, provide a test key in CI:

```yaml
- name: Validate decryption
  env:
    SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
  run: |
    EXIT_CODE=0
    for file in $(find . -path './.git' -prune -o -name '*.yaml' -exec grep -l "sops:" {} \;); do
      if ! sops --decrypt "$file" > /dev/null 2>&1; then
        echo "ERROR: Cannot decrypt $file"
        EXIT_CODE=1
      else
        echo "OK: $file decrypts successfully"
      fi
    done
    exit $EXIT_CODE
```

Store the age private key as a CI/CD secret. Use a dedicated CI key that is listed as a recipient in `.sops.yaml`.

## Comprehensive Validation Script

Create a reusable validation script at `scripts/validate-sops.sh`:

```bash
#!/bin/bash
set -euo pipefail

ERRORS=0
WARNINGS=0
CHECKED=0

echo "=== SOPS Encryption Validation ==="
echo ""

# Check 1: .sops.yaml exists and is valid
echo "--- Check 1: .sops.yaml configuration ---"
if [ ! -f .sops.yaml ]; then
  echo "ERROR: .sops.yaml not found"
  ERRORS=$((ERRORS + 1))
else
  if ! python3 -c "import yaml; yaml.safe_load(open('.sops.yaml'))" 2>/dev/null; then
    echo "ERROR: .sops.yaml is not valid YAML"
    ERRORS=$((ERRORS + 1))
  else
    echo "OK: .sops.yaml is valid"
  fi
fi

# Check 2: Secret files are encrypted
echo ""
echo "--- Check 2: Secret file encryption ---"
while IFS= read -r -d '' file; do
  CHECKED=$((CHECKED + 1))
  if ! grep -q "sops:" "$file"; then
    echo "ERROR: $file is not SOPS-encrypted"
    ERRORS=$((ERRORS + 1))
  elif ! grep -q "ENC\[AES256_GCM" "$file"; then
    echo "WARNING: $file has SOPS metadata but no encrypted values"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "OK: $file"
  fi
done < <(find . -path './.git' -prune -o \( -name '*secret*' -o -name '*credential*' -o -name '*token*' \) -name '*.yaml' -print0)

# Check 3: No plaintext secrets in any YAML
echo ""
echo "--- Check 3: Plaintext secret patterns ---"
while IFS= read -r -d '' file; do
  if ! grep -q "sops:" "$file"; then
    if grep -qiE 'password:\s*["\x27]?[a-zA-Z0-9]{8,}' "$file" 2>/dev/null; then
      echo "WARNING: Possible plaintext password in $file"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
done < <(find . -path './.git' -prune -o -name '*.yaml' -print0)

# Summary
echo ""
echo "=== Summary ==="
echo "Files checked: $CHECKED"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "VALIDATION FAILED"
  exit 1
fi

echo ""
echo "VALIDATION PASSED"
```

Reference this script from any CI system:

```yaml
- name: Validate SOPS
  run: bash scripts/validate-sops.sh
```

## Branch Protection

Combine CI validation with branch protection rules to prevent merging PRs with unencrypted secrets:

- Require the SOPS validation check to pass before merging
- Require PR reviews for changes to `.sops.yaml`
- Disable direct pushes to the main branch

## Handling False Positives

Some files may contain words like "password" or "secret" as YAML keys without being actual secrets. Handle these with an allowlist:

```bash
# .sops-validation-ignore
# Files that contain secret-like patterns but are not actual secrets
docs/configuration-reference.yaml
examples/sample-deployment.yaml
```

Reference the allowlist in your validation script:

```bash
IGNORE_FILE=".sops-validation-ignore"
if [ -f "$IGNORE_FILE" ]; then
  if grep -qx "$file" "$IGNORE_FILE"; then
    echo "SKIP: $file (in ignore list)"
    continue
  fi
fi
```

## Conclusion

CI/CD validation of SOPS encryption is the last line of defense against plaintext secrets in your Flux repository. By combining file pattern checks, metadata validation, and optional decryption testing, you can catch encryption issues before they reach your main branch. Combined with pre-commit hooks and branch protection rules, this creates a comprehensive security posture for your GitOps workflow.
