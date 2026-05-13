# How to Validate Flux Manifests with kubeconform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Kubeconform, Validation, CI/CD

Description: Learn how to use kubeconform to validate Flux manifests against Kubernetes and Flux CRD schemas for early error detection.

---

## Introduction

kubeconform is a fast Kubernetes manifest validator that checks YAML files against JSON schemas. It supports custom schemas, making it ideal for validating Flux custom resources like Kustomizations, HelmReleases, and GitRepositories. By running kubeconform in your CI pipeline, you catch schema violations before they reach your cluster.

## Prerequisites

- kubeconform installed
- A Flux GitOps repository with manifests
- Access to Flux CRD schemas

## Step 1: Install kubeconform

```bash
# macOS (Homebrew)

brew install kubeconform

# Linux (binary download)
curl -L -o kubeconform.tar.gz \
  https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
tar xzf kubeconform.tar.gz
sudo mv kubeconform /usr/local/bin/

# Verify installation
kubeconform -v
```

## Step 2: Validate Standard Kubernetes Manifests

Start by validating your standard Kubernetes resources.

```bash
# Validate a single file
kubeconform deployment.yaml

# Validate a directory
kubeconform -summary manifests/

# Validate with a specific Kubernetes version
kubeconform -kubernetes-version 1.30.0 manifests/

# Validate kustomize build output
kustomize build overlays/production | kubeconform -summary
```

## Step 3: Add Flux CRD Schemas

kubeconform needs custom schemas to validate Flux CRDs. The Flux project publishes CRD manifests with OpenAPI v3 validation schemas, and those schemas can be converted or read from a cluster.

```bash
# Generate Flux CRD schemas from your cluster's CRDs
mkdir -p /tmp/flux-schemas

# Flux CRD manifests are referenced from:
# https://github.com/fluxcd/flux2/blob/main/manifests/crds/kustomization.yaml

kubectl get crds -o json | \
  jq -c '.items[]
    | select(.spec.group | endswith("fluxcd.io"))
    | . as $crd
    | $crd.spec.versions[]
    | select(.schema.openAPIV3Schema != null)
    | {
        kind: $crd.spec.names.kind,
        version: .name,
        schema: .schema.openAPIV3Schema
      }' | \
  while read -r item; do
    kind=$(jq -r '.kind' <<<"$item" | tr '[:upper:]' '[:lower:]')
    version=$(jq -r '.version' <<<"$item")
    jq '.schema' <<<"$item" > "/tmp/flux-schemas/${kind}_${version}.json"
  done

# Validate with locally generated schemas
kubeconform \
  -schema-location default \
  -schema-location '/tmp/flux-schemas/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -summary \
  manifests/
```

## Step 4: Use the Flux Schema Repository

The CRDs-catalog project includes Flux schemas compatible with kubeconform.

```bash
# Validate with Flux CRD schemas from the community repository
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -summary \
  manifests/
```

## Step 5: Validate All Flux Resource Types

Test validation across different Flux resource types.

```bash
# Validate GitRepository resources
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  sources/

# Validate Kustomization resources
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  kustomizations/

# Validate HelmRelease resources
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  helmreleases/
```

## Step 6: Handle Multiple Documents and Kustomize Output

```bash
# Validate multi-document YAML files
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -summary \
  clusters/production/*.yaml

# Validate kustomize build output with Flux schemas
kustomize build overlays/production | \
  kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -summary
```

## Step 7: Skip Unknown Resources

Some CRDs might not have schemas available. Configure kubeconform to handle them gracefully.

```bash
# Skip validation for resources without schemas
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -skip "CustomResourceDefinition" \
  -ignore-missing-schemas \
  -summary \
  manifests/

# Alternatively, be strict and fail on missing schemas
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -strict \
  -summary \
  manifests/
```

## Step 8: Output Formats

kubeconform supports multiple output formats for CI integration.

```bash
# Text output (default)
kubeconform -summary manifests/

# JSON output
kubeconform -output json manifests/

# TAP (Test Anything Protocol) output
kubeconform -output tap manifests/

# JUnit XML output (for CI systems)
kubeconform -output junit manifests/ > test-results.xml
```

## Comprehensive Validation Script

```bash
#!/bin/bash
# validate-flux-manifests.sh
set -euo pipefail

SCHEMA_LOCATION="https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json"
K8S_VERSION="${K8S_VERSION:-1.30.0}"
ERRORS=0

validate_dir() {
  local dir=$1
  local description=$2
  echo "=== Validating: $description ($dir) ==="

  if [ ! -d "$dir" ]; then
    echo "  SKIP: Directory does not exist"
    return
  fi

  if kubeconform \
    -schema-location default \
    -schema-location "$SCHEMA_LOCATION" \
    -kubernetes-version "$K8S_VERSION" \
    -ignore-missing-schemas \
    -summary \
    "$dir"; then
    echo "  PASS"
  else
    echo "  FAIL"
    ERRORS=$((ERRORS + 1))
  fi
  echo ""
}

validate_dir "clusters/" "Cluster configurations"
validate_dir "infrastructure/" "Infrastructure manifests"
validate_dir "apps/" "Application manifests"
validate_dir "sources/" "Source definitions"

# Validate kustomize build output if overlays exist
if [ -d "overlays" ]; then
  for overlay in overlays/*; do
    [ -d "$overlay" ] || continue
    echo "=== Validating kustomize build: $overlay ==="
    if kustomize build "$overlay" 2>/dev/null | \
      kubeconform \
        -schema-location default \
        -schema-location "$SCHEMA_LOCATION" \
        -kubernetes-version "$K8S_VERSION" \
        -ignore-missing-schemas \
        -summary; then
      echo "  PASS"
    else
      echo "  FAIL"
      ERRORS=$((ERRORS + 1))
    fi
    echo ""
  done
fi

echo "=== Summary ==="
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS validation(s) failed"
  exit 1
fi
echo "All validations passed"
```

## CI Integration

```yaml
# .github/workflows/validate-manifests.yaml
name: Validate Flux Manifests
on:
  pull_request:
    paths:
      - '**.yaml'
      - '**.yml'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install kubeconform
        run: |
          curl -L -o kubeconform.tar.gz \
            https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
          tar xzf kubeconform.tar.gz
          sudo mv kubeconform /usr/local/bin/

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Validate manifests
        run: bash validate-flux-manifests.sh
```

## Best Practices

- Always specify a Kubernetes version to match your target cluster
- Use the CRDs-catalog schema location for Flux CRD validation
- Run validation on both raw manifests and kustomize build output
- Use `-ignore-missing-schemas` initially, then gradually add schemas for all CRDs
- Generate JUnit output for CI systems that support test result visualization
- Cache downloaded schemas in CI to speed up validation

## Conclusion

kubeconform provides fast, reliable validation of Flux manifests against Kubernetes and Flux CRD schemas. Its support for custom schema locations makes it straightforward to validate Flux-specific resources like Kustomizations, HelmReleases, and GitRepositories. By integrating kubeconform into your CI pipeline, you catch schema violations early and reduce the risk of failed reconciliations in production.
