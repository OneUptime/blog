# How to Validate HelmRelease Values for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, helm, helmrelease, validation, values, kubernetes, gitops

Description: A practical guide to validating HelmRelease values in Flux CD to prevent deployment failures caused by misconfigured Helm chart parameters.

---

HelmRelease resources in Flux CD define how Helm charts are deployed to your cluster. Invalid or missing values can cause Helm template rendering to fail, leaving your application in a broken state. This guide covers strategies for validating HelmRelease values before they reach your Flux CD deployment pipeline.

## Prerequisites

- Flux CLI v2.0 or later
- Helm CLI v3
- A Flux CD repository with HelmRelease resources
- Basic understanding of Helm charts and values

## Understanding HelmRelease Values

A Flux CD HelmRelease can specify values in multiple ways:

```yaml
# apps/production/redis.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: cache
spec:
  interval: 30m
  chart:
    spec:
      chart: redis
      version: "18.6.1"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  # Inline values
  values:
    architecture: replication
    auth:
      enabled: true
      existingSecret: redis-auth
    master:
      persistence:
        enabled: true
        size: 10Gi
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: 1000m
          memory: 1Gi
    replica:
      replicaCount: 3
      persistence:
        enabled: true
        size: 10Gi
  # Values from ConfigMaps or Secrets
  valuesFrom:
    - kind: ConfigMap
      name: redis-common-values
    - kind: Secret
      name: redis-secret-values
```

## Validation Strategy 1: Helm Template Rendering

The most effective validation is rendering the chart templates with your values.

```bash
#!/bin/bash
# scripts/validate-helmrelease-values.sh
# Validates HelmRelease values by rendering chart templates

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
TEMP_DIR=$(mktemp -d)
ERRORS=0

trap "rm -rf $TEMP_DIR" EXIT

echo "Validating HelmRelease values..."

# Find all HelmRelease files
find "$REPO_ROOT" -name "*.yaml" -type f | while read -r file; do
  # Check if the file contains a HelmRelease
  KIND=$(yq '.kind' "$file" 2>/dev/null)
  [ "$KIND" = "HelmRelease" ] || continue

  NAME=$(yq '.metadata.name' "$file")
  NAMESPACE=$(yq '.metadata.namespace' "$file")
  CHART=$(yq '.spec.chart.spec.chart' "$file")
  VERSION=$(yq '.spec.chart.spec.version' "$file")
  REPO_NAME=$(yq '.spec.chart.spec.sourceRef.name' "$file")

  echo ""
  echo "--- HelmRelease: $NAME (chart: $CHART@$VERSION) ---"

  # Extract values to a temporary file
  yq '.spec.values' "$file" > "$TEMP_DIR/values.yaml"

  # Look up the HelmRepository URL
  REPO_URL=""
  REPO_FILE=$(find "$REPO_ROOT" -name "*.yaml" -type f -exec \
    grep -l "name: $REPO_NAME" {} \; | head -1)

  if [ -n "$REPO_FILE" ]; then
    REPO_URL=$(yq '.spec.url' "$REPO_FILE" 2>/dev/null)
  fi

  if [ -z "$REPO_URL" ] || [ "$REPO_URL" = "null" ]; then
    echo "  SKIP: Could not find HelmRepository URL for $REPO_NAME"
    continue
  fi

  # Add the Helm repository
  helm repo add "$REPO_NAME" "$REPO_URL" --force-update > /dev/null 2>&1
  helm repo update > /dev/null 2>&1

  # Render the chart with the values
  if ! helm template "$NAME" "$REPO_NAME/$CHART" \
    --version "$VERSION" \
    --namespace "$NAMESPACE" \
    --values "$TEMP_DIR/values.yaml" \
    > "$TEMP_DIR/rendered.yaml" 2>&1; then

    echo "  FAILED: Template rendering failed"
    helm template "$NAME" "$REPO_NAME/$CHART" \
      --version "$VERSION" \
      --namespace "$NAMESPACE" \
      --values "$TEMP_DIR/values.yaml" 2>&1 || true
    ERRORS=$((ERRORS + 1))
  else
    RESOURCE_COUNT=$(grep -c "^kind:" "$TEMP_DIR/rendered.yaml" || echo 0)
    echo "  OK: Rendered $RESOURCE_COUNT resources"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Validation failed with $ERRORS error(s)"
  exit 1
fi

echo ""
echo "All HelmRelease values validated successfully"
```

## Validation Strategy 2: JSON Schema Validation

Many Helm charts include a `values.schema.json` file. Use it to validate your values.

```bash
#!/bin/bash
# scripts/validate-helmrelease-schema.sh
# Validates HelmRelease values against the chart's JSON schema

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
TEMP_DIR=$(mktemp -d)
ERRORS=0

trap "rm -rf $TEMP_DIR" EXIT

echo "Validating HelmRelease values against chart schemas..."

find "$REPO_ROOT" -name "*.yaml" -type f | while read -r file; do
  KIND=$(yq '.kind' "$file" 2>/dev/null)
  [ "$KIND" = "HelmRelease" ] || continue

  NAME=$(yq '.metadata.name' "$file")
  CHART=$(yq '.spec.chart.spec.chart' "$file")
  VERSION=$(yq '.spec.chart.spec.version' "$file")
  REPO_NAME=$(yq '.spec.chart.spec.sourceRef.name' "$file")

  echo "Checking schema for: $NAME ($CHART@$VERSION)"

  # Pull the chart to inspect its schema
  CHART_DIR="$TEMP_DIR/$NAME"
  mkdir -p "$CHART_DIR"

  if helm pull "$REPO_NAME/$CHART" \
    --version "$VERSION" \
    --untar \
    --untardir "$CHART_DIR" 2>/dev/null; then

    SCHEMA_FILE="$CHART_DIR/$CHART/values.schema.json"

    if [ -f "$SCHEMA_FILE" ]; then
      # Extract values from HelmRelease
      yq '.spec.values' "$file" -o json > "$TEMP_DIR/values.json"

      # Validate against the schema
      if python3 -c "
import json
import jsonschema

with open('$SCHEMA_FILE') as f:
    schema = json.load(f)
with open('$TEMP_DIR/values.json') as f:
    values = json.load(f)

jsonschema.validate(values, schema)
print('  OK: Values match schema')
" 2>&1; then
        :
      else
        echo "  FAILED: Values do not match chart schema"
        ERRORS=$((ERRORS + 1))
      fi
    else
      echo "  SKIP: Chart does not include values.schema.json"
    fi
  else
    echo "  SKIP: Could not pull chart"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Schema validation failed with $ERRORS error(s)"
  exit 1
fi

echo "All schemas validated"
```

## Validation Strategy 3: Required Values Check

Define and enforce required values for each HelmRelease.

```yaml
# .flux-validation/required-values.yaml
# Defines required values for each HelmRelease
helmreleases:
  redis:
    required:
      - auth.enabled
      - master.resources.limits.memory
      - master.persistence.enabled
      - replica.replicaCount
    constraints:
      replica.replicaCount:
        min: 2
      master.resources.limits.memory:
        pattern: "^[0-9]+(Mi|Gi)$"

  postgresql:
    required:
      - auth.postgresPassword
      - primary.resources.limits.memory
      - primary.persistence.size
    constraints:
      primary.persistence.size:
        pattern: "^[0-9]+(Gi|Ti)$"
```

```bash
#!/bin/bash
# scripts/validate-required-values.sh
# Checks that HelmReleases include all required values

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
CONFIG="$REPO_ROOT/.flux-validation/required-values.yaml"
ERRORS=0

if [ ! -f "$CONFIG" ]; then
  echo "No required values config found at $CONFIG"
  exit 0
fi

echo "Checking required HelmRelease values..."

find "$REPO_ROOT" -name "*.yaml" -type f | while read -r file; do
  KIND=$(yq '.kind' "$file" 2>/dev/null)
  [ "$KIND" = "HelmRelease" ] || continue

  NAME=$(yq '.metadata.name' "$file")
  CHART=$(yq '.spec.chart.spec.chart' "$file")

  echo ""
  echo "--- HelmRelease: $NAME (chart: $CHART) ---"

  # Get required values for this chart
  REQUIRED=$(yq ".helmreleases.$CHART.required[]" "$CONFIG" 2>/dev/null)

  if [ -z "$REQUIRED" ] || [ "$REQUIRED" = "null" ]; then
    echo "  SKIP: No required values defined for chart $CHART"
    continue
  fi

  # Check each required value
  echo "$REQUIRED" | while read -r value_path; do
    # Convert dot notation to yq path
    YQ_PATH=".spec.values.$(echo "$value_path" | sed 's/\./\./g')"

    ACTUAL=$(yq "$YQ_PATH" "$file" 2>/dev/null)

    if [ "$ACTUAL" = "null" ] || [ -z "$ACTUAL" ]; then
      echo "  ERROR: Missing required value: $value_path"
      ERRORS=$((ERRORS + 1))
    else
      echo "  OK: $value_path = $ACTUAL"
    fi
  done
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "Required values check failed with $ERRORS error(s)"
  exit 1
fi

echo ""
echo "All required values present"
```

## Validation Strategy 4: Version Compatibility Check

Ensure chart versions are compatible and pinned.

```bash
#!/bin/bash
# scripts/validate-helm-versions.sh
# Checks HelmRelease chart version pinning and availability

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0
WARNINGS=0

echo "Validating Helm chart versions..."

find "$REPO_ROOT" -name "*.yaml" -type f | while read -r file; do
  KIND=$(yq '.kind' "$file" 2>/dev/null)
  [ "$KIND" = "HelmRelease" ] || continue

  NAME=$(yq '.metadata.name' "$file")
  CHART=$(yq '.spec.chart.spec.chart' "$file")
  VERSION=$(yq '.spec.chart.spec.version' "$file")

  echo "Checking: $NAME ($CHART)"

  # Check version is pinned (not a range)
  if [ "$VERSION" = "null" ] || [ -z "$VERSION" ]; then
    echo "  ERROR: No version specified for $CHART"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  # Check for version ranges (e.g., >=1.0.0, ~1.0, *)
  if echo "$VERSION" | grep -qE "[><=~\*\^]"; then
    echo "  WARNING: Version range used ($VERSION) - pin to exact version"
    WARNINGS=$((WARNINGS + 1))
  else
    echo "  OK: Version pinned to $VERSION"
  fi

  # Check if install/upgrade remediation is configured
  RETRIES=$(yq '.spec.install.remediation.retries' "$file" 2>/dev/null)
  if [ "$RETRIES" = "null" ]; then
    echo "  WARNING: No install remediation configured"
    WARNINGS=$((WARNINGS + 1))
  fi

  UPGRADE_RETRIES=$(yq '.spec.upgrade.remediation.retries' "$file" 2>/dev/null)
  if [ "$UPGRADE_RETRIES" = "null" ]; then
    echo "  WARNING: No upgrade remediation configured"
    WARNINGS=$((WARNINGS + 1))
  fi
done

echo ""
echo "Errors: $ERRORS, Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  exit 1
fi
```

## Complete HelmRelease with Best Practices

```yaml
# apps/production/postgresql.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: database
spec:
  interval: 30m
  chart:
    spec:
      # Always pin to an exact version
      chart: postgresql
      version: "13.4.1"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  # Install remediation
  install:
    remediation:
      retries: 3
  # Upgrade remediation with rollback
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
    cleanupOnFail: true
  # Rollback configuration
  rollback:
    cleanupOnFail: true
  # Chart values
  values:
    auth:
      # Reference a Secret for the password
      existingSecret: postgresql-auth
      database: myapp
      username: myapp
    primary:
      persistence:
        enabled: true
        size: 50Gi
        storageClass: fast-ssd
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi
    metrics:
      enabled: true
      serviceMonitor:
        enabled: true
```

## CI Pipeline Integration

```yaml
# .github/workflows/validate-helmreleases.yaml
name: Validate HelmReleases
on:
  pull_request:
    paths:
      - "apps/**"
      - "infrastructure/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install Helm
          curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
          # Install yq
          sudo wget -qO /usr/local/bin/yq \
            https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

      - name: Add Helm repositories
        run: |
          # Add all HelmRepositories defined in the repo
          find . -name "*.yaml" -type f | while read -r file; do
            KIND=$(yq '.kind' "$file" 2>/dev/null)
            if [ "$KIND" = "HelmRepository" ]; then
              NAME=$(yq '.metadata.name' "$file")
              URL=$(yq '.spec.url' "$file")
              echo "Adding repo: $NAME ($URL)"
              helm repo add "$NAME" "$URL" || true
            fi
          done
          helm repo update

      - name: Validate HelmRelease templates
        run: bash scripts/validate-helmrelease-values.sh

      - name: Check version pinning
        run: bash scripts/validate-helm-versions.sh

      - name: Check required values
        run: bash scripts/validate-required-values.sh
```

## Summary

Validating HelmRelease values prevents deployment failures in Flux CD. Use Helm template rendering to catch template errors, JSON schema validation for charts that provide schemas, required value checks for organizational policies, and version pinning validation for reproducible deployments. Integrate all these checks into your CI pipeline for automated protection against misconfigured Helm releases.
