# How to Validate Flux CD HelmRelease Configuration Locally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Helm, HelmRelease, Validation, Local Testing, CI/CD

Description: Learn how to validate Flux CD HelmRelease configurations locally before pushing to Git, including schema validation, template rendering, and values testing.

---

## Introduction

Flux CD HelmRelease resources define how Helm charts are installed and configured in your clusters. Misconfigurations in HelmRelease manifests can cause failed installations, incorrect values, or broken upgrades. This guide shows you how to validate HelmRelease configurations locally before committing them to Git, catching errors early in the development cycle.

## Prerequisites

```bash
# Install required tools
# Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# kubeconform for schema validation
go install github.com/yannh/kubeconform/cmd/kubeconform@latest

# helm-docs for documentation generation (optional)
go install github.com/norwoodj/helm-docs/cmd/helm-docs@latest

# yamllint for YAML linting
pip install yamllint
```

## Understanding HelmRelease Structure

A typical Flux CD HelmRelease resource:

```yaml
# helmrelease-example.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  # Timeout for Helm operations
  timeout: 10m
  chart:
    spec:
      chart: my-app
      version: "2.1.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
      # How often to check for new chart versions
      interval: 5m
  # Helm values
  values:
    replicaCount: 3
    image:
      repository: myorg/my-app
      tag: "1.5.0"
    service:
      type: ClusterIP
      port: 8080
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
  # Values from external sources
  valuesFrom:
    - kind: ConfigMap
      name: my-app-values
      valuesKey: values.yaml
  # Install configuration
  install:
    remediation:
      retries: 3
    crds: CreateReplace
  # Upgrade configuration
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
    cleanupOnFail: true
    crds: CreateReplace
  # Rollback configuration
  rollback:
    timeout: 5m
    cleanupOnFail: true
```

## Step 1: Validate HelmRelease YAML Schema

### Validate Against Flux CRDs

```bash
# Validate HelmRelease against the Flux CRD schema
kubeconform \
  -strict \
  -summary \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/fluxcd/flux2/main/manifests/crds/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  helmrelease-example.yaml
```

### YAML Lint Configuration

```yaml
# .yamllint.yaml
# Configuration for yamllint
extends: default
rules:
  # Allow long lines for Helm values
  line-length:
    max: 200
    allow-non-breakable-words: true
  # Require consistent indentation
  indentation:
    spaces: 2
    indent-sequences: true
  # Allow comments at the start of lines
  comments:
    min-spaces-from-content: 1
  # Ensure proper document markers
  document-start: disable
  # Ensure truthy values are explicit
  truthy:
    allowed-values: ['true', 'false', 'yes', 'no']
```

```bash
# Run yamllint on all HelmRelease files
find . -name "*.yaml" -exec grep -l "kind: HelmRelease" {} \; | \
  xargs yamllint -c .yamllint.yaml
```

## Step 2: Validate Helm Values Locally

### Fetch the Chart and Validate Values

```bash
# Add the Helm repository locally
helm repo add my-charts https://charts.example.com
helm repo update

# Download the chart to inspect its values schema
helm pull my-charts/my-app --version 2.1.0 --untar

# Show default values
helm show values my-charts/my-app --version 2.1.0

# Validate your custom values against the chart's schema
helm lint my-app/ --values my-custom-values.yaml
```

### Extract Values from HelmRelease

```bash
#!/bin/bash
# extract-and-validate-values.sh
# Extract values from a HelmRelease and validate them against the chart

HELMRELEASE_FILE=$1

if [ -z "$HELMRELEASE_FILE" ]; then
  echo "Usage: $0 <helmrelease.yaml>"
  exit 1
fi

# Extract chart name and version
CHART=$(yq eval '.spec.chart.spec.chart' "$HELMRELEASE_FILE")
VERSION=$(yq eval '.spec.chart.spec.version' "$HELMRELEASE_FILE")

echo "Chart: $CHART, Version: $VERSION"

# Extract values to a temporary file
yq eval '.spec.values' "$HELMRELEASE_FILE" > /tmp/hr-values.yaml

echo "Extracted values:"
cat /tmp/hr-values.yaml

# Validate by rendering the chart with extracted values
helm template test-release "$CHART" \
  --version "$VERSION" \
  --values /tmp/hr-values.yaml \
  --validate 2>&1

if [ $? -eq 0 ]; then
  echo "Values validation passed."
else
  echo "Values validation FAILED."
  exit 1
fi
```

## Step 3: Template Rendering Validation

### Render Helm Templates Locally

```bash
# Render the chart with your custom values
# This catches template errors, missing values, and invalid output
helm template my-release my-charts/my-app \
  --version 2.1.0 \
  --values my-custom-values.yaml \
  --namespace default \
  --validate

# Render and validate the output against Kubernetes schemas
helm template my-release my-charts/my-app \
  --version 2.1.0 \
  --values my-custom-values.yaml \
  --namespace default | \
  kubeconform -strict -summary -kubernetes-version 1.29.0

# Render with debug output to see all template processing
helm template my-release my-charts/my-app \
  --version 2.1.0 \
  --values my-custom-values.yaml \
  --debug 2>&1 | head -100
```

### Test Different Value Combinations

```yaml
# test-values-minimal.yaml
# Test with minimal values to ensure defaults work
replicaCount: 1
image:
  repository: myorg/my-app
  tag: "1.5.0"
```

```yaml
# test-values-production.yaml
# Test with production-like values
replicaCount: 5
image:
  repository: myorg/my-app
  tag: "1.5.0"
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: "2"
    memory: 2Gi
autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: app.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: app-tls
      hosts:
        - app.example.com
```

```bash
# Test both value files
for values_file in test-values-minimal.yaml test-values-production.yaml; do
  echo "Testing with $values_file..."
  helm template my-release my-charts/my-app \
    --version 2.1.0 \
    --values "$values_file" \
    --validate 2>&1
  echo "---"
done
```

## Step 4: Validate HelmRelease-Specific Features

### Test Install and Upgrade Remediation

```yaml
# helmrelease-with-remediation.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.1.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    replicaCount: 3
  # Test configuration: verify these settings are valid
  install:
    # Number of retries before marking as failed
    remediation:
      retries: 3
    # CRD handling: Skip, Create, CreateReplace
    crds: CreateReplace
    # Create namespace if it doesn't exist
    createNamespace: true
  upgrade:
    # Force resource update through delete/recreate
    force: false
    remediation:
      retries: 3
      # Roll back to last successful release on failure
      remediateLastFailure: true
    # Delete resources that failed to upgrade
    cleanupOnFail: true
    # CRD handling during upgrade
    crds: CreateReplace
  # Test configuration: drift detection
  driftDetection:
    mode: enabled
    ignore:
      # Ignore fields that are managed by other controllers
      - paths: ["/spec/replicas"]
        target:
          kind: Deployment
```

### Validate with Flux Build

```bash
# Use flux CLI to validate the HelmRelease
# This checks Flux-specific fields and references
flux build kustomization my-app \
  --path ./releases/production \
  --dry-run 2>&1
```

## Step 5: Validate ValuesFrom References

### Check ConfigMap and Secret References

```bash
#!/bin/bash
# validate-values-from.sh
# Verify that valuesFrom references exist

HELMRELEASE_FILE=$1

echo "Checking valuesFrom references in $HELMRELEASE_FILE..."

# Extract valuesFrom entries
yq eval '.spec.valuesFrom[]' "$HELMRELEASE_FILE" 2>/dev/null | while read -r line; do
  KIND=$(echo "$line" | yq eval '.kind' -)
  NAME=$(echo "$line" | yq eval '.name' -)
  NAMESPACE=$(yq eval '.metadata.namespace' "$HELMRELEASE_FILE")

  echo "Checking $KIND/$NAME in namespace $NAMESPACE..."

  # Check if the referenced resource exists in the repo
  FOUND=$(find . -name "*.yaml" -exec grep -l "name: $NAME" {} \; | \
    xargs grep -l "kind: $KIND" 2>/dev/null)

  if [ -n "$FOUND" ]; then
    echo "  Found in: $FOUND"
  else
    echo "  WARNING: $KIND/$NAME not found in repository"
  fi
done
```

### Example ValuesFrom ConfigMap

```yaml
# my-app-values-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-values
  namespace: default
data:
  values.yaml: |
    # Shared values across environments
    monitoring:
      enabled: true
      serviceMonitor:
        enabled: true
    logging:
      level: info
      format: json
```

## Step 6: Automated CI Validation

### GitHub Actions Workflow

```yaml
# .github/workflows/validate-helmreleases.yaml
name: Validate HelmReleases
on:
  pull_request:
    paths:
      - 'releases/**'
      - 'clusters/**/helmreleases/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Setup Helm
        uses: azure/setup-helm@v4

      - name: Install kubeconform
        run: go install github.com/yannh/kubeconform/cmd/kubeconform@latest

      - name: Validate HelmRelease schemas
        run: |
          find . -name "*.yaml" -exec grep -l "kind: HelmRelease" {} \; | while read file; do
            echo "Validating schema: $file"
            kubeconform -strict -summary \
              -schema-location default \
              -schema-location 'https://raw.githubusercontent.com/fluxcd/flux2/main/manifests/crds/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
              "$file"
          done

      - name: Validate Helm values
        run: |
          find . -name "*.yaml" -exec grep -l "kind: HelmRelease" {} \; | while read file; do
            echo "Validating values: $file"
            CHART=$(yq eval '.spec.chart.spec.chart' "$file")
            VERSION=$(yq eval '.spec.chart.spec.version' "$file")
            REPO_NAME=$(yq eval '.spec.chart.spec.sourceRef.name' "$file")

            # Extract and render values
            yq eval '.spec.values // {}' "$file" > /tmp/values.yaml

            # Attempt template rendering
            helm template test "$CHART" \
              --version "$VERSION" \
              --values /tmp/values.yaml \
              --validate 2>&1 || echo "WARNING: Template validation failed for $file"
          done
```

## Step 7: Local Validation Script

```bash
#!/bin/bash
# validate-all-helmreleases.sh
# Comprehensive local validation for all HelmRelease files

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

echo "=== Flux CD HelmRelease Validation ==="
echo ""

# Find all HelmRelease files
HR_FILES=$(find "$REPO_ROOT" -name "*.yaml" -exec grep -l "kind: HelmRelease" {} \;)

for file in $HR_FILES; do
  echo "Validating: $file"

  # 1. YAML syntax check
  if ! yq eval '.' "$file" > /dev/null 2>&1; then
    echo "  FAIL: Invalid YAML syntax"
    ERRORS=$((ERRORS + 1))
    continue
  fi
  echo "  PASS: YAML syntax"

  # 2. Schema validation
  if kubeconform -strict "$file" > /dev/null 2>&1; then
    echo "  PASS: Schema validation"
  else
    echo "  WARN: Schema validation (CRD schema may not be available)"
  fi

  # 3. Required fields check
  CHART=$(yq eval '.spec.chart.spec.chart' "$file")
  VERSION=$(yq eval '.spec.chart.spec.version' "$file")
  SOURCE_REF=$(yq eval '.spec.chart.spec.sourceRef.name' "$file")

  if [ "$CHART" = "null" ] || [ "$VERSION" = "null" ] || [ "$SOURCE_REF" = "null" ]; then
    echo "  FAIL: Missing required chart spec fields"
    ERRORS=$((ERRORS + 1))
  else
    echo "  PASS: Required fields (chart=$CHART, version=$VERSION)"
  fi

  # 4. Interval format check
  INTERVAL=$(yq eval '.spec.interval' "$file")
  if [[ "$INTERVAL" =~ ^[0-9]+[smh]$ ]]; then
    echo "  PASS: Interval format ($INTERVAL)"
  else
    echo "  WARN: Unusual interval format: $INTERVAL"
  fi

  echo ""
done

if [ $ERRORS -gt 0 ]; then
  echo "FAILED: $ERRORS errors found"
  exit 1
else
  echo "PASSED: All HelmRelease files are valid"
fi
```

## Best Practices Summary

1. **Always validate YAML syntax** - Catch typos before they reach the cluster
2. **Render templates locally** - Use `helm template` with your values to verify output
3. **Test multiple value combinations** - Validate minimal, default, and production values
4. **Check valuesFrom references** - Ensure ConfigMaps and Secrets exist
5. **Use kubeconform with Flux schemas** - Validate Flux-specific CRD fields
6. **Automate in CI** - Run validation on every pull request
7. **Version-pin charts** - Use explicit version constraints to avoid surprises
8. **Test remediation settings** - Verify install/upgrade/rollback configuration is valid

## Conclusion

Validating Flux CD HelmRelease configurations locally prevents deployment failures and reduces debugging time. By combining YAML linting, schema validation, Helm template rendering, and automated CI checks, you can catch configuration errors before they impact your clusters. Make local validation a standard part of your development workflow to maintain reliable GitOps deployments.
