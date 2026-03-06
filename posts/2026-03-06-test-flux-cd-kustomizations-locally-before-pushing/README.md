# How to Test Flux CD Kustomizations Locally Before Pushing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kustomize, Local Testing, Validation, CI/CD, DevOps

Description: A step-by-step guide to testing and validating Flux CD Kustomization manifests locally before pushing to Git, catching errors early and preventing broken deployments.

---

## Introduction

Pushing untested Kustomization manifests to Git can cause Flux CD reconciliation failures, broken deployments, and downtime. Testing locally before pushing catches syntax errors, invalid references, missing resources, and configuration problems early. This guide covers tools and techniques for validating Flux CD Kustomizations on your local machine.

## Prerequisites

Install the required tools:

```bash
# Install Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Install kustomize (standalone, not kubectl's built-in version)
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
sudo mv kustomize /usr/local/bin/

# Install kubeconform for Kubernetes schema validation
go install github.com/yannh/kubeconform/cmd/kubeconform@latest

# Install yq for YAML processing
brew install yq  # macOS
# or: snap install yq  # Linux
```

## Project Structure

A typical Flux CD repository structure:

```text
fleet-repo/
├── clusters/
│   ├── production/
│   │   ├── kustomization.yaml
│   │   └── patches/
│   │       └── production-values.yaml
│   └── staging/
│       ├── kustomization.yaml
│       └── patches/
│           └── staging-values.yaml
├── apps/
│   ├── base/
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── configmap.yaml
│   └── overlays/
│       ├── production/
│       │   └── kustomization.yaml
│       └── staging/
│           └── kustomization.yaml
└── infrastructure/
    ├── base/
    │   ├── kustomization.yaml
    │   └── namespace.yaml
    └── overlays/
        └── production/
            └── kustomization.yaml
```

## Step 1: Validate YAML Syntax

### Basic YAML Validation

```bash
# Validate all YAML files in the repository
find . -name "*.yaml" -o -name "*.yml" | while read file; do
  if ! yq eval '.' "$file" > /dev/null 2>&1; then
    echo "INVALID YAML: $file"
  fi
done
```

### Validate with Flux CLI

```bash
# Validate Flux custom resources
# This checks that Flux-specific fields are correct
flux check --pre

# Validate a specific Kustomization file
flux build kustomization my-app \
  --path ./apps/overlays/production \
  --dry-run
```

## Step 2: Build Kustomizations Locally

### Build with kustomize

```bash
# Build and output the rendered manifests
# This catches missing resources, invalid patches, and reference errors
kustomize build apps/overlays/production

# Build with output to a file for further validation
kustomize build apps/overlays/production > /tmp/rendered-production.yaml

# Build and check for common issues
kustomize build apps/overlays/production 2>&1 | head -20
```

### Build with Flux CLI

```bash
# The flux build command validates Flux-specific features
# like variable substitution and decryption
flux build kustomization my-app \
  --path ./apps/overlays/production \
  --dry-run 2>&1

# Build with variable substitution (postBuild)
flux build kustomization my-app \
  --path ./apps/overlays/production \
  --dry-run \
  --kustomization-file ./clusters/production/my-app-kustomization.yaml
```

## Step 3: Validate Against Kubernetes Schemas

### Using kubeconform

```bash
# Validate rendered manifests against Kubernetes schemas
kustomize build apps/overlays/production | kubeconform \
  -strict \
  -summary \
  -output json \
  -kubernetes-version 1.29.0

# Validate with Flux CD CRD schemas
kustomize build apps/overlays/production | kubeconform \
  -strict \
  -summary \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/fluxcd/flux2/main/manifests/crds/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -kubernetes-version 1.29.0
```

### Download Flux CRD Schemas for Offline Validation

```bash
# Download Flux CRD schemas for offline validation
mkdir -p /tmp/flux-schemas

# Extract CRDs from Flux installation manifests
flux install --export | yq eval-all 'select(.kind == "CustomResourceDefinition")' - > /tmp/flux-crds.yaml

# Use kubeconform with local schemas
kustomize build apps/overlays/production | kubeconform \
  -strict \
  -summary \
  -schema-location default \
  -schema-location '/tmp/flux-schemas/{{ .ResourceKind }}_{{ .ResourceAPIVersion }}.json'
```

## Step 4: Test Variable Substitution

### Define Test Variables

```yaml
# clusters/staging/my-app-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/overlays/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  # PostBuild variable substitution
  postBuild:
    substitute:
      ENVIRONMENT: staging
      REPLICAS: "2"
      IMAGE_TAG: latest
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
```

### Test Substitution Locally

```bash
# Build with variable substitution using flux CLI
flux build kustomization my-app \
  --path ./apps/overlays/staging \
  --kustomization-file ./clusters/staging/my-app-kustomization.yaml \
  --dry-run

# Manually test substitution with envsubst
export ENVIRONMENT=staging
export REPLICAS=2
export IMAGE_TAG=latest

kustomize build apps/overlays/staging | envsubst
```

### Validate Substitution Results

```yaml
# apps/base/deployment.yaml
# Variables use ${VAR} syntax for Flux postBuild substitution
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: ${REPLICAS:=1}
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
        environment: ${ENVIRONMENT}
    spec:
      containers:
        - name: my-app
          image: myorg/my-app:${IMAGE_TAG}
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Step 5: Validate Dependencies

### Check Kustomization Dependencies

```bash
# List all Kustomization dependencies
# Ensure referenced sources and dependencies exist
flux tree kustomization flux-system --compact 2>/dev/null || echo "Run this against a live cluster"

# Manually check that all sourceRef targets exist
grep -r "sourceRef:" clusters/ -A 3 | grep "name:" | sort -u
```

### Validate Resource References Script

```bash
#!/bin/bash
# validate-references.sh
# Check that all referenced resources exist in the repository

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "Checking Kustomization source references..."

# Find all Flux Kustomization files
find "$REPO_ROOT" -name "*.yaml" -exec grep -l "kind: Kustomization" {} \; | while read file; do
  # Extract path references
  paths=$(yq eval '.spec.path' "$file" 2>/dev/null)
  if [ "$paths" != "null" ] && [ -n "$paths" ]; then
    # Resolve relative path
    resolved="$REPO_ROOT/${paths#./}"
    if [ ! -d "$resolved" ]; then
      echo "ERROR: $file references path '$paths' which does not exist"
    else
      # Check that the target directory has a kustomization.yaml
      if [ ! -f "$resolved/kustomization.yaml" ]; then
        echo "WARNING: $resolved is missing kustomization.yaml"
      fi
    fi
  fi
done

echo "Reference validation complete."
```

## Step 6: Dry-Run Against a Cluster

### Server-Side Dry Run

```bash
# Build and dry-run against a real cluster
# This catches issues like missing CRDs, RBAC problems, etc.
kustomize build apps/overlays/staging | \
  kubectl apply --dry-run=server -f - 2>&1

# Dry-run with diff to see what would change
kustomize build apps/overlays/staging | \
  kubectl diff -f - 2>&1
```

### Use a Local Kind Cluster for Testing

```yaml
# kind-config.yaml
# Create a lightweight local cluster for testing
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30000
        hostPort: 30000
        protocol: TCP
```

```bash
# Create the local cluster
kind create cluster --config kind-config.yaml --name flux-test

# Install Flux CRDs (without full Flux installation)
flux install --components-extra="" --export | \
  yq eval-all 'select(.kind == "CustomResourceDefinition")' - | \
  kubectl apply -f -

# Now dry-run your Kustomizations against the local cluster
kustomize build apps/overlays/staging | \
  kubectl apply --dry-run=server -f -

# Clean up
kind delete cluster --name flux-test
```

## Step 7: Automate with Pre-Commit Hooks

### Git Pre-Commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit
# Validate all Kustomization builds before committing

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

echo "Running Flux Kustomization validation..."

# Find all directories containing kustomization.yaml
find "$REPO_ROOT" -name "kustomization.yaml" -not -path "*/\.*" | while read kfile; do
  dir=$(dirname "$kfile")
  echo "Building: $dir"
  if ! kustomize build "$dir" > /dev/null 2>&1; then
    echo "FAILED: kustomize build $dir"
    kustomize build "$dir" 2>&1 | tail -5
    exit 1
  fi
done

echo "All Kustomization builds passed."

# Validate YAML syntax
echo "Validating YAML syntax..."
git diff --cached --name-only --diff-filter=ACM | grep -E '\.(yaml|yml)$' | while read file; do
  if ! yq eval '.' "$file" > /dev/null 2>&1; then
    echo "INVALID YAML: $file"
    exit 1
  fi
done

echo "All validations passed."
```

### CI Pipeline Validation

```yaml
# .github/workflows/validate-flux.yaml
name: Validate Flux Kustomizations
on:
  pull_request:
    paths:
      - 'apps/**'
      - 'clusters/**'
      - 'infrastructure/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Setup kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Install kubeconform
        run: |
          go install github.com/yannh/kubeconform/cmd/kubeconform@latest

      - name: Validate kustomize builds
        run: |
          # Build each overlay and validate
          for dir in apps/overlays/*/; do
            echo "Validating: $dir"
            kustomize build "$dir" | kubeconform -strict -summary
          done

      - name: Validate Flux resources
        run: |
          # Check Flux-specific resources
          for dir in clusters/*/; do
            echo "Validating cluster: $dir"
            flux build kustomization flux-system \
              --path "$dir" \
              --dry-run 2>&1 || true
          done
```

## Best Practices Summary

1. **Always build locally first** - Run `kustomize build` before every commit
2. **Validate schemas** - Use kubeconform with Flux CRD schemas
3. **Test variable substitution** - Verify postBuild variables render correctly
4. **Use pre-commit hooks** - Automate validation in the Git workflow
5. **Set up CI validation** - Catch issues in pull requests before merging
6. **Test against a Kind cluster** - Server-side dry-run catches runtime issues
7. **Check all overlays** - Build every environment overlay, not just the one you changed
8. **Version your schemas** - Match kubeconform Kubernetes version to your target cluster

## Conclusion

Testing Flux CD Kustomizations locally before pushing to Git is a critical practice that prevents broken deployments and reduces troubleshooting time. By combining kustomize builds, schema validation with kubeconform, variable substitution testing, and CI pipeline checks, you can catch the vast majority of configuration errors before they reach your cluster. Invest time in setting up pre-commit hooks and CI workflows to make this validation automatic and consistent across your team.
