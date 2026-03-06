# How to Set Up Pre-Commit Hooks for Flux CD Manifests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Pre-Commit, Git Hooks, Validation, Kubernetes, GitOps, Developer Experience

Description: Learn how to configure pre-commit hooks that validate Flux CD manifests before they are committed, catching errors at the earliest stage.

---

Pre-commit hooks run validation checks before code is committed to Git, catching errors at the earliest possible stage. For Flux CD repositories, this means invalid YAML, broken Kustomizations, and misconfigured resources are caught before they even leave your machine. This guide shows how to set up comprehensive pre-commit hooks for Flux CD manifests.

## Prerequisites

- Python 3.8 or later (for pre-commit framework)
- Git repository with Flux CD configurations
- Flux CLI installed locally
- Basic understanding of Git hooks

## Installing the Pre-Commit Framework

The `pre-commit` framework makes managing Git hooks easy and shareable across teams.

```bash
# Install pre-commit using pip
pip install pre-commit

# Or using Homebrew on macOS
brew install pre-commit

# Verify the installation
pre-commit --version
```

## Basic Pre-Commit Configuration

Create a `.pre-commit-config.yaml` file in your repository root.

```yaml
# .pre-commit-config.yaml
# Pre-commit hooks for validating Flux CD manifests
repos:
  # YAML syntax validation
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-yaml
        name: Check YAML syntax
        args: ["--allow-multiple-documents"]
        files: \.(yaml|yml)$

      - id: end-of-file-fixer
        name: Fix end of file
        files: \.(yaml|yml)$

      - id: trailing-whitespace
        name: Trim trailing whitespace
        files: \.(yaml|yml)$

      - id: check-merge-conflict
        name: Check for merge conflicts

  # YAML linting with yamllint
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.33.0
    hooks:
      - id: yamllint
        name: Lint YAML files
        args: ["-c", ".yamllint.yaml"]
        files: \.(yaml|yml)$
```

### YAMLLint Configuration

```yaml
# .yamllint.yaml
# YAML linting rules for Flux CD manifests
extends: default
rules:
  line-length:
    max: 200
    allow-non-breakable-inline-mappings: true
  comments:
    min-spaces-from-content: 1
  truthy:
    # Allow 'on' in GitHub Actions workflows
    check-keys: false
  indentation:
    spaces: 2
    indent-sequences: true
  document-start:
    present: false
  empty-lines:
    max: 2
```

## Custom Hooks for Flux CD Validation

### Hook: Validate Kustomization Files

```yaml
# Add to .pre-commit-config.yaml
  - repo: local
    hooks:
      - id: validate-kustomize
        name: Validate Kustomize builds
        entry: scripts/hooks/validate-kustomize.sh
        language: script
        files: kustomization\.yaml$
        pass_filenames: true
```

Create the validation script:

```bash
#!/bin/bash
# scripts/hooks/validate-kustomize.sh
# Validates that kustomize builds succeed for modified kustomization files

set -euo pipefail

ERRORS=0

for file in "$@"; do
  # Get the directory containing the kustomization.yaml
  DIR=$(dirname "$file")

  echo "Validating kustomize build: $DIR"

  # Run kustomize build on the directory
  if ! kustomize build "$DIR" > /dev/null 2>&1; then
    echo "ERROR: kustomize build failed for $DIR"
    kustomize build "$DIR" 2>&1 || true
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $DIR"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Kustomize validation failed with $ERRORS error(s)"
  exit 1
fi
```

### Hook: Validate Flux Resources

```yaml
# Add to .pre-commit-config.yaml
      - id: validate-flux-resources
        name: Validate Flux CD resources
        entry: scripts/hooks/validate-flux-resources.sh
        language: script
        files: \.(yaml|yml)$
        pass_filenames: true
```

```bash
#!/bin/bash
# scripts/hooks/validate-flux-resources.sh
# Validates Flux CD resource definitions for common mistakes

set -euo pipefail

ERRORS=0

for file in "$@"; do
  # Skip non-Kubernetes YAML files
  if ! grep -q "apiVersion:" "$file" 2>/dev/null; then
    continue
  fi

  # Check for Flux CD resources
  KIND=$(grep "^kind:" "$file" | head -1 | awk '{print $2}')

  case "$KIND" in
    Kustomization)
      API_VERSION=$(grep "^apiVersion:" "$file" | head -1 | awk '{print $2}')

      # Verify it uses the correct Flux API version
      if echo "$API_VERSION" | grep -q "kustomize.toolkit.fluxcd.io"; then
        # Check for required fields
        if ! grep -q "interval:" "$file"; then
          echo "ERROR: $file - Kustomization missing 'interval' field"
          ERRORS=$((ERRORS + 1))
        fi

        if ! grep -q "sourceRef:" "$file"; then
          echo "ERROR: $file - Kustomization missing 'sourceRef' field"
          ERRORS=$((ERRORS + 1))
        fi

        if ! grep -q "path:" "$file"; then
          echo "ERROR: $file - Kustomization missing 'path' field"
          ERRORS=$((ERRORS + 1))
        fi

        echo "OK: $file (Flux Kustomization)"
      fi
      ;;

    HelmRelease)
      # Validate HelmRelease required fields
      if ! grep -q "chart:" "$file"; then
        echo "ERROR: $file - HelmRelease missing 'chart' field"
        ERRORS=$((ERRORS + 1))
      fi

      if ! grep -q "interval:" "$file"; then
        echo "ERROR: $file - HelmRelease missing 'interval' field"
        ERRORS=$((ERRORS + 1))
      fi

      # Check for version pinning
      if ! grep -q "version:" "$file"; then
        echo "WARNING: $file - HelmRelease chart version not pinned"
      fi

      echo "OK: $file (HelmRelease)"
      ;;

    GitRepository|HelmRepository|OCIRepository)
      # Validate source resources
      if ! grep -q "url:" "$file"; then
        echo "ERROR: $file - $KIND missing 'url' field"
        ERRORS=$((ERRORS + 1))
      fi

      if ! grep -q "interval:" "$file"; then
        echo "ERROR: $file - $KIND missing 'interval' field"
        ERRORS=$((ERRORS + 1))
      fi

      echo "OK: $file ($KIND)"
      ;;
  esac
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Flux resource validation failed with $ERRORS error(s)"
  exit 1
fi
```

### Hook: Detect Unencrypted Secrets

```yaml
# Add to .pre-commit-config.yaml
      - id: detect-unencrypted-secrets
        name: Detect unencrypted Kubernetes secrets
        entry: scripts/hooks/detect-secrets.sh
        language: script
        files: \.(yaml|yml)$
        pass_filenames: true
```

```bash
#!/bin/bash
# scripts/hooks/detect-secrets.sh
# Blocks commits containing unencrypted Kubernetes Secrets

set -euo pipefail

ERRORS=0

for file in "$@"; do
  # Check if the file contains a Kubernetes Secret
  if grep -q "kind: Secret" "$file" 2>/dev/null; then
    # Verify it is SOPS-encrypted
    if ! grep -q "sops:" "$file"; then
      echo "BLOCKED: $file contains an unencrypted Kubernetes Secret"
      echo "  Encrypt with: sops --encrypt --in-place $file"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Check for hardcoded sensitive values
  if grep -qiE "(password|secret|token|api[_-]?key):\s+['\"]?[a-zA-Z0-9]" "$file" 2>/dev/null; then
    # Exclude SOPS-encrypted files
    if ! grep -q "sops:" "$file"; then
      echo "WARNING: $file may contain hardcoded secrets"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Secret detection found $ERRORS issue(s)"
  echo "Encrypt secrets before committing"
  exit 1
fi
```

### Hook: Validate Namespace Consistency

```yaml
# Add to .pre-commit-config.yaml
      - id: validate-namespaces
        name: Validate namespace consistency
        entry: scripts/hooks/validate-namespaces.sh
        language: script
        files: \.(yaml|yml)$
        pass_filenames: true
```

```bash
#!/bin/bash
# scripts/hooks/validate-namespaces.sh
# Ensures all resources specify a namespace (not relying on defaults)

set -euo pipefail

WARNINGS=0

for file in "$@"; do
  # Skip non-Kubernetes files
  if ! grep -q "apiVersion:" "$file" 2>/dev/null; then
    continue
  fi

  KIND=$(grep "^kind:" "$file" | head -1 | awk '{print $2}')

  # Skip cluster-scoped resources
  case "$KIND" in
    Namespace|ClusterRole|ClusterRoleBinding|CustomResourceDefinition|PersistentVolume)
      continue
      ;;
  esac

  # Check for namespace in metadata
  if grep -q "kind:" "$file" && ! grep -q "namespace:" "$file"; then
    echo "WARNING: $file ($KIND) does not specify a namespace"
    WARNINGS=$((WARNINGS + 1))
  fi
done

if [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo "Found $WARNINGS resource(s) without explicit namespaces"
  echo "Consider adding 'namespace' to metadata for clarity"
  # Warning only, do not block the commit
fi
```

## Complete Pre-Commit Configuration

Here is the full `.pre-commit-config.yaml` with all hooks combined:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-yaml
        args: ["--allow-multiple-documents"]
        files: \.(yaml|yml)$
      - id: end-of-file-fixer
        files: \.(yaml|yml)$
      - id: trailing-whitespace
        files: \.(yaml|yml)$
      - id: check-merge-conflict

  - repo: https://github.com/adrienverge/yamllint
    rev: v1.33.0
    hooks:
      - id: yamllint
        args: ["-c", ".yamllint.yaml"]
        files: \.(yaml|yml)$

  - repo: local
    hooks:
      - id: validate-kustomize
        name: Validate Kustomize builds
        entry: scripts/hooks/validate-kustomize.sh
        language: script
        files: kustomization\.yaml$
        pass_filenames: true

      - id: validate-flux-resources
        name: Validate Flux CD resources
        entry: scripts/hooks/validate-flux-resources.sh
        language: script
        files: \.(yaml|yml)$
        pass_filenames: true

      - id: detect-unencrypted-secrets
        name: Detect unencrypted secrets
        entry: scripts/hooks/detect-secrets.sh
        language: script
        files: \.(yaml|yml)$
        pass_filenames: true

      - id: validate-namespaces
        name: Validate namespaces
        entry: scripts/hooks/validate-namespaces.sh
        language: script
        files: \.(yaml|yml)$
        pass_filenames: true
```

## Installing the Hooks

```bash
# Install the pre-commit hooks in your repository
pre-commit install

# Run all hooks against all files (useful for initial setup)
pre-commit run --all-files

# Run a specific hook
pre-commit run validate-kustomize --all-files

# Update hook versions
pre-commit autoupdate
```

## Making Hook Scripts Executable

```bash
# Ensure all hook scripts are executable
chmod +x scripts/hooks/validate-kustomize.sh
chmod +x scripts/hooks/validate-flux-resources.sh
chmod +x scripts/hooks/detect-secrets.sh
chmod +x scripts/hooks/validate-namespaces.sh
```

## Team Onboarding

Add a setup script for new team members:

```bash
#!/bin/bash
# scripts/setup-dev.sh
# Set up the development environment for Flux CD contributions

set -euo pipefail

echo "Setting up development environment..."

# Install pre-commit if not present
if ! command -v pre-commit &> /dev/null; then
  echo "Installing pre-commit..."
  pip install pre-commit
fi

# Install hooks
pre-commit install
echo "Pre-commit hooks installed"

# Run initial validation
echo "Running initial validation..."
pre-commit run --all-files || true

echo ""
echo "Setup complete. Pre-commit hooks will now run on every commit."
```

## Summary

Pre-commit hooks provide the fastest feedback loop for Flux CD developers. By validating YAML syntax, Kustomize builds, Flux resource structure, secret encryption, and namespace consistency before commits, you catch errors at the earliest stage. Use the pre-commit framework for easy installation and team-wide consistency, and combine local hooks with CI validation for defense in depth.
