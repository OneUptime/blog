# How to Validate Flux Manifests with kube-linter

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, kube-linter, Validation, Security, CI/CD

Description: Learn how to use kube-linter to validate Flux manifests for security misconfigurations and Kubernetes best practices.

---

## Introduction

kube-linter is an open-source static analysis tool from StackRox (now part of Red Hat) that checks Kubernetes manifests for security misconfigurations and best practice violations. It includes a comprehensive set of built-in checks and supports custom rules. For Flux deployments, kube-linter helps ensure that every manifest in your GitOps repository meets security standards before it reaches the cluster.

## Prerequisites

- kube-linter CLI installed
- A Flux GitOps repository with manifests
- kustomize installed (for overlay validation)

## Step 1: Install kube-linter

```bash
# macOS (Homebrew)
brew install kube-linter

# Linux (binary download)
curl -L -o kube-linter \
  https://github.com/stackrox/kube-linter/releases/latest/download/kube-linter-linux
chmod +x kube-linter
sudo mv kube-linter /usr/local/bin/

# Go install
go install golang.stackrox.io/kube-linter/cmd/kube-linter@latest

# Verify installation
kube-linter version
```

## Step 2: Run Basic Linting

```bash
# Lint a single file
kube-linter lint deployment.yaml

# Lint a directory
kube-linter lint manifests/

# Lint multiple paths
kube-linter lint manifests/ helmreleases/ kustomizations/
```

## Step 3: List Available Checks

View all built-in checks to understand what kube-linter validates.

```bash
# List all checks
kube-linter checks list

# List checks in a specific format
kube-linter checks list --format json | jq '.[].name'
```

Key built-in checks include:

- `no-read-only-root-fs` - Containers should use read-only root filesystems
- `run-as-non-root` - Containers should run as non-root
- `no-privileged-containers` - No containers should run as privileged
- `unset-cpu-requirements` - CPU requests and limits should be set
- `unset-memory-requirements` - Memory requests and limits should be set
- `no-liveness-probe` - Containers should have liveness probes
- `no-readiness-probe` - Containers should have readiness probes
- `latest-tag` - Container images should not use the latest tag

## Step 4: Validate Kustomize Build Output

```bash
# Lint kustomize build output
kustomize build overlays/production | kube-linter lint -

# Lint with specific checks only
kustomize build overlays/production | kube-linter lint \
  --include "no-privileged-containers" \
  --include "run-as-non-root" \
  --include "unset-memory-requirements" \
  -
```

## Step 5: Configure kube-linter

Create a configuration file to customize which checks run and add exceptions.

```yaml
# .kube-linter.yaml
checks:
  addAllBuiltIn: true
  exclude:
    - "dangling-service"  # Flux manages services separately
    - "default-service-account"  # Some Flux resources use default SA

  include: []

ignorePaths:
  - "test/**"

customChecks:
  - name: "flux-require-interval"
    description: "Flux resources should have an interval set"
    template: "required-annotation"
    params:
      key: "reconcile.fluxcd.io/interval"
    scope:
      objectKinds:
        - DeploymentLike
```

Run with the configuration file.

```bash
# kube-linter automatically picks up .kube-linter.yaml in the current directory
kube-linter lint manifests/

# Or specify the config file explicitly
kube-linter lint --config .kube-linter.yaml manifests/
```

## Step 6: Enable and Disable Specific Checks

```bash
# Run only security-related checks
kube-linter lint \
  --include "no-privileged-containers" \
  --include "run-as-non-root" \
  --include "no-read-only-root-fs" \
  --include "privilege-escalation-container" \
  --include "unsafe-sysctls" \
  --include "writable-host-mount" \
  manifests/

# Run all checks except specific ones
kube-linter lint \
  --exclude "default-service-account" \
  --exclude "dangling-service" \
  manifests/

# Run with do-not-auto-add-defaults (only run explicitly included checks)
kube-linter lint \
  --do-not-auto-add-defaults \
  --include "unset-cpu-requirements" \
  --include "unset-memory-requirements" \
  manifests/
```

## Step 7: Validate All Overlays

```bash
#!/bin/bash
# lint-flux-manifests.sh
set -euo pipefail

CONFIG=".kube-linter.yaml"
ERRORS=0

echo "=== Linting raw manifests ==="
for dir in manifests/ apps/ infrastructure/; do
  if [ -d "$dir" ]; then
    echo "Linting $dir..."
    if kube-linter lint --config "$CONFIG" "$dir" 2>&1; then
      echo "  PASS"
    else
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

echo ""
echo "=== Linting kustomize overlay outputs ==="
for overlay in overlays/*/; do
  echo "Linting $overlay..."
  output_file="/tmp/kube-linter-$(basename "$overlay").yaml"

  kustomize build "$overlay" > "$output_file" 2>/dev/null || {
    echo "  SKIP: kustomize build failed"
    continue
  }

  if kube-linter lint --config "$CONFIG" "$output_file" 2>&1; then
    echo "  PASS"
  else
    ERRORS=$((ERRORS + 1))
  fi

  rm -f "$output_file"
done

echo ""
echo "=== Summary ==="
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS path(s) have linting errors"
  exit 1
fi
echo "All paths passed kube-linter checks"
```

## Step 8: Output Formats

```bash
# Default format (human readable)
kube-linter lint manifests/

# JSON format (for programmatic processing)
kube-linter lint --format json manifests/

# SARIF format (for GitHub code scanning)
kube-linter lint --format sarif manifests/ > results.sarif

# Plain format
kube-linter lint --format plain manifests/
```

## Integrating with GitHub Code Scanning

kube-linter's SARIF output integrates with GitHub's code scanning feature.

```yaml
# .github/workflows/kube-linter.yaml
name: kube-linter
on:
  pull_request:
    paths:
      - '**.yaml'
      - '**.yml'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kube-linter
        run: |
          curl -L -o kube-linter \
            https://github.com/stackrox/kube-linter/releases/latest/download/kube-linter-linux
          chmod +x kube-linter
          sudo mv kube-linter /usr/local/bin/

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Lint manifests
        run: |
          kube-linter lint manifests/ --format sarif > results.sarif || true

      - name: Upload SARIF results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif

      - name: Lint and fail on errors
        run: kube-linter lint manifests/
```

## Common Fixes for kube-linter Warnings

Here are the most common kube-linter findings and how to fix them in your Flux manifests.

```yaml
# Fix: unset-cpu-requirements and unset-memory-requirements
spec:
  containers:
    - name: app
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 512Mi

# Fix: no-read-only-root-fs
spec:
  containers:
    - name: app
      securityContext:
        readOnlyRootFilesystem: true

# Fix: run-as-non-root
spec:
  containers:
    - name: app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000

# Fix: no-liveness-probe and no-readiness-probe
spec:
  containers:
    - name: app
      livenessProbe:
        httpGet:
          path: /healthz
          port: 8080
        initialDelaySeconds: 10
      readinessProbe:
        httpGet:
          path: /ready
          port: 8080
        initialDelaySeconds: 5
```

## Best Practices

- Place `.kube-linter.yaml` in the root of your GitOps repository
- Start with all built-in checks enabled and exclude only when justified
- Use SARIF output for GitHub code scanning integration
- Lint both raw manifests and kustomize build output
- Document the reason for any excluded checks
- Run kube-linter alongside schema validators for comprehensive coverage
- Review new kube-linter checks when upgrading versions

## Conclusion

kube-linter provides thorough security-focused linting for Kubernetes manifests deployed through Flux. Its built-in checks cover the most common security misconfigurations and best practice violations, while custom checks let you enforce organization-specific standards. By integrating kube-linter into your CI pipeline and using SARIF output for code scanning, you create a robust validation layer that catches issues before they reach your cluster.
