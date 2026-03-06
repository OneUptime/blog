# How to Validate Kustomize Overlays for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kustomize, Overlay, Validation, Kubernetes, GitOps, Testing

Description: Learn how to validate Kustomize overlays used in Flux CD to ensure they render correctly across all environments before deployment.

---

Kustomize overlays are the backbone of environment-specific configurations in Flux CD. When an overlay is misconfigured, the Flux kustomize-controller fails to reconcile, leaving your cluster in a stale state. This guide covers techniques for validating Kustomize overlays before they reach your Flux CD deployment.

## Prerequisites

- Kustomize CLI or kubectl with built-in kustomize
- Flux CLI v2.0 or later
- kubeconform for schema validation
- A Flux CD repository with base and overlay structure

## Typical Overlay Structure

```text
infrastructure/
  base/
    kustomization.yaml
    namespace.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    dev/
      kustomization.yaml
      patches/
        deployment-patch.yaml
      configmap-values.yaml
    staging/
      kustomization.yaml
      patches/
        deployment-patch.yaml
        ingress-patch.yaml
      configmap-values.yaml
    production/
      kustomization.yaml
      patches/
        deployment-patch.yaml
        ingress-patch.yaml
        hpa.yaml
      configmap-values.yaml
```

## Base Resources

```yaml
# infrastructure/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

```yaml
# infrastructure/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: web-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: web-app
          image: web-app:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: APP_ENV
              valueFrom:
                configMapKeyRef:
                  name: web-app-config
                  key: APP_ENV
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

```yaml
# infrastructure/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-app-config
  namespace: web-app
data:
  APP_ENV: "default"
  LOG_LEVEL: "info"
  CACHE_TTL: "300"
```

## Production Overlay

```yaml
# infrastructure/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - patches/deployment-patch.yaml
  - patches/hpa.yaml
  - configmap-values.yaml
commonLabels:
  environment: production
```

```yaml
# infrastructure/overlays/production/patches/deployment-patch.yaml
# Scale up and increase resources for production
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: web-app
spec:
  replicas: 5
  template:
    spec:
      containers:
        - name: web-app
          image: web-app:1.2.3
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 1Gi
```

```yaml
# infrastructure/overlays/production/patches/hpa.yaml
# Add HorizontalPodAutoscaler for production
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app
  namespace: web-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 5
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

```yaml
# infrastructure/overlays/production/configmap-values.yaml
# Production-specific configuration values
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-app-config
  namespace: web-app
data:
  APP_ENV: "production"
  LOG_LEVEL: "warn"
  CACHE_TTL: "3600"
```

## Validation Method 1: Kustomize Build

The simplest validation is running `kustomize build` on each overlay.

```bash
#!/bin/bash
# scripts/validate-overlays-build.sh
# Validates that all Kustomize overlays build successfully

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

echo "Validating Kustomize overlay builds..."

# Find all kustomization.yaml files in overlay directories
find "$REPO_ROOT" -path "*/overlays/*/kustomization.yaml" | while read -r ks_file; do
  OVERLAY_DIR=$(dirname "$ks_file")
  OVERLAY_NAME=$(basename "$(dirname "$OVERLAY_DIR")")/$(basename "$OVERLAY_DIR")

  echo "Building overlay: $OVERLAY_NAME"

  # Run kustomize build
  if ! kustomize build "$OVERLAY_DIR" > /dev/null 2>&1; then
    echo "  FAILED: $OVERLAY_NAME"
    echo "  Error output:"
    kustomize build "$OVERLAY_DIR" 2>&1 || true
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $OVERLAY_NAME"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Build validation failed with $ERRORS error(s)"
  exit 1
fi

echo ""
echo "All overlays built successfully"
```

## Validation Method 2: Schema Validation

After building, validate the rendered output against Kubernetes schemas.

```bash
#!/bin/bash
# scripts/validate-overlays-schema.sh
# Validates rendered overlays against Kubernetes API schemas

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

# Download Flux CRD schemas if not present
SCHEMA_DIR="/tmp/k8s-schemas"
if [ ! -d "$SCHEMA_DIR" ]; then
  mkdir -p "$SCHEMA_DIR"
  curl -sL https://github.com/fluxcd/flux2/releases/latest/download/crd-schemas.tar.gz | \
    tar xz -C "$SCHEMA_DIR"
fi

echo "Validating overlay schemas..."

find "$REPO_ROOT" -path "*/overlays/*/kustomization.yaml" | while read -r ks_file; do
  OVERLAY_DIR=$(dirname "$ks_file")
  OVERLAY_NAME=$(basename "$(dirname "$OVERLAY_DIR")")/$(basename "$OVERLAY_DIR")

  echo "Validating: $OVERLAY_NAME"

  # Build and pipe to kubeconform
  if ! kustomize build "$OVERLAY_DIR" | \
    kubeconform \
      -strict \
      -ignore-missing-schemas \
      -schema-location default \
      -schema-location "$SCHEMA_DIR/{{ .ResourceKind }}_{{ .ResourceAPIVersion }}.json" \
      -summary 2>&1; then
    echo "  FAILED: $OVERLAY_NAME"
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $OVERLAY_NAME"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Schema validation failed with $ERRORS error(s)"
  exit 1
fi

echo "All overlays pass schema validation"
```

## Validation Method 3: Cross-Environment Comparison

Compare overlays across environments to detect unintended drift.

```bash
#!/bin/bash
# scripts/compare-overlays.sh
# Compares rendered overlays across environments to detect drift

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

COMPONENT=${1:-infrastructure}
ENVS=("dev" "staging" "production")

echo "Comparing $COMPONENT overlays across environments..."
echo ""

# Build each overlay
for env in "${ENVS[@]}"; do
  OVERLAY_DIR="$REPO_ROOT/$COMPONENT/overlays/$env"

  if [ ! -d "$OVERLAY_DIR" ]; then
    echo "WARNING: Overlay not found: $OVERLAY_DIR"
    continue
  fi

  # Build and save the rendered output
  kustomize build "$OVERLAY_DIR" > "$TEMP_DIR/${env}.yaml"
  echo "Built: $env ($(wc -l < "$TEMP_DIR/${env}.yaml") lines)"
done

echo ""

# Compare consecutive environments
for i in $(seq 0 $((${#ENVS[@]} - 2))); do
  ENV_A="${ENVS[$i]}"
  ENV_B="${ENVS[$((i + 1))]}"

  FILE_A="$TEMP_DIR/${ENV_A}.yaml"
  FILE_B="$TEMP_DIR/${ENV_B}.yaml"

  if [ -f "$FILE_A" ] && [ -f "$FILE_B" ]; then
    echo "--- Differences: $ENV_A vs $ENV_B ---"
    diff --color "$FILE_A" "$FILE_B" || true
    echo ""
  fi
done
```

## Validation Method 4: Required Resource Checks

Ensure all environments have required resources like resource limits and health checks.

```bash
#!/bin/bash
# scripts/validate-overlay-requirements.sh
# Checks that overlays include required resources and configurations

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

echo "Checking overlay requirements..."

find "$REPO_ROOT" -path "*/overlays/production/kustomization.yaml" | while read -r ks_file; do
  OVERLAY_DIR=$(dirname "$ks_file")
  COMPONENT=$(basename "$(dirname "$(dirname "$OVERLAY_DIR")")")

  echo ""
  echo "--- $COMPONENT/production ---"

  # Build the overlay
  RENDERED=$(kustomize build "$OVERLAY_DIR")

  # Check 1: All Deployments have resource limits
  echo "$RENDERED" | python3 -c "
import yaml
import sys

docs = yaml.safe_load_all(sys.stdin)
errors = 0

for doc in docs:
    if doc and doc.get('kind') == 'Deployment':
        name = doc['metadata']['name']
        containers = doc['spec']['template']['spec']['containers']
        for container in containers:
            if 'resources' not in container:
                print(f'  ERROR: {name}/{container[\"name\"]} missing resources')
                errors += 1
            elif 'limits' not in container.get('resources', {}):
                print(f'  ERROR: {name}/{container[\"name\"]} missing resource limits')
                errors += 1
            else:
                print(f'  OK: {name}/{container[\"name\"]} has resource limits')

sys.exit(1 if errors > 0 else 0)
" || ERRORS=$((ERRORS + 1))

  # Check 2: Production has HPA defined
  if echo "$RENDERED" | grep -q "kind: HorizontalPodAutoscaler"; then
    echo "  OK: HPA defined"
  else
    echo "  WARNING: No HPA defined for production"
  fi

  # Check 3: Replicas are greater than 1 for production
  echo "$RENDERED" | grep -A5 "kind: Deployment" | grep "replicas:" | while read -r line; do
    REPLICAS=$(echo "$line" | awk '{print $2}')
    if [ "$REPLICAS" -lt 2 ] 2>/dev/null; then
      echo "  WARNING: Deployment has only $REPLICAS replica(s) in production"
    fi
  done
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Requirement checks failed with $ERRORS error(s)"
  exit 1
fi

echo ""
echo "All overlay requirements satisfied"
```

## Validation Method 5: Flux Build Integration

Use `flux build` to validate overlays with Flux-specific features like variable substitution.

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: prod-east-1
      REGION: us-east-1
```

```bash
# Validate with Flux variable substitution
flux build kustomization infrastructure \
  --path ./infrastructure/overlays/production \
  --kustomization-file ./clusters/production/infrastructure.yaml
```

## CI Pipeline

```yaml
# .github/workflows/validate-overlays.yaml
name: Validate Kustomize Overlays
on:
  pull_request:
    paths:
      - "infrastructure/**"
      - "apps/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        component: [infrastructure, apps]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install kustomize
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
          sudo mv kustomize /usr/local/bin/
          # Install kubeconform
          curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
            tar xz -C /usr/local/bin

      - name: Build all overlays
        run: |
          for overlay_dir in ${{ matrix.component }}/overlays/*/; do
            echo "Building: $overlay_dir"
            kustomize build "$overlay_dir"
          done

      - name: Schema validation
        run: |
          for overlay_dir in ${{ matrix.component }}/overlays/*/; do
            echo "Validating: $overlay_dir"
            kustomize build "$overlay_dir" | \
              kubeconform -strict -ignore-missing-schemas -summary
          done

      - name: Cross-environment comparison
        run: bash scripts/compare-overlays.sh ${{ matrix.component }}
```

## Summary

Validating Kustomize overlays is essential for maintaining reliable Flux CD deployments across multiple environments. Use a combination of build validation, schema checking, cross-environment comparison, and requirement enforcement to catch issues before they reach your cluster. Automate these checks in CI and use `flux build` for Flux-specific features like variable substitution.
