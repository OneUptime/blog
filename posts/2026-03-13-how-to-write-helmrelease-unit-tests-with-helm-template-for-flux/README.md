# How to Write HelmRelease Unit Tests with helm template for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Helm, Unit Tests, CI/CD

Description: Learn how to write unit tests for Flux HelmRelease configurations using helm template to validate chart rendering before deployment.

---

## Introduction

Flux HelmRelease resources deploy Helm charts with specific values. Before these reach your cluster, you can validate the rendered output using `helm template`. This catches value errors, template bugs, and misconfigured chart parameters before they cause failed releases. This guide shows how to extract values from HelmRelease manifests and test them with `helm template`.

## Prerequisites

- Helm CLI installed (v3.12 or later)
- kubectl installed
- yq installed (for YAML processing)
- A Flux GitOps repository with HelmRelease definitions

## Step 1: Install Required Tools

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install yq
brew install yq  # macOS
# or
wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/local/bin/yq && chmod +x /usr/local/bin/yq

# Verify installations
helm version
yq --version
```

## Step 2: Extract Values from HelmRelease

A Flux HelmRelease contains inline values. Extract them for use with `helm template`.

```yaml
# helmreleases/nginx-ingress.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-system
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.11.3"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
  values:
    controller:
      replicaCount: 3
      service:
        type: LoadBalancer
      resources:
        limits:
          cpu: 500m
          memory: 512Mi
        requests:
          cpu: 100m
          memory: 128Mi
      metrics:
        enabled: true
```

Extract the values to a file.

```bash
# Extract values from HelmRelease
yq eval '.spec.values' helmreleases/nginx-ingress.yaml > /tmp/nginx-values.yaml

# View extracted values
cat /tmp/nginx-values.yaml
```

## Step 3: Add the Helm Repository and Pull the Chart

```bash
# Add the repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Pull the chart at the specific version
helm pull ingress-nginx/ingress-nginx \
  --version 4.11.3 \
  --untar \
  --untardir /tmp/charts/
```

## Step 4: Run helm template

Render the chart with the extracted values.

```bash
# Template the chart
helm template nginx-ingress /tmp/charts/ingress-nginx \
  --namespace ingress-system \
  --values /tmp/nginx-values.yaml \
  > /tmp/rendered-output.yaml

echo "Template rendered successfully"
```

## Step 5: Write Assertions Against the Rendered Output

```bash
#!/bin/bash
# test-helmrelease-nginx.sh
set -euo pipefail

CHART_DIR="/tmp/charts/ingress-nginx"
VALUES_FILE="/tmp/nginx-values.yaml"
NAMESPACE="ingress-system"
OUTPUT=$(helm template nginx-ingress "$CHART_DIR" \
  --namespace "$NAMESPACE" \
  --values "$VALUES_FILE")

ERRORS=0

assert_contains() {
  local description=$1
  local pattern=$2
  if echo "$OUTPUT" | grep -q "$pattern"; then
    echo "PASS: $description"
  else
    echo "FAIL: $description (pattern: $pattern)"
    ERRORS=$((ERRORS + 1))
  fi
}

assert_value() {
  local description=$1
  local filter=$2
  local expected=$3
  local actual=$(echo "$OUTPUT" | yq eval "$filter" -)
  if [ "$actual" == "$expected" ]; then
    echo "PASS: $description (value: $actual)"
  else
    echo "FAIL: $description (expected: $expected, got: $actual)"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "=== Testing nginx-ingress HelmRelease ==="

# Test replica count
assert_value "Replica count is 3" \
  'select(.kind == "Deployment" and .metadata.name == "*controller*") | .spec.replicas' \
  "3"

# Test service type
assert_contains "Service type is LoadBalancer" "type: LoadBalancer"

# Test resource limits exist
assert_contains "CPU limit is set" "cpu: 500m"
assert_contains "Memory limit is set" "memory: 512Mi"

# Test namespace
assert_contains "Resources use correct namespace" "namespace: ingress-system"

if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS test(s) failed"
  exit 1
fi

echo "All tests passed"
```

## Step 6: Automate Testing for All HelmReleases

```bash
#!/bin/bash
# test-all-helmreleases.sh
set -euo pipefail

HELMRELEASES_DIR="helmreleases"
CHARTS_DIR="/tmp/helm-test-charts"
TOTAL_PASS=0
TOTAL_FAIL=0

mkdir -p "$CHARTS_DIR"

for hr_file in "$HELMRELEASES_DIR"/*.yaml; do
  echo "=== Testing: $hr_file ==="

  # Extract chart info
  chart_name=$(yq eval '.spec.chart.spec.chart' "$hr_file")
  chart_version=$(yq eval '.spec.chart.spec.version' "$hr_file")
  repo_name=$(yq eval '.spec.chart.spec.sourceRef.name' "$hr_file")
  release_name=$(yq eval '.metadata.name' "$hr_file")
  namespace=$(yq eval '.metadata.namespace' "$hr_file")

  # Extract values
  values_file="$CHARTS_DIR/${release_name}-values.yaml"
  yq eval '.spec.values // {}' "$hr_file" > "$values_file"

  # Pull chart (skip if already downloaded)
  chart_dir="$CHARTS_DIR/$chart_name-$chart_version"
  if [ ! -d "$chart_dir" ]; then
    helm pull "$repo_name/$chart_name" \
      --version "$chart_version" \
      --untar \
      --untardir "$CHARTS_DIR" 2>/dev/null || {
      echo "  SKIP: Could not pull chart $chart_name:$chart_version"
      continue
    }
  fi

  # Template and validate
  if helm template "$release_name" "$CHARTS_DIR/$chart_name" \
    --namespace "$namespace" \
    --values "$values_file" > /dev/null 2>&1; then
    echo "  PASS: Template renders successfully"
    TOTAL_PASS=$((TOTAL_PASS + 1))
  else
    echo "  FAIL: Template rendering failed"
    helm template "$release_name" "$CHARTS_DIR/$chart_name" \
      --namespace "$namespace" \
      --values "$values_file" 2>&1 | head -10
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
  fi
done

echo ""
echo "=== Results ==="
echo "Passed: $TOTAL_PASS"
echo "Failed: $TOTAL_FAIL"

# Cleanup
rm -rf "$CHARTS_DIR"

[ "$TOTAL_FAIL" -eq 0 ] || exit 1
```

## Step 7: Test with valuesFrom ConfigMaps and Secrets

Flux HelmReleases can reference external values. Simulate them in tests.

```yaml
# HelmRelease with valuesFrom
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
  values:
    replicaCount: 2
  valuesFrom:
    - kind: ConfigMap
      name: app-values
      valuesKey: values.yaml
```

```bash
# Create a test values file simulating the ConfigMap
cat > /tmp/configmap-values.yaml <<EOF
image:
  tag: "v1.2.3"
database:
  host: db.example.com
EOF

# Template with both inline and external values
helm template my-app /tmp/charts/my-app \
  --values /tmp/inline-values.yaml \
  --values /tmp/configmap-values.yaml
```

## CI Integration

```yaml
# .github/workflows/test-helmreleases.yaml
name: Test HelmReleases
on:
  pull_request:
    paths:
      - 'helmreleases/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v4

      - name: Install yq
        uses: mikefarah/yq@master

      - name: Add Helm repositories
        run: |
          helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
          helm repo add bitnami https://charts.bitnami.com/bitnami
          helm repo update

      - name: Test HelmRelease templates
        run: bash test-all-helmreleases.sh
```

## Best Practices

- Test HelmRelease templates on every PR that modifies values or chart versions
- Extract and version the test scripts alongside your HelmRelease definitions
- Test chart version upgrades by comparing output between old and new versions
- Use `--dry-run` in addition to `helm template` for server-side validation
- Pin chart versions in HelmReleases to ensure reproducible test results
- Validate that rendered output passes your organization's security policies

## Conclusion

Unit testing HelmRelease configurations with `helm template` is a practical way to catch errors before they reach your cluster. By extracting values, rendering charts locally, and asserting on the output, you build confidence in your Helm deployments. Automating these tests in CI ensures that every change to HelmRelease values or chart versions is validated before merging.
