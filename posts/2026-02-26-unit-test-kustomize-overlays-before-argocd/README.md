# How to Unit Test Kustomize Overlays Before ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize, Testing

Description: Learn how to test and validate Kustomize overlays before ArgoCD deployment using build validation, diff testing, and automated CI checks to prevent configuration errors.

---

Kustomize overlays are deceptively simple. You have a base set of manifests, and overlays patch them for different environments. But as the number of overlays, patches, and transformations grows, it becomes easy to introduce subtle bugs - a patch that targets the wrong resource, a missing base reference, or a namespace collision.

Since ArgoCD renders Kustomize overlays during sync, any error in your overlays becomes a sync failure in production. Testing overlays before they reach ArgoCD catches these issues at the cheapest possible point - in your local development environment or CI pipeline.

## Understanding What Can Go Wrong

Kustomize overlay errors fall into several categories:

**Build failures**: The overlay cannot be rendered at all:
```bash
kustomize build overlays/production
# Error: accumulating resources: accumulateFile:
# "deployment.yaml" not found in base
```

**Silent misconfigurations**: The overlay renders but produces unexpected output:
```yaml
# You expected the production overlay to set 3 replicas
# But the strategic merge patch targeted the wrong deployment name
# Result: base deployment unchanged, new empty deployment created
```

**Cross-environment leaks**: A change to the base affects all overlays unexpectedly.

## Step 1: Validate That Overlays Build Successfully

The most basic test is that every overlay renders without errors:

```bash
#!/bin/bash
# test-kustomize-build.sh

ERRORS=0

# Find all kustomization.yaml files
for kustomization in $(find . -name "kustomization.yaml" -type f); do
  dir=$(dirname "$kustomization")
  echo "Building $dir..."

  if ! kustomize build "$dir" > /dev/null 2>&1; then
    echo "FAIL: $dir failed to build"
    kustomize build "$dir" 2>&1 | head -5
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo "FAILED: $ERRORS overlay(s) failed to build"
  exit 1
fi

echo "All overlays build successfully"
```

## Step 2: Validate Rendered Output Against Kubernetes Schemas

A successful build does not mean valid Kubernetes resources. Validate the output:

```bash
#!/bin/bash
# test-kustomize-schema.sh

K8S_VERSION=${1:-1.28.0}

for overlay in apps/*/overlays/*/; do
  if [ ! -f "$overlay/kustomization.yaml" ]; then
    continue
  fi

  echo "Validating $overlay against Kubernetes $K8S_VERSION..."
  kustomize build "$overlay" | kubeconform \
    -strict \
    -summary \
    -kubernetes-version "$K8S_VERSION"
done
```

## Step 3: Diff Testing Between Environments

One of the most valuable tests compares overlays against each other to verify that environment-specific patches are applied correctly:

```bash
#!/bin/bash
# test-kustomize-diffs.sh

APP=$1

# Build each environment
kustomize build "apps/$APP/overlays/dev" > /tmp/dev-manifests.yaml
kustomize build "apps/$APP/overlays/staging" > /tmp/staging-manifests.yaml
kustomize build "apps/$APP/overlays/production" > /tmp/production-manifests.yaml

echo "=== Dev vs Staging differences ==="
diff /tmp/dev-manifests.yaml /tmp/staging-manifests.yaml

echo "=== Staging vs Production differences ==="
diff /tmp/staging-manifests.yaml /tmp/production-manifests.yaml
```

This helps you verify that:
- Production has more replicas than development
- Resource limits increase with environment criticality
- Namespaces are correctly set per environment

## Step 4: Assertion-Based Testing

For more structured testing, write assertion scripts that check specific properties of rendered manifests:

```bash
#!/bin/bash
# test-kustomize-assertions.sh

APP=$1
ENV=$2

# Render the overlay
MANIFESTS=$(kustomize build "apps/$APP/overlays/$ENV")

# Helper function to extract values using yq
get_value() {
  echo "$MANIFESTS" | yq eval-all "select(.kind == \"$1\" and .metadata.name == \"$2\") | $3" -
}

# Test: Production deployments have at least 2 replicas
if [ "$ENV" = "production" ]; then
  REPLICAS=$(get_value "Deployment" "$APP" ".spec.replicas")
  if [ "$REPLICAS" -lt 2 ]; then
    echo "FAIL: Production deployment $APP has $REPLICAS replicas (minimum 2)"
    exit 1
  fi
  echo "PASS: Replicas = $REPLICAS (>= 2)"
fi

# Test: Namespace matches environment
NAMESPACE=$(get_value "Deployment" "$APP" ".metadata.namespace")
if [ "$NAMESPACE" != "$ENV" ]; then
  echo "FAIL: Expected namespace '$ENV', got '$NAMESPACE'"
  exit 1
fi
echo "PASS: Namespace = $NAMESPACE"

# Test: Resource limits are set
MEMORY_LIMIT=$(get_value "Deployment" "$APP" ".spec.template.spec.containers[0].resources.limits.memory")
if [ -z "$MEMORY_LIMIT" ] || [ "$MEMORY_LIMIT" = "null" ]; then
  echo "FAIL: Memory limit not set for $APP in $ENV"
  exit 1
fi
echo "PASS: Memory limit = $MEMORY_LIMIT"

# Test: Image tag is not 'latest'
IMAGE=$(get_value "Deployment" "$APP" ".spec.template.spec.containers[0].image")
if echo "$IMAGE" | grep -q ":latest"; then
  echo "FAIL: Image tag 'latest' is not allowed in $ENV"
  exit 1
fi
echo "PASS: Image = $IMAGE"

echo "All assertions passed for $APP/$ENV"
```

## Step 5: Snapshot Testing for Kustomize

Similar to Helm snapshot testing, capture the rendered output and compare against baselines:

```bash
#!/bin/bash
# test-kustomize-snapshots.sh

SNAPSHOT_DIR="tests/snapshots"
UPDATE=${1:-false}

for overlay in apps/*/overlays/*/; do
  if [ ! -f "$overlay/kustomization.yaml" ]; then
    continue
  fi

  # Generate a snapshot filename from the path
  SNAPSHOT_NAME=$(echo "$overlay" | tr '/' '_' | sed 's/_$//')
  SNAPSHOT_FILE="$SNAPSHOT_DIR/$SNAPSHOT_NAME.yaml"

  # Render current output
  kustomize build "$overlay" > /tmp/current-snapshot.yaml

  if [ "$UPDATE" = "--update" ]; then
    # Update snapshot
    mkdir -p "$SNAPSHOT_DIR"
    cp /tmp/current-snapshot.yaml "$SNAPSHOT_FILE"
    echo "Updated snapshot: $SNAPSHOT_FILE"
  else
    # Compare against existing snapshot
    if [ ! -f "$SNAPSHOT_FILE" ]; then
      echo "FAIL: No snapshot exists for $overlay. Run with --update to create."
      exit 1
    fi

    if ! diff -q "$SNAPSHOT_FILE" /tmp/current-snapshot.yaml > /dev/null 2>&1; then
      echo "FAIL: Snapshot mismatch for $overlay"
      diff "$SNAPSHOT_FILE" /tmp/current-snapshot.yaml
      exit 1
    fi

    echo "PASS: $overlay matches snapshot"
  fi
done
```

Usage:

```bash
# Create initial snapshots
./test-kustomize-snapshots.sh --update

# Test against snapshots
./test-kustomize-snapshots.sh

# Update snapshots after intentional changes
./test-kustomize-snapshots.sh --update
```

Commit the snapshots to Git so they serve as regression tests.

## Step 6: Testing Patch Correctness

Verify that strategic merge patches and JSON patches are applied correctly:

```bash
#!/bin/bash
# test-patches.sh

APP="my-app"

# Render base
kustomize build "apps/$APP/base" > /tmp/base.yaml

# Render overlay
kustomize build "apps/$APP/overlays/production" > /tmp/overlay.yaml

# Verify specific patches were applied
echo "Checking that production patch increased replicas..."
BASE_REPLICAS=$(cat /tmp/base.yaml | yq eval 'select(.kind == "Deployment") | .spec.replicas' -)
OVERLAY_REPLICAS=$(cat /tmp/overlay.yaml | yq eval 'select(.kind == "Deployment") | .spec.replicas' -)

echo "Base replicas: $BASE_REPLICAS"
echo "Production replicas: $OVERLAY_REPLICAS"

if [ "$OVERLAY_REPLICAS" -le "$BASE_REPLICAS" ]; then
  echo "FAIL: Production replicas should be higher than base"
  exit 1
fi

echo "PASS: Production overlay correctly increases replicas"
```

## Step 7: CI Pipeline Integration

Combine all tests into a CI workflow:

```yaml
# GitHub Actions
name: Kustomize Tests
on:
  pull_request:
    paths:
    - 'apps/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install tools
      run: |
        # Install kustomize
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

        # Install kubeconform
        curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
          sudo tar xz -C /usr/local/bin

        # Install yq
        sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
        sudo chmod +x /usr/local/bin/yq

    - name: Build all overlays
      run: ./tests/test-kustomize-build.sh

    - name: Schema validation
      run: ./tests/test-kustomize-schema.sh 1.28.0

    - name: Snapshot tests
      run: ./tests/test-kustomize-snapshots.sh

    - name: Assertion tests
      run: |
        for app in apps/*/; do
          APP_NAME=$(basename "$app")
          for env in dev staging production; do
            if [ -d "apps/$APP_NAME/overlays/$env" ]; then
              ./tests/test-kustomize-assertions.sh "$APP_NAME" "$env"
            fi
          done
        done
```

## Common Kustomize Errors Caught by Testing

Testing catches these frequently occurring errors:

**Missing resource in kustomization.yaml**:
```yaml
# kustomization.yaml forgets to list a new file
resources:
- deployment.yaml
# - service.yaml  # Forgot this one
```

**Wrong patch target**:
```yaml
# Patch targets a resource that does not exist
patchesStrategicMerge:
- |-
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: wrong-name  # Does not match any base resource
  spec:
    replicas: 5
```

**Namespace mismatch**:
```yaml
# Overlay sets namespace to staging but resource says production
namespace: staging
resources:
- deployment.yaml  # Has hardcoded namespace: production
```

For end-to-end monitoring of Kustomize-rendered deployments through ArgoCD, integrate [OneUptime alerting](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-failed-syncs/view) to catch deployment issues post-sync.

## Summary

Testing Kustomize overlays before ArgoCD deployment involves multiple layers: build validation ensures overlays render without errors, schema validation confirms Kubernetes API compliance, diff testing verifies environment-specific patches, assertion testing checks specific configuration requirements, and snapshot testing catches unintended regressions. Combine these into a CI pipeline that runs on every pull request to the GitOps repository. The result is faster feedback, fewer sync failures, and higher confidence in your Kustomize-based deployments.
