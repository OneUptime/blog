# How to Validate Flux Manifests with kubeval

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Kubeval, Validation, CI/CD

Description: Learn how to use kubeval to validate Flux Kubernetes manifests against API schemas and catch configuration errors before deployment.

---

## Introduction

kubeval is a tool for validating Kubernetes configuration files against the Kubernetes OpenAPI schemas. While it predates kubeconform, it remains widely used and is straightforward to integrate into existing workflows. This guide covers how to use kubeval to validate Flux manifests, handle CRDs, and integrate validation into your CI pipeline.

## Prerequisites

- kubeval installed
- A Flux GitOps repository with manifests
- Basic understanding of Kubernetes resource schemas

## Step 1: Install kubeval

```bash
# macOS (Homebrew)
brew install kubeval

# Linux (binary download)
curl -L -o kubeval.tar.gz \
  https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
tar xzf kubeval.tar.gz
sudo mv kubeval /usr/local/bin/

# Verify installation
kubeval --version
```

## Step 2: Basic Validation

Validate standard Kubernetes manifests.

```bash
# Validate a single file
kubeval deployment.yaml

# Validate multiple files
kubeval deployment.yaml service.yaml configmap.yaml

# Validate a directory (using find)
find manifests/ -name '*.yaml' -exec kubeval {} \;

# Validate with a specific Kubernetes version
kubeval --kubernetes-version 1.30.0 deployment.yaml
```

## Step 3: Validate Kustomize Build Output

Pipe kustomize build output through kubeval.

```bash
# Validate kustomize output
kustomize build overlays/production | kubeval

# With specific Kubernetes version
kustomize build overlays/production | kubeval --kubernetes-version 1.30.0

# With strict mode
kustomize build overlays/production | kubeval --strict
```

## Step 4: Handle Flux CRDs

kubeval does not natively know about Flux CRDs. You need to skip them or provide custom schemas.

```bash
# Skip Flux CRD validation (validate only standard resources)
kubeval \
  --skip-kinds Kustomization,GitRepository,HelmRepository,HelmRelease,OCIRepository,Bucket,HelmChart \
  manifests/*.yaml

# Alternatively, ignore missing schemas
kubeval --ignore-missing-schemas manifests/*.yaml
```

## Step 5: Use Custom Schema Locations

Point kubeval to a schema repository that includes Flux CRDs.

```bash
# Use an alternative schema location
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --additional-schema-locations https://raw.githubusercontent.com/datreeio/CRDs-catalog/main \
  manifests/*.yaml
```

## Step 6: Validate Standard Resources in Flux Directories

Focus validation on the standard Kubernetes resources that Flux deploys.

```bash
#!/bin/bash
# validate-with-kubeval.sh
set -euo pipefail

FLUX_CRDS="Kustomization,GitRepository,HelmRepository,HelmRelease,HelmChart,OCIRepository,Bucket,ImageRepository,ImagePolicy,ImageUpdateAutomation,Receiver,Provider,Alert"
K8S_VERSION="${K8S_VERSION:-1.30.0}"
ERRORS=0

validate_path() {
  local path=$1
  echo "Validating: $path"

  if kubeval \
    --kubernetes-version "$K8S_VERSION" \
    --skip-kinds "$FLUX_CRDS" \
    --strict \
    "$path" 2>&1; then
    echo "  PASS"
  else
    echo "  FAIL"
    ERRORS=$((ERRORS + 1))
  fi
}

# Find and validate all YAML files
for file in $(find . -name '*.yaml' -o -name '*.yml' | grep -v '.git/' | sort); do
  validate_path "$file"
done

echo ""
echo "=== Results ==="
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS file(s) had validation errors"
  exit 1
fi
echo "All files validated successfully"
```

## Step 7: Validate Kustomize Overlays

```bash
#!/bin/bash
# validate-overlays-kubeval.sh
set -euo pipefail

FLUX_CRDS="Kustomization,GitRepository,HelmRepository,HelmRelease,HelmChart,OCIRepository"
K8S_VERSION="1.30.0"

for overlay in overlays/*/; do
  echo "=== Validating overlay: $overlay ==="

  output=$(kustomize build "$overlay" 2>&1) || {
    echo "  FAIL: kustomize build failed"
    echo "$output" | head -5
    continue
  }

  echo "$output" | kubeval \
    --kubernetes-version "$K8S_VERSION" \
    --skip-kinds "$FLUX_CRDS" \
    --strict

  echo ""
done
```

## Step 8: Output Formats

kubeval supports multiple output formats.

```bash
# Default text output
kubeval manifests/*.yaml

# JSON output
kubeval -o json manifests/*.yaml

# TAP output
kubeval -o tap manifests/*.yaml
```

## Comparing kubeval and kubeconform

kubeval works well for standard Kubernetes resources but has limitations with CRDs.

```bash
# kubeval: must skip Flux CRDs
kubeval --skip-kinds Kustomization,HelmRelease manifests/

# kubeconform: can validate Flux CRDs with custom schemas
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  manifests/
```

For new projects, kubeconform is generally recommended due to its better CRD support. However, kubeval remains a valid choice for teams that have existing kubeval workflows.

## CI Integration

```yaml
# .github/workflows/kubeval.yaml
name: Validate with kubeval
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

      - name: Install kubeval
        run: |
          curl -L -o kubeval.tar.gz \
            https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
          tar xzf kubeval.tar.gz
          sudo mv kubeval /usr/local/bin/

      - name: Install kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Validate manifests
        run: |
          FLUX_CRDS="Kustomization,GitRepository,HelmRepository,HelmRelease,HelmChart,OCIRepository"

          # Validate raw files
          find . -name '*.yaml' -not -path './.git/*' | \
            xargs kubeval --skip-kinds "$FLUX_CRDS" --strict

          # Validate kustomize output
          for overlay in overlays/*/; do
            echo "Validating $overlay..."
            kustomize build "$overlay" | \
              kubeval --skip-kinds "$FLUX_CRDS" --strict
          done
```

## Strict Mode

Use strict mode to catch additional issues.

```bash
# Strict mode rejects properties not in the schema
kubeval --strict deployment.yaml

# This catches common mistakes like:
# - Typos in field names (e.g., "replcia" instead of "replica")
# - Fields from newer API versions used with older schemas
# - Custom annotations in wrong locations
```

## Best Practices

- Always specify the Kubernetes version matching your target cluster
- Use `--skip-kinds` to explicitly list Flux CRDs rather than `--ignore-missing-schemas`
- Enable strict mode to catch field name typos
- Validate both raw YAML files and kustomize build output
- Consider migrating to kubeconform for better CRD validation support
- Cache schema downloads in CI to speed up validation runs

## Conclusion

kubeval is a straightforward tool for validating Kubernetes manifests against API schemas. While it requires skipping Flux CRDs due to limited custom schema support, it remains effective for catching errors in standard Kubernetes resources deployed through Flux. For teams already using kubeval, it provides solid validation coverage when combined with Flux CRD skipping and strict mode.
