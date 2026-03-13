# How to Write Kustomization Unit Tests with kustomize build for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Kustomize, Unit Tests, CI/CD

Description: Learn how to write unit tests for Flux Kustomization overlays using kustomize build to validate manifests before they are applied to your cluster.

---

## Introduction

Flux Kustomizations apply kustomize overlays to your cluster. Before these overlays reach the cluster, you can validate them locally using `kustomize build`. This catches syntax errors, missing resources, invalid patches, and misconfigured overlays before they cause reconciliation failures. This guide covers how to structure and automate these tests.

## Prerequisites

- kustomize CLI installed (v5.0 or later)
- kubectl installed
- A Flux GitOps repository with kustomize overlays
- Basic understanding of kustomize concepts (bases, overlays, patches)

## Step 1: Install kustomize

```bash
# macOS (Homebrew)
brew install kustomize

# Linux (binary download)
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Verify installation
kustomize version
```

## Step 2: Understand the Repository Structure

A typical Flux repository has bases and overlays.

```
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── replica-patch.yaml
│   └── production/
│       ├── kustomization.yaml
│       ├── replica-patch.yaml
│       └── resource-patch.yaml
└── clusters/
    ├── staging/
    │   └── kustomization.yaml  # Flux Kustomization
    └── production/
        └── kustomization.yaml  # Flux Kustomization
```

## Step 3: Write Basic Build Tests

The simplest test is to verify that `kustomize build` succeeds for each overlay.

```bash
#!/bin/bash
# test-kustomize-build.sh
set -euo pipefail

OVERLAYS_DIR="overlays"
ERRORS=0

for overlay in "$OVERLAYS_DIR"/*/; do
  echo "Testing overlay: $overlay"
  if kustomize build "$overlay" > /dev/null 2>&1; then
    echo "  PASS"
  else
    echo "  FAIL"
    kustomize build "$overlay" 2>&1 | head -20
    ERRORS=$((ERRORS + 1))
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS overlay(s) have build errors"
  exit 1
fi

echo "All overlays build successfully"
```

## Step 4: Validate Output Against Expected Resources

Test that the build output contains expected resources.

```bash
#!/bin/bash
# test-expected-resources.sh
set -euo pipefail

OVERLAY="overlays/production"
OUTPUT=$(kustomize build "$OVERLAY")

# Check for expected resource kinds
assert_resource() {
  local kind=$1
  local name=$2
  if echo "$OUTPUT" | grep -q "kind: $kind" && echo "$OUTPUT" | grep -q "name: $name"; then
    echo "  PASS: Found $kind/$name"
  else
    echo "  FAIL: Missing $kind/$name"
    return 1
  fi
}

echo "Checking production overlay resources..."
assert_resource "Deployment" "web-app"
assert_resource "Service" "web-app"
assert_resource "ConfigMap" "app-config"
assert_resource "Namespace" "production"

echo "All expected resources found"
```

## Step 5: Test Patch Application

Verify that patches are applied correctly.

```bash
#!/bin/bash
# test-patches.sh
set -euo pipefail

OVERLAY="overlays/production"
OUTPUT=$(kustomize build "$OVERLAY")

# Verify replica count was patched
replicas=$(echo "$OUTPUT" | yq eval 'select(.kind == "Deployment" and .metadata.name == "web-app") | .spec.replicas' -)
if [ "$replicas" == "5" ]; then
  echo "PASS: Production replicas set to 5"
else
  echo "FAIL: Expected replicas=5, got replicas=$replicas"
  exit 1
fi

# Verify resource limits were patched
cpu_limit=$(echo "$OUTPUT" | yq eval 'select(.kind == "Deployment" and .metadata.name == "web-app") | .spec.template.spec.containers[0].resources.limits.cpu' -)
if [ "$cpu_limit" == "1000m" ]; then
  echo "PASS: CPU limit set to 1000m"
else
  echo "FAIL: Expected cpu limit=1000m, got $cpu_limit"
  exit 1
fi
```

## Step 6: Test Variable Substitution

Flux supports post-build variable substitution. Test these substitutions locally.

```bash
#!/bin/bash
# test-variable-substitution.sh
set -euo pipefail

OVERLAY="overlays/staging"
OUTPUT=$(kustomize build "$OVERLAY")

# Check that variables are defined (they will appear as ${VAR_NAME} in the output)
# In a real Flux deployment, these get substituted at reconciliation time
undefined_vars=$(echo "$OUTPUT" | grep -oP '\$\{[^}]+\}' | sort -u)

if [ -n "$undefined_vars" ]; then
  echo "Variables found (will be substituted by Flux):"
  echo "$undefined_vars"
  # Verify they are expected variables
  for var in $undefined_vars; do
    case "$var" in
      '${CLUSTER_NAME}'|'${ENVIRONMENT}'|'${APP_VERSION}')
        echo "  OK: $var is an expected Flux variable"
        ;;
      *)
        echo "  WARNING: $var is not a recognized variable"
        ;;
    esac
  done
else
  echo "No variable references found"
fi
```

## Step 7: Test Namespace Consistency

Ensure all resources are in the expected namespace.

```bash
#!/bin/bash
# test-namespaces.sh
set -euo pipefail

OVERLAY="overlays/production"
EXPECTED_NS="production"
OUTPUT=$(kustomize build "$OVERLAY")

# Extract all namespaces from the output
namespaces=$(echo "$OUTPUT" | yq eval '.metadata.namespace // "default"' - | sort -u)

echo "Namespaces in build output:"
for ns in $namespaces; do
  if [ "$ns" == "$EXPECTED_NS" ] || [ "$ns" == "null" ]; then
    echo "  OK: $ns"
  else
    echo "  WARNING: Unexpected namespace $ns (expected $EXPECTED_NS)"
  fi
done
```

## Step 8: Comprehensive Test Suite

Combine all tests into a single test script.

```bash
#!/bin/bash
# run-kustomize-tests.sh
set -euo pipefail

PASS=0
FAIL=0

run_test() {
  local name=$1
  local cmd=$2
  echo "--- Test: $name ---"
  if eval "$cmd"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

# Test all overlays build
for overlay in overlays/*/; do
  run_test "Build $overlay" "kustomize build $overlay > /dev/null 2>&1"
done

# Test output is valid YAML
for overlay in overlays/*/; do
  run_test "Valid YAML $overlay" "kustomize build $overlay | yq eval '.' - > /dev/null 2>&1"
done

# Test output can be dry-run applied
for overlay in overlays/*/; do
  run_test "Dry-run $overlay" "kustomize build $overlay | kubectl apply --dry-run=client -f - > /dev/null 2>&1"
done

echo "=== Results ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
```

## CI Integration

Add kustomize build tests to your CI pipeline.

```yaml
# .github/workflows/test-kustomize.yaml
name: Test Kustomize Overlays
on:
  pull_request:
    paths:
      - 'base/**'
      - 'overlays/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Install yq
        uses: mikefarah/yq@master

      - name: Build all overlays
        run: |
          for overlay in overlays/*/; do
            echo "Building $overlay..."
            kustomize build "$overlay" > /dev/null
          done

      - name: Dry-run apply
        run: |
          for overlay in overlays/*/; do
            echo "Dry-run $overlay..."
            kustomize build "$overlay" | kubectl apply --dry-run=client -f -
          done
```

## Best Practices

- Run `kustomize build` tests on every pull request that modifies kustomize files
- Use `kubectl apply --dry-run=client` to validate the output against the Kubernetes API schema
- Test both base and overlay directories independently
- Verify that patches produce expected values, not just that the build succeeds
- Keep test scripts in the same repository as your kustomize configurations
- Use yq for structured YAML assertions rather than grep for more reliable tests

## Conclusion

Unit testing kustomize overlays with `kustomize build` catches configuration errors early in the development cycle. By validating builds, checking patch application, and running dry-run applies, you can be confident that your Flux Kustomizations will reconcile successfully when they reach the cluster. Integrating these tests into CI ensures every change is validated before it reaches your GitOps repository.
