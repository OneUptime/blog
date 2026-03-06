# How to Use flux build for Offline Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, flux build, offline validation, Kustomize, GitOps, Kubernetes, CI/CD

Description: Learn how to use the flux build command to validate Kustomization resources offline without connecting to a live Kubernetes cluster.

---

The `flux build` command allows you to render and validate Flux CD Kustomization resources locally, without needing a running Kubernetes cluster. This is essential for catching configuration errors early in your development workflow before pushing changes to Git.

## Prerequisites

- Flux CLI installed (v2.0 or later)
- A Flux CD repository with Kustomization manifests
- Basic understanding of Kustomize overlays

## What Does flux build Do?

The `flux build` command processes a Kustomization resource, resolves all overlays and patches, applies variable substitutions, and outputs the final rendered manifests. It works entirely offline, making it perfect for local development and CI pipelines.

## Basic Usage

### Building a Simple Kustomization

Suppose you have the following directory structure:

```text
clusters/
  production/
    kustomization.yaml
infrastructure/
  base/
    kustomization.yaml
    namespace.yaml
    deployment.yaml
    service.yaml
  overlays/
    production/
      kustomization.yaml
      patch-replicas.yaml
```

Here is the base kustomization:

```yaml
# infrastructure/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
```

```yaml
# infrastructure/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: myapp
```

```yaml
# infrastructure/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
```

```yaml
# infrastructure/base/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
  namespace: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8080
```

### Production Overlay

```yaml
# infrastructure/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patchesStrategicMerge:
  - patch-replicas.yaml
```

```yaml
# infrastructure/overlays/production/patch-replicas.yaml
# Increase replicas for production
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  replicas: 3
```

### The Flux Kustomization Resource

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
  timeout: 5m
```

## Running flux build

```bash
# Build the Kustomization and output rendered manifests
flux build kustomization infrastructure \
  --path ./infrastructure/overlays/production \
  --kustomization-file ./clusters/production/infrastructure.yaml
```

This outputs the fully rendered YAML with all patches applied. You should see the deployment with 3 replicas instead of 1.

## Variable Substitution Validation

Flux CD supports post-build variable substitution. The `flux build` command can validate these as well.

### Kustomization with Variables

```yaml
# clusters/production/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Post-build variable substitution
  postBuild:
    substitute:
      CLUSTER_NAME: production
      DOMAIN: example.com
      ENVIRONMENT: prod
    substituteFrom:
      - kind: ConfigMap
        name: cluster-settings
```

### Application Manifest with Variables

```yaml
# apps/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: myapp
  annotations:
    # Variables will be substituted by Flux
    cert-manager.io/cluster-issuer: letsencrypt-${ENVIRONMENT}
spec:
  rules:
    - host: myapp.${DOMAIN}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: myapp
                port:
                  number: 80
  tls:
    - hosts:
        - myapp.${DOMAIN}
      secretName: myapp-tls-${ENVIRONMENT}
```

### Building with Variable Substitution

```bash
# Build with inline variable substitution
flux build kustomization apps \
  --path ./apps/production \
  --kustomization-file ./clusters/production/apps.yaml
```

The output will show `myapp.example.com` and `letsencrypt-prod` with all variables resolved.

## Detecting Errors with flux build

### Missing Resources

If a Kustomization references a file that does not exist:

```bash
# This will fail with a clear error message
flux build kustomization infrastructure \
  --path ./infrastructure/overlays/staging \
  --kustomization-file ./clusters/staging/infrastructure.yaml

# Output:
# Error: accumulating resources: accumulating resources from ...
# file not found
```

### Invalid YAML

```bash
# Invalid YAML syntax produces clear errors
flux build kustomization apps \
  --path ./apps/broken \
  --kustomization-file ./clusters/production/apps.yaml

# Output:
# Error: yaml: line 15: did not find expected key
```

### Unresolved Variables

```bash
# Missing variable substitutions are detected
flux build kustomization apps \
  --path ./apps/production \
  --kustomization-file ./clusters/production/apps.yaml

# If a variable like ${MISSING_VAR} is not defined,
# the output will contain the raw ${MISSING_VAR} string
```

## Integrating flux build into a Validation Script

```bash
#!/bin/bash
# scripts/validate-flux-build.sh
# Runs flux build on all Kustomization files to detect errors

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
ERRORS=0

echo "Running flux build validation..."

# Find all Flux Kustomization files
find "$REPO_ROOT/clusters" -name "*.yaml" -type f | while read -r ks_file; do
  # Extract the path field from the Kustomization
  KS_PATH=$(grep "path:" "$ks_file" | head -1 | awk '{print $2}' | tr -d '"')

  # Skip files that are not Kustomization resources
  if [ -z "$KS_PATH" ]; then
    continue
  fi

  # Extract the name for the build command
  KS_NAME=$(grep "name:" "$ks_file" | head -1 | awk '{print $2}')

  echo "Building: $KS_NAME (path: $KS_PATH)"

  # Resolve the path relative to the repo root
  FULL_PATH="$REPO_ROOT/$KS_PATH"

  # Run flux build and capture output
  if ! flux build kustomization "$KS_NAME" \
    --path "$FULL_PATH" \
    --kustomization-file "$ks_file" > /dev/null 2>&1; then
    echo "  FAILED: $KS_NAME"
    # Show the error details
    flux build kustomization "$KS_NAME" \
      --path "$FULL_PATH" \
      --kustomization-file "$ks_file" 2>&1 || true
    ERRORS=$((ERRORS + 1))
  else
    echo "  OK: $KS_NAME"
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo "Build validation failed with $ERRORS error(s)"
  exit 1
fi

echo "All Kustomizations built successfully"
```

## CI Pipeline Integration

```yaml
# .github/workflows/flux-build.yaml
name: Flux Build Validation
on:
  pull_request:
    paths:
      - "clusters/**"
      - "infrastructure/**"
      - "apps/**"

jobs:
  flux-build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Run flux build on all Kustomizations
        run: |
          # Build each Kustomization defined in the clusters directory
          for ks_file in clusters/**/*.yaml; do
            # Parse the path from the Kustomization spec
            path=$(yq '.spec.path' "$ks_file" 2>/dev/null)
            name=$(yq '.metadata.name' "$ks_file" 2>/dev/null)

            # Skip non-Kustomization files
            if [ "$path" = "null" ] || [ "$name" = "null" ]; then
              continue
            fi

            echo "Building $name from $ks_file..."
            flux build kustomization "$name" \
              --path ".${path}" \
              --kustomization-file "$ks_file"
          done

      - name: Validate rendered output with kubeconform
        run: |
          # Install kubeconform for schema validation
          curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
            tar xz -C /usr/local/bin

          # Build and pipe to kubeconform
          for ks_file in clusters/**/*.yaml; do
            path=$(yq '.spec.path' "$ks_file" 2>/dev/null)
            name=$(yq '.metadata.name' "$ks_file" 2>/dev/null)

            if [ "$path" = "null" ] || [ "$name" = "null" ]; then
              continue
            fi

            echo "Validating schemas for $name..."
            flux build kustomization "$name" \
              --path ".${path}" \
              --kustomization-file "$ks_file" | \
              kubeconform -strict -summary
          done
```

## Comparing Environments with flux build

Use `flux build` to compare rendered output across environments.

```bash
#!/bin/bash
# scripts/compare-environments.sh
# Compare rendered manifests between staging and production

# Build staging
flux build kustomization infrastructure \
  --path ./infrastructure/overlays/staging \
  --kustomization-file ./clusters/staging/infrastructure.yaml \
  > /tmp/staging-output.yaml

# Build production
flux build kustomization infrastructure \
  --path ./infrastructure/overlays/production \
  --kustomization-file ./clusters/production/infrastructure.yaml \
  > /tmp/production-output.yaml

# Show the differences
echo "Differences between staging and production:"
diff --color /tmp/staging-output.yaml /tmp/production-output.yaml || true
```

## Summary

The `flux build` command is a powerful tool for offline validation of Flux CD configurations. It renders Kustomization resources with all overlays, patches, and variable substitutions applied, allowing you to catch errors before they reach your cluster. Integrate it into your local development workflow and CI pipelines for rapid feedback on configuration changes.
