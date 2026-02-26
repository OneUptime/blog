# How to Unit Test Kustomize Overlays Before ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize, Testing

Description: Learn how to test and validate Kustomize overlays before ArgoCD syncs them, ensuring patches and transformations produce correct output.

---

Kustomize overlays are a powerful way to manage environment-specific configurations in your GitOps workflow. But overlays can interact in unexpected ways - a strategic merge patch might not produce the result you expect, a JSON patch might target the wrong path, or a transformer might conflict with another overlay. Testing your Kustomize overlays before ArgoCD deploys them prevents these surprises from reaching your cluster.

This guide covers practical techniques for testing Kustomize overlays.

## The Problem with Untested Overlays

Consider a base deployment and a production overlay:

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:latest
          resources:
            requests:
              memory: 128Mi
              cpu: 100m
```

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 1Gi
```

This overlay has a bug - it tries to replace `/spec/template/spec/containers/0/resources/limits/memory`, but the base does not have `limits` defined. The JSON patch operation will fail. Without testing, you would only discover this when ArgoCD tries to sync.

## Method 1: Build and Diff

The simplest test is to build the overlay and visually inspect the output:

```bash
# Build the overlay
kustomize build overlays/production/

# Build and save to a file for comparison
kustomize build overlays/production/ > /tmp/production-rendered.yaml

# Diff between environments
diff <(kustomize build overlays/staging/) \
     <(kustomize build overlays/production/)
```

Automate this as a script:

```bash
#!/bin/bash
# test-overlays.sh
set -euo pipefail

BASE_DIR="${1:-.}"

echo "=== Building all overlays ==="
for overlay in "$BASE_DIR"/overlays/*/; do
    env_name=$(basename "$overlay")
    echo "Building: $env_name"

    if kustomize build "$overlay" > /tmp/kustomize-${env_name}.yaml 2>&1; then
        echo "  OK - $(wc -l < /tmp/kustomize-${env_name}.yaml) lines rendered"
    else
        echo "  FAIL - Build error"
        exit 1
    fi
done

echo ""
echo "All overlays built successfully!"
```

## Method 2: Schema Validation of Built Output

After building, validate the rendered YAML against Kubernetes schemas:

```bash
# Build and validate in a pipeline
kustomize build overlays/production/ | \
  kubeconform -kubernetes-version 1.29.0 \
    -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    -summary

# Validate all overlays
for overlay in overlays/*/; do
    env_name=$(basename "$overlay")
    echo "Validating: $env_name"
    kustomize build "$overlay" | \
        kubeconform -kubernetes-version 1.29.0 -summary
done
```

## Method 3: Snapshot Testing with kustomize-assert

Snapshot testing captures the expected output and compares future builds against it. This is like a "golden file" test:

```bash
# Generate the initial snapshot
kustomize build overlays/production/ > tests/snapshots/production.yaml

# Later, verify the output hasn't changed unexpectedly
diff <(kustomize build overlays/production/) tests/snapshots/production.yaml
```

Automate snapshot testing:

```bash
#!/bin/bash
# snapshot-test.sh
set -euo pipefail

SNAPSHOT_DIR="tests/snapshots"
UPDATE=${UPDATE:-false}

for overlay in overlays/*/; do
    env_name=$(basename "$overlay")
    snapshot_file="$SNAPSHOT_DIR/${env_name}.yaml"

    # Build the overlay
    current=$(kustomize build "$overlay")

    if [ "$UPDATE" = "true" ]; then
        echo "$current" > "$snapshot_file"
        echo "Updated snapshot: $env_name"
        continue
    fi

    if [ ! -f "$snapshot_file" ]; then
        echo "FAIL: No snapshot for $env_name (run with UPDATE=true to create)"
        exit 1
    fi

    if diff <(echo "$current") "$snapshot_file" > /dev/null 2>&1; then
        echo "PASS: $env_name matches snapshot"
    else
        echo "FAIL: $env_name differs from snapshot"
        diff <(echo "$current") "$snapshot_file" || true
        exit 1
    fi
done
```

Usage:

```bash
# Create/update snapshots
UPDATE=true ./snapshot-test.sh

# Run tests (verify current output matches snapshots)
./snapshot-test.sh
```

## Method 4: Policy Testing with Conftest

Use Conftest to enforce policies on the built Kustomize output:

```bash
# Build and test with Conftest
kustomize build overlays/production/ | \
  conftest test --policy policy/ -
```

Write policies specific to overlay requirements:

```rego
# policy/production.rego
package main

# Production must have at least 3 replicas
deny[msg] {
    input.kind == "Deployment"
    input.spec.replicas < 3
    msg := sprintf("Production deployment '%s' must have at least 3 replicas, got %d", [input.metadata.name, input.spec.replicas])
}

# Production must have resource limits
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    not container.resources.limits
    msg := sprintf("Production container '%s' must have resource limits", [container.name])
}

# Production images must not use 'latest' tag
deny[msg] {
    input.kind == "Deployment"
    container := input.spec.template.spec.containers[_]
    endswith(container.image, ":latest")
    msg := sprintf("Production container '%s' must not use 'latest' tag", [container.name])
}
```

## Method 5: Structured Assertions with yq

Use yq to make specific assertions about the built output:

```bash
#!/bin/bash
# assert-overlay.sh
set -euo pipefail

OVERLAY="overlays/production/"
RENDERED=$(kustomize build "$OVERLAY")

# Assert replica count
replicas=$(echo "$RENDERED" | yq eval 'select(.kind == "Deployment" and .metadata.name == "my-app") | .spec.replicas' -)
if [ "$replicas" -ne 5 ]; then
    echo "FAIL: Expected 5 replicas, got $replicas"
    exit 1
fi
echo "PASS: Replica count is $replicas"

# Assert image tag is not latest
image=$(echo "$RENDERED" | yq eval 'select(.kind == "Deployment" and .metadata.name == "my-app") | .spec.template.spec.containers[0].image' -)
if echo "$image" | grep -q ":latest"; then
    echo "FAIL: Image uses latest tag: $image"
    exit 1
fi
echo "PASS: Image tag is pinned: $image"

# Assert namespace is set
namespace=$(echo "$RENDERED" | yq eval 'select(.kind == "Deployment" and .metadata.name == "my-app") | .metadata.namespace' -)
if [ "$namespace" = "null" ] || [ -z "$namespace" ]; then
    echo "FAIL: Namespace is not set"
    exit 1
fi
echo "PASS: Namespace is $namespace"

# Assert resource limits exist
memory_limit=$(echo "$RENDERED" | yq eval 'select(.kind == "Deployment" and .metadata.name == "my-app") | .spec.template.spec.containers[0].resources.limits.memory' -)
if [ "$memory_limit" = "null" ]; then
    echo "FAIL: Memory limit is not set"
    exit 1
fi
echo "PASS: Memory limit is $memory_limit"
```

## Method 6: Testing with kuttl

kuttl (Kubernetes Upstream Test Tool for Lifecycle) can run end-to-end tests for your Kustomize overlays in a real cluster:

```yaml
# tests/e2e/kuttl-test.yaml
apiVersion: kuttl.dev/v1beta1
kind: TestSuite
testDirs:
  - tests/e2e/
startKIND: true
kindNodeCache: true
```

```yaml
# tests/e2e/overlay-test/00-apply.yaml
apiVersion: kuttl.dev/v1beta1
kind: TestStep
commands:
  - command: kustomize build ../../overlays/production/ | kubectl apply -f -
```

```yaml
# tests/e2e/overlay-test/00-assert.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 5
status:
  readyReplicas: 5
```

## CI Pipeline Integration

```yaml
# .github/workflows/kustomize-test.yaml
name: Kustomize Overlay Tests
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

      - name: Install tools
        run: |
          # Install kustomize
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          mv kustomize /usr/local/bin/

          # Install kubeconform
          curl -L https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz -C /usr/local/bin/

      - name: Build all overlays
        run: |
          for overlay in overlays/*/; do
            env_name=$(basename "$overlay")
            echo "::group::Building $env_name"
            kustomize build "$overlay"
            echo "::endgroup::"
          done

      - name: Validate schemas
        run: |
          for overlay in overlays/*/; do
            env_name=$(basename "$overlay")
            echo "Validating: $env_name"
            kustomize build "$overlay" | \
              kubeconform -kubernetes-version 1.29.0 -summary
          done

      - name: Run snapshot tests
        run: ./snapshot-test.sh

      - name: Run policy tests
        run: |
          for overlay in overlays/*/; do
            env_name=$(basename "$overlay")
            echo "Policy check: $env_name"
            kustomize build "$overlay" | \
              conftest test --policy policy/ -
          done
```

## Common Kustomize Overlay Issues Caught by Testing

1. **Patch target not found.** The patch references a resource or path that does not exist in the base.
2. **Conflicting patches.** Two patches modify the same field in incompatible ways.
3. **Missing namePrefix/nameSuffix handling.** References between resources break when names are transformed.
4. **Image transformation not applied.** The image tag in the overlay does not match any container image in the base.

## Monitoring Overlay Deployments

After your tested overlays are deployed by ArgoCD across environments, track their health with [OneUptime](https://oneuptime.com). Compare metrics across environments to verify that your overlay-specific configurations (resource limits, replica counts) are performing as expected.

## Conclusion

Testing Kustomize overlays is essential for reliable GitOps deployments. A combination of build verification, schema validation, snapshot testing, and policy checks creates a comprehensive safety net. The goal is to catch every possible error locally or in CI, so that by the time ArgoCD syncs your overlay, you have high confidence it will succeed.
