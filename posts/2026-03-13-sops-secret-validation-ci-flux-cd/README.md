# How to Configure SOPS Secret Validation in CI for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, SOPS, Secrets Management, CI/CD, GitOps, Security, Age, KMS

Description: Learn how to validate SOPS-encrypted secrets in CI pipelines before merging to your Flux CD fleet repository to prevent misconfigured secrets from reaching the cluster.

---

## Introduction

SOPS (Secrets OPerationS) is the standard tool for encrypting Kubernetes secrets that are stored in Git repositories managed by Flux CD. When a developer adds or modifies a SOPS-encrypted secret, several things can go wrong: the file may be committed unencrypted, encrypted with the wrong key, or corrupted during editing. Any of these failures will cause Flux CD to either apply plaintext secrets to Git or fail decryption in the cluster.

Adding SOPS validation to your CI pipeline catches these mistakes before merge. The validation checks that files are properly encrypted, uses the correct key recipients, and that the SOPS metadata is intact. It does not require access to the decryption key, making it safe to run in CI with read-only secret access.

This guide covers configuring GitHub Actions to validate SOPS-encrypted secrets in a Flux CD fleet repository.

## Prerequisites

- A Flux CD fleet repository using SOPS for secret encryption
- SOPS encrypted with Age keys or AWS/GCP/Azure KMS
- `.sops.yaml` configuration file in your repository
- `sops` CLI installed
- CI system with access to a public validation key (not the decryption private key)

## Step 1: Understand SOPS Validation Requirements

SOPS validation in CI checks:

1. **Encryption status**: Files that should be encrypted are not committed in plaintext
2. **Recipient validation**: Encrypted files include the correct public key recipients
3. **Metadata integrity**: The SOPS metadata block is present and not corrupted
4. **Schema validation**: After decryption (in environments with the key), the Kubernetes Secret schema is valid

CI should only need public key information to verify encryption; decryption should happen only in the cluster.

## Step 2: Configure .sops.yaml

```yaml
# .sops.yaml - at the root of your fleet repository
creation_rules:
  # Production secrets - encrypted with production Age key
  - path_regex: clusters/production/secrets/.*\.yaml$
    age: >-
      age1qlzh66kzdqqxl24g0vhxh5e0n7jj0nkr6w9w3k6zfjxnxyzxxx
    encrypted_regex: ^(data|stringData)$

  # Staging secrets - encrypted with staging Age key
  - path_regex: clusters/staging/secrets/.*\.yaml$
    age: >-
      age1stagingkeyxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyzxyz
    encrypted_regex: ^(data|stringData)$
```

## Step 3: Write a SOPS Validation Script

```bash
#!/bin/bash
# scripts/validate-sops.sh

set -euo pipefail

ERRORS=0

echo "=== Validating SOPS-encrypted secrets ==="

# Find all files that should be SOPS-encrypted based on .sops.yaml patterns
find . -path '*/secrets/*.yaml' | while read -r file; do
  echo "Checking: $file"

  # Check that the file contains SOPS metadata (i.e., it IS encrypted)
  if ! grep -q 'sops:' "$file"; then
    echo "ERROR: $file appears to be unencrypted (no 'sops:' metadata found)"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check for SOPS version metadata
  if ! grep -q 'version:' "$file"; then
    echo "ERROR: $file SOPS metadata is missing version field"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Verify the mac and other fields are present (indicates complete encryption)
  if ! grep -q 'mac:' "$file"; then
    echo "ERROR: $file is missing SOPS MAC - file may be corrupted"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  echo "OK: $file"
done

# Check for accidentally committed raw Kubernetes secrets
find . -name '*.yaml' -not -path '*/flux-system/*' | xargs grep -l 'kind: Secret' 2>/dev/null | while read -r file; do
  # If it contains 'kind: Secret' but no 'sops:' metadata in secrets/ dir, flag it
  if echo "$file" | grep -q '/secrets/' && ! grep -q 'sops:' "$file"; then
    echo "CRITICAL: $file contains a Kubernetes Secret but is NOT SOPS-encrypted!"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo "=== VALIDATION FAILED: $ERRORS error(s) found ==="
  exit 1
fi

echo "=== SOPS validation passed ==="
```

## Step 4: Integrate Into GitHub Actions

```yaml
# .github/workflows/validate-secrets.yml
name: Validate SOPS Secrets

on:
  pull_request:
    paths:
      - 'clusters/**/secrets/**'
      - '.sops.yaml'

jobs:
  validate-sops:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install SOPS
        run: |
          SOPS_VERSION="v3.8.1"
          curl -sLO "https://github.com/getsops/sops/releases/download/${SOPS_VERSION}/sops-${SOPS_VERSION}.linux.amd64"
          chmod +x sops-${SOPS_VERSION}.linux.amd64
          sudo mv sops-${SOPS_VERSION}.linux.amd64 /usr/local/bin/sops

      - name: Validate SOPS encryption
        run: |
          chmod +x scripts/validate-sops.sh
          ./scripts/validate-sops.sh

      - name: Validate SOPS recipient keys
        run: |
          # Check that each encrypted file uses the expected recipients
          find . -path '*/secrets/*.yaml' -exec grep -q 'sops:' {} \; -print | while read -r file; do
            echo "Checking recipients in: $file"
            # Extract recipient fingerprints from the file
            # (SOPS stores public key info in the metadata)
            sops --input-type yaml --output-type yaml \
              filestatus "$file" 2>/dev/null || \
              echo "WARNING: Could not verify recipients for $file"
          done

      - name: Check for plaintext secrets in git history
        run: |
          # Scan the diff for potential plaintext secret values
          git diff origin/main...HEAD -- '*/secrets/*.yaml' | grep '^+' | \
            grep -v '^+++' | \
            grep -iE '(password|secret|token|key):\s*[A-Za-z0-9+/]{8,}' && \
            echo "ERROR: Possible plaintext secret value detected in diff!" && exit 1 || \
            echo "No plaintext secrets detected in diff"
```

## Step 5: Validate Secret Decryption in a Secure CI Environment

If your CI environment has access to the decryption key (e.g., staging CI), validate full decryption:

```yaml
      - name: Validate full decryption (staging CI only)
        if: env.SOPS_AGE_KEY != ''
        env:
          SOPS_AGE_KEY: ${{ secrets.STAGING_SOPS_AGE_KEY }}
        run: |
          find . -path '*/clusters/staging/secrets/*.yaml' | while read -r file; do
            echo "Decrypting: $file"
            # Decrypt and validate Kubernetes schema
            sops --decrypt "$file" | kubectl apply --dry-run=client -f - && \
              echo "OK: $file decrypts and validates" || \
              echo "ERROR: $file failed decryption or validation"
          done
```

## Step 6: Configure Pre-commit Hooks to Prevent Plaintext Commits

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/getsops/sops
    rev: v3.8.1
    hooks:
      - id: sops-check
        args: ['--input-type', 'yaml']
```

## Best Practices

- Never store the SOPS decryption private key in CI environment variables for production clusters; use it only in the cluster's Flux SOPS controller.
- Use separate Age keys per environment (staging, production) so a compromised staging key cannot decrypt production secrets.
- Add a pre-commit hook that runs the same validation script locally to catch issues before push.
- Scan git diffs in CI for patterns that look like plaintext base64-encoded secret values, which indicate accidental decryption.
- Rotate SOPS keys periodically and re-encrypt all secrets with the new key as part of your security rotation process.
- Document the SOPS key rotation procedure in a runbook and store the procedure (not the keys) in Git.

## Conclusion

SOPS validation in CI adds an essential safety net for GitOps repositories that store encrypted secrets. By catching unencrypted files, wrong key recipients, and corrupted metadata before merge, you prevent the two most common SOPS-related Flux CD failures: plaintext secrets in Git and failed cluster-side decryption.
