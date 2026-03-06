# How to Validate SOPS Encrypted Files for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, sops, encryption, secrets, validation, gitops, kubernetes

Description: A practical guide to validating SOPS-encrypted secret files used in Flux CD GitOps workflows to prevent deployment failures.

---

Managing secrets in a GitOps workflow requires encryption, and Mozilla SOPS is one of the most popular tools for encrypting Kubernetes secrets in Flux CD repositories. However, a corrupted or improperly encrypted file can break your entire deployment pipeline. This guide covers how to validate SOPS-encrypted files before they reach your cluster.

## Prerequisites

Before you begin, make sure you have:

- A running Kubernetes cluster with Flux CD installed
- SOPS CLI installed locally
- Age or GPG keys configured for encryption
- Access to your Flux CD Git repository

## Understanding SOPS Encryption in Flux CD

Flux CD decrypts SOPS-encrypted files at reconciliation time using the `kustomize-controller`. The controller needs access to the decryption key, typically stored as a Kubernetes secret.

### How Flux CD Decrypts Secrets

```yaml
# flux-system/gotk-sync.yaml
# This Kustomization tells Flux to decrypt SOPS secrets
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Enable SOPS decryption
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Setting Up SOPS Configuration

Create a `.sops.yaml` configuration file in the root of your repository to define encryption rules.

```yaml
# .sops.yaml
# Defines which files to encrypt and with which keys
creation_rules:
  # Encrypt all secret files in the clusters directory
  - path_regex: clusters/.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1helqcqsh9464r8chnwg2fhfq9cmt0dgx7rshjhqm3dl3rq0wrssqlc5d0
  # Encrypt all secret files in the infrastructure directory
  - path_regex: infrastructure/.*secret.*\.yaml$
    encrypted_regex: ^(data|stringData)$
    age: >-
      age1helqcqsh9464r8chnwg2fhfq9cmt0dgx7rshjhqm3dl3rq0wrssqlc5d0
```

## Creating a Sample Encrypted Secret

```yaml
# infrastructure/secrets/database-secret.yaml (before encryption)
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: production
type: Opaque
stringData:
  username: admin
  password: super-secret-password
  connection-string: "postgresql://admin:super-secret-password@db:5432/myapp"
```

Encrypt it with SOPS:

```bash
# Encrypt the secret file using SOPS with the .sops.yaml config
sops --encrypt --in-place infrastructure/secrets/database-secret.yaml
```

## Validation Strategy 1: Verify SOPS File Structure

The first validation step checks that encrypted files have the correct SOPS metadata.

```bash
#!/bin/bash
# scripts/validate-sops-structure.sh
# Validates that SOPS-encrypted files contain required metadata

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

echo "Validating SOPS-encrypted files..."

# Find all files that should be encrypted based on .sops.yaml patterns
find "$REPO_ROOT" -name "*.yaml" -path "*/secrets/*" | while read -r file; do
  echo "Checking: $file"

  # Verify the file contains SOPS metadata
  if ! grep -q "sops:" "$file"; then
    echo "ERROR: $file does not contain SOPS metadata"
    echo "  This file appears to be unencrypted"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Verify the SOPS version field exists
  if ! grep -q "version:" "$file"; then
    echo "ERROR: $file is missing SOPS version field"
    ERRORS=$((ERRORS + 1))
  fi

  # Verify the MAC (Message Authentication Code) exists
  if ! grep -q "mac:" "$file"; then
    echo "ERROR: $file is missing SOPS MAC field"
    ERRORS=$((ERRORS + 1))
  fi

  # Verify encrypted_regex was applied
  if grep -qE "^(data|stringData):" "$file"; then
    # Check if the values under data/stringData are actually encrypted
    if grep -A1 "data:" "$file" | grep -qvE "(ENC\[|sops|data:)"; then
      echo "WARNING: $file may contain unencrypted data fields"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Validation failed with $ERRORS error(s)"
  exit 1
fi

echo "All SOPS-encrypted files passed validation"
```

## Validation Strategy 2: Test Decryption

Verify that encrypted files can actually be decrypted with the available keys.

```bash
#!/bin/bash
# scripts/validate-sops-decryption.sh
# Tests that SOPS files can be decrypted successfully

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

# Ensure the decryption key is available
if [ -z "${SOPS_AGE_KEY_FILE:-}" ] && [ -z "${SOPS_AGE_KEY:-}" ]; then
  echo "WARNING: No SOPS age key configured"
  echo "Set SOPS_AGE_KEY_FILE or SOPS_AGE_KEY environment variable"
  exit 1
fi

echo "Testing SOPS decryption..."

find "$REPO_ROOT" -name "*.yaml" -path "*/secrets/*" | while read -r file; do
  echo "Decrypting: $file"

  # Attempt to decrypt the file to /dev/null
  if ! sops --decrypt "$file" > /dev/null 2>&1; then
    echo "ERROR: Failed to decrypt $file"
    echo "  Possible causes:"
    echo "  - Wrong decryption key"
    echo "  - Corrupted encryption"
    echo "  - Invalid SOPS metadata"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: Decryption successful"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Decryption validation failed with $ERRORS error(s)"
  exit 1
fi

echo "All SOPS files decrypted successfully"
```

## Validation Strategy 3: Validate Decrypted YAML Structure

After decryption, validate that the resulting YAML is a valid Kubernetes resource.

```bash
#!/bin/bash
# scripts/validate-sops-k8s.sh
# Validates that decrypted SOPS files produce valid Kubernetes manifests

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
TEMP_DIR=$(mktemp -d)
ERRORS=0

# Clean up temp directory on exit
trap "rm -rf $TEMP_DIR" EXIT

echo "Validating decrypted Kubernetes manifests..."

find "$REPO_ROOT" -name "*.yaml" -path "*/secrets/*" | while read -r file; do
  BASENAME=$(basename "$file")
  DECRYPTED="$TEMP_DIR/$BASENAME"

  # Decrypt to a temporary file
  if sops --decrypt "$file" > "$DECRYPTED" 2>/dev/null; then
    # Validate the YAML syntax
    if ! python3 -c "import yaml; yaml.safe_load(open('$DECRYPTED'))" 2>/dev/null; then
      echo "ERROR: $file produces invalid YAML after decryption"
      ERRORS=$((ERRORS + 1))
      continue
    fi

    # Validate against Kubernetes API using kubectl dry-run
    if ! kubectl apply --dry-run=client -f "$DECRYPTED" 2>/dev/null; then
      echo "ERROR: $file produces invalid Kubernetes manifest"
      ERRORS=$((ERRORS + 1))
      continue
    fi

    echo "OK: $file is valid"
  else
    echo "SKIP: Could not decrypt $file (key not available)"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Kubernetes validation failed with $ERRORS error(s)"
  exit 1
fi

echo "All decrypted manifests are valid Kubernetes resources"
```

## Validation Strategy 4: Detect Unencrypted Secrets

Prevent accidental commits of unencrypted secrets.

```bash
#!/bin/bash
# scripts/detect-unencrypted-secrets.sh
# Scans for Kubernetes Secrets that are not SOPS-encrypted

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

echo "Scanning for unencrypted Kubernetes secrets..."

# Find all YAML files that define Kubernetes Secrets
find "$REPO_ROOT" -name "*.yaml" -not -path "*/\.*" | while read -r file; do
  # Check if the file defines a Kubernetes Secret
  if grep -q "kind: Secret" "$file"; then
    # Check if the file is SOPS-encrypted
    if ! grep -q "sops:" "$file"; then
      echo "ALERT: Unencrypted Secret found: $file"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Found $ERRORS unencrypted secret file(s)"
  echo "Encrypt them with: sops --encrypt --in-place <file>"
  exit 1
fi

echo "No unencrypted secrets found"
```

## CI Pipeline Integration

Combine all validations into a GitHub Actions workflow.

```yaml
# .github/workflows/validate-sops.yaml
name: Validate SOPS Secrets
on:
  pull_request:
    paths:
      - "**/secrets/**"
      - ".sops.yaml"

jobs:
  validate-sops:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install SOPS
        run: |
          # Install the latest SOPS binary
          curl -LO https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64
          sudo mv sops-v3.8.1.linux.amd64 /usr/local/bin/sops
          sudo chmod +x /usr/local/bin/sops

      - name: Detect unencrypted secrets
        run: bash scripts/detect-unencrypted-secrets.sh

      - name: Validate SOPS file structure
        run: bash scripts/validate-sops-structure.sh

      - name: Test SOPS decryption
        env:
          # Store the age key as a GitHub secret
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: bash scripts/validate-sops-decryption.sh

      - name: Validate Kubernetes manifests
        env:
          SOPS_AGE_KEY: ${{ secrets.SOPS_AGE_KEY }}
        run: bash scripts/validate-sops-k8s.sh
```

## Git Pre-Commit Hook for SOPS

Add a pre-commit hook to catch unencrypted secrets before they are committed.

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Prevents committing unencrypted Kubernetes secrets

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

for file in $STAGED_FILES; do
  # Only check YAML files in secret directories
  if echo "$file" | grep -qE "secrets/.*\.yaml$"; then
    if grep -q "kind: Secret" "$file" && ! grep -q "sops:" "$file"; then
      echo "BLOCKED: $file contains an unencrypted Secret"
      echo "Run: sops --encrypt --in-place $file"
      exit 1
    fi
  fi
done
```

## Troubleshooting Common Issues

### MAC Mismatch Error

If you see a MAC mismatch error during decryption, the file may have been modified after encryption without re-encrypting.

```bash
# Re-encrypt the file to fix the MAC
sops --decrypt infrastructure/secrets/database-secret.yaml | \
  sops --encrypt /dev/stdin > infrastructure/secrets/database-secret.yaml.new
mv infrastructure/secrets/database-secret.yaml.new infrastructure/secrets/database-secret.yaml
```

### Key Rotation

When rotating encryption keys, validate that all files can be decrypted with the new key.

```bash
# Rotate the key for all encrypted files
find . -name "*.yaml" -path "*/secrets/*" -exec sops updatekeys {} \;

# Re-run validation after rotation
bash scripts/validate-sops-decryption.sh
```

## Summary

Validating SOPS-encrypted files in your Flux CD workflow prevents broken deployments caused by encryption issues. Key practices include: verifying SOPS metadata structure, testing decryption with available keys, validating the resulting Kubernetes manifests, and scanning for accidentally unencrypted secrets. Integrate these checks into your CI pipeline and pre-commit hooks for comprehensive protection.
