# How to Test ArgoCD Application Manifests Locally

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Testing, DevOps

Description: Learn how to test and validate ArgoCD application manifests locally before pushing to Git using template rendering, schema validation, and local ArgoCD tools.

---

Pushing untested manifests to your GitOps repository and letting ArgoCD discover the errors is a terrible feedback loop. You commit, wait for ArgoCD to sync, see the error in the UI, fix it, commit again, and wait again. Each cycle takes minutes.

Testing manifests locally before pushing catches errors in seconds. This guide covers every method for validating ArgoCD application manifests on your local machine.

## Testing Plain YAML Manifests

If your ArgoCD applications use plain Kubernetes YAML files, the simplest validation is running them through kubectl's dry-run:

```bash
# Client-side dry-run - validates YAML syntax and basic structure
kubectl apply --dry-run=client -f deployment.yaml

# Server-side dry-run - validates against the actual cluster API
kubectl apply --dry-run=server -f deployment.yaml
```

Client-side dry-run catches syntax errors and basic structural issues without needing cluster access. Server-side dry-run validates against the cluster's API server, catching issues like invalid field names and wrong API versions.

For validating an entire directory of manifests:

```bash
# Validate all YAML files in a directory
for file in apps/my-app/production/*.yaml; do
  echo "Validating $file..."
  kubectl apply --dry-run=client -f "$file"
done
```

## Testing Helm Chart Manifests

If your ArgoCD applications use Helm, render the templates locally to catch errors:

```bash
# Render Helm templates with the same values ArgoCD uses
helm template my-app ./charts/my-app \
  --values charts/my-app/values.yaml \
  --values charts/my-app/values-production.yaml \
  --namespace production

# Save rendered output for inspection
helm template my-app ./charts/my-app \
  --values charts/my-app/values-production.yaml \
  --namespace production > rendered-manifests.yaml

# Validate the rendered output
kubectl apply --dry-run=client -f rendered-manifests.yaml
```

Common Helm errors caught locally:

```bash
# Missing required values
helm template my-app ./charts/my-app --values values.yaml
# Error: template: my-app/templates/deployment.yaml:15:20:
# executing "my-app/templates/deployment.yaml" at <.Values.image.tag>:
# nil pointer evaluating interface {}.tag

# Invalid template syntax
# Error: parse error at (my-app/templates/deployment.yaml:10):
# function "includes" not defined
```

## Testing Kustomize Overlays

For Kustomize-based applications, build the overlay locally:

```bash
# Build the Kustomize overlay
kustomize build apps/my-app/overlays/production

# Validate the output
kustomize build apps/my-app/overlays/production | kubectl apply --dry-run=client -f -

# Check for common issues
kustomize build apps/my-app/overlays/production 2>&1
# Common errors:
# - Missing base resources
# - Invalid patch targets
# - Duplicate resource names
```

Test that overlays correctly modify the base:

```bash
# Compare base vs overlay
diff <(kustomize build apps/my-app/base) \
     <(kustomize build apps/my-app/overlays/production)
```

## Using ArgoCD's Local Manifest Generation

ArgoCD provides a way to render manifests exactly as the repo server would, using the `argocd app manifests` command:

```bash
# Generate manifests as ArgoCD would render them
argocd app manifests my-app --source live  # What is in the cluster
argocd app manifests my-app --source git   # What ArgoCD would deploy
```

For local development, you can use the ArgoCD CLI to render manifests without connecting to a running ArgoCD instance:

```bash
# Render manifests locally (requires argocd CLI v2.6+)
argocd app manifests my-app --local ./apps/my-app/production
```

## Schema Validation with kubeconform

Syntax checking is not enough. You also need to validate that your manifests conform to the Kubernetes API schema:

```bash
# Install kubeconform
brew install kubeconform  # macOS
# or download from https://github.com/yannh/kubeconform

# Validate manifests against Kubernetes schema
kubeconform -summary -output json apps/my-app/production/

# Validate with specific Kubernetes version
kubeconform -kubernetes-version 1.28.0 apps/my-app/production/

# Validate rendered Helm output
helm template my-app ./charts/my-app \
  --values charts/my-app/values-production.yaml | \
  kubeconform -summary
```

Kubeconform catches errors like:

```
# Invalid resource kind
apps/my-app/production/bad-resource.yaml - Depoyment is not a valid Kind

# Wrong API version
apps/my-app/production/ingress.yaml - networking.k8s.io/v1beta1 is deprecated

# Invalid field
apps/my-app/production/deployment.yaml - spec.template.spec.container is not valid
# (should be "containers" not "container")
```

For validating custom resources (CRDs), provide the CRD schemas:

```bash
# Download CRD schemas
mkdir -p /tmp/crd-schemas

# Extract schemas from CRDs
kubectl get crd applications.argoproj.io -o json | \
  jq '.spec.versions[0].schema.openAPIV3Schema' > /tmp/crd-schemas/application-argoproj-io.json

# Validate with CRD schemas
kubeconform -schema-location default \
  -schema-location '/tmp/crd-schemas/{{ .ResourceKind }}-{{ .Group }}.json' \
  apps/my-app/production/
```

## Testing ArgoCD Application Resources

The ArgoCD Application resource itself can have errors. Validate it before applying:

```yaml
# application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/gitops-repo
    targetRevision: HEAD
    path: apps/my-app/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Common Application resource errors:

```bash
# Validate the Application resource
kubectl apply --dry-run=server -f application.yaml -n argocd

# Check that the source path exists
ls -la apps/my-app/production/
# If this directory is empty or missing, ArgoCD will show an error

# Verify the repository URL is accessible
git ls-remote https://github.com/org/gitops-repo
```

## Building a Local Test Script

Combine all validation steps into a single script:

```bash
#!/bin/bash
# test-manifests.sh - Run before pushing to Git

set -e

APP_PATH=${1:-.}
ERRORS=0

echo "=== Testing manifests in $APP_PATH ==="

# Step 1: YAML syntax check
echo "Step 1: YAML syntax validation..."
for file in $(find "$APP_PATH" -name "*.yaml" -o -name "*.yml"); do
  if ! python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
    echo "FAIL: $file has invalid YAML syntax"
    ERRORS=$((ERRORS + 1))
  fi
done

# Step 2: Kustomize build (if kustomization.yaml exists)
if [ -f "$APP_PATH/kustomization.yaml" ]; then
  echo "Step 2: Kustomize build..."
  if ! kustomize build "$APP_PATH" > /dev/null 2>&1; then
    echo "FAIL: Kustomize build failed"
    kustomize build "$APP_PATH" 2>&1
    ERRORS=$((ERRORS + 1))
  fi
fi

# Step 3: Schema validation
echo "Step 3: Schema validation..."
if command -v kubeconform &> /dev/null; then
  if [ -f "$APP_PATH/kustomization.yaml" ]; then
    kustomize build "$APP_PATH" | kubeconform -summary -strict
  else
    kubeconform -summary -strict "$APP_PATH/"
  fi
else
  echo "SKIP: kubeconform not installed"
fi

# Step 4: kubectl dry-run (requires cluster access)
echo "Step 4: kubectl dry-run..."
if kubectl cluster-info &> /dev/null 2>&1; then
  if [ -f "$APP_PATH/kustomization.yaml" ]; then
    kustomize build "$APP_PATH" | kubectl apply --dry-run=server -f - 2>&1
  else
    kubectl apply --dry-run=server -f "$APP_PATH/" 2>&1
  fi
else
  echo "SKIP: No cluster access for server-side validation"
fi

if [ $ERRORS -gt 0 ]; then
  echo "FAILED: $ERRORS error(s) found"
  exit 1
fi

echo "All tests passed!"
```

Usage:

```bash
chmod +x test-manifests.sh
./test-manifests.sh apps/my-app/production
```

## Testing in CI Before ArgoCD Sees It

For automated testing, add these checks to your CI pipeline. This catches errors before they reach the GitOps repository:

```yaml
# GitHub Actions workflow
name: Validate Manifests
on:
  pull_request:
    paths:
    - 'apps/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Install tools
      run: |
        curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
          tar xz -C /usr/local/bin

    - name: Validate changed manifests
      run: |
        # Find changed directories
        CHANGED_DIRS=$(git diff --name-only origin/main | grep "^apps/" | cut -d/ -f1-3 | sort -u)
        for dir in $CHANGED_DIRS; do
          echo "Validating $dir..."
          ./test-manifests.sh "$dir"
        done
```

For monitoring the health of applications deployed by ArgoCD after your manifests pass local testing, integrate with [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-alerts-degraded-applications/view) to catch runtime issues that static testing cannot detect.

## Summary

Testing ArgoCD manifests locally eliminates the slow push-wait-check feedback loop. Start with YAML syntax validation, then validate against Kubernetes schemas with kubeconform, render Helm templates and Kustomize overlays locally, and use kubectl dry-run for API-level validation. Combine these into a reusable script and integrate it into your CI pipeline. The goal is to catch every possible error before it reaches ArgoCD, making the Git-to-cluster path clean and predictable.
