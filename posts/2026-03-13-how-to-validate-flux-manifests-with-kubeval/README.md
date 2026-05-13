# How to Validate Flux Manifests with kubeval

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Testing, Kubeval, Validation, CI/CD

Description: Learn how to use kubeval to validate Flux Kubernetes manifests against API schemas and catch configuration errors before deployment.

---

## Introduction

kubeval is a tool for validating Kubernetes configuration files against the Kubernetes OpenAPI schemas. While it predates kubeconform, it remains widely used in existing workflows, but the upstream project is no longer maintained. This guide covers how to use kubeval with a maintained schema location to validate Flux manifests, handle CRDs, and integrate validation into your CI pipeline.

## Prerequisites

- kubeval installed
- A Flux GitOps repository with manifests
- Basic understanding of Kubernetes resource schemas

## Step 1: Install kubeval

```bash
# macOS (Intel binary download)

curl -L -o kubeval.tar.gz \
  https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-darwin-amd64.tar.gz
tar xzf kubeval.tar.gz
sudo mv kubeval /usr/local/bin/

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
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  deployment.yaml

# Validate multiple files
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  deployment.yaml service.yaml configmap.yaml

# Validate a directory
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --directories manifests/

# Validate with a specific Kubernetes version
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --kubernetes-version 1.30.0 \
  deployment.yaml
```

## Step 3: Validate Kustomize Build Output

Pipe kustomize build output through kubeval.

```bash
# Validate kustomize output
kustomize build overlays/production | kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master

# With specific Kubernetes version
kustomize build overlays/production | kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --kubernetes-version 1.30.0

# With strict mode
kustomize build overlays/production | kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --strict
```

## Step 4: Handle Flux CRDs

kubeval does not natively know about Flux CRDs. You need to skip them or provide custom schemas.

```bash
# Skip Flux CRD validation (validate only standard resources)
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --skip-kinds Kustomization,GitRepository,HelmRepository,HelmRelease,OCIRepository,Bucket,HelmChart \
  manifests/*.yaml

# Alternatively, ignore missing schemas
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --ignore-missing-schemas \
  manifests/*.yaml
```

## Step 5: Use Custom Schema Locations

Point kubeval to a maintained Kubernetes schema repository. To validate Flux CRDs with kubeval, add a second schema location that uses kubeval's expected schema file layout.

```bash
# Use a maintained standard Kubernetes schema location
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  manifests/*.yaml

# Add local Flux CRD schemas converted to kubeval's file layout
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --additional-schema-locations "file://$PWD/schemas" \
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
SCHEMA_LOCATION="https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master"
ERRORS=0

validate_path() {
  local path=$1
  echo "Validating: $path"

  if kubeval \
    --schema-location "$SCHEMA_LOCATION" \
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
while IFS= read -r -d '' file; do
  validate_path "$file"
done < <(find . \( -name '*.yaml' -o -name '*.yml' \) -not -path './.git/*' -print0 | sort -z)

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
SCHEMA_LOCATION="https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master"

for overlay in overlays/*/; do
  echo "=== Validating overlay: $overlay ==="

  output=$(kustomize build "$overlay" 2>&1) || {
    echo "  FAIL: kustomize build failed"
    echo "$output" | head -5
    continue
  }

  echo "$output" | kubeval \
    --schema-location "$SCHEMA_LOCATION" \
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
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  manifests/*.yaml

# JSON output
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  -o json \
  manifests/*.yaml

# TAP output
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  -o tap \
  manifests/*.yaml
```

## Comparing kubeval and kubeconform

kubeval works well for standard Kubernetes resources but has limitations with CRDs.

```bash
# kubeval: must skip Flux CRDs
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --skip-kinds Kustomization,HelmRelease \
  --directories manifests/

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
          SCHEMA_LOCATION="https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master"

          # Validate raw files
          find . -name '*.yaml' -not -path './.git/*' -print0 | \
            xargs -0 -r kubeval --schema-location "$SCHEMA_LOCATION" --skip-kinds "$FLUX_CRDS" --strict

          # Validate kustomize output
          for overlay in overlays/*/; do
            echo "Validating $overlay..."
            kustomize build "$overlay" | \
              kubeval --schema-location "$SCHEMA_LOCATION" --skip-kinds "$FLUX_CRDS" --strict
          done
```

## Strict Mode

Use strict mode to catch additional issues.

```bash
# Strict mode rejects properties not in the schema
kubeval \
  --schema-location https://raw.githubusercontent.com/yannh/kubernetes-json-schema/master \
  --strict \
  deployment.yaml

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
- Set `--schema-location` explicitly so CI does not depend on kubeval's unmaintained default schema host

## Conclusion

kubeval is a straightforward tool for validating Kubernetes manifests against API schemas. While it requires skipping Flux CRDs or providing kubeval-formatted CRD schemas due to limited custom schema support, it remains effective for catching errors in standard Kubernetes resources deployed through Flux. For teams already using kubeval, it provides useful validation coverage when combined with an explicit schema location, Flux CRD skipping, and strict mode.
