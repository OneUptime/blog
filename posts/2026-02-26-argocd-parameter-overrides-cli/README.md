# How to Use Parameter Overrides from the ArgoCD CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, DevOps

Description: Learn how to use the ArgoCD CLI to override application parameters for Helm, Kustomize, and plain manifests, including practical CI/CD integration patterns.

---

The ArgoCD CLI is the fastest way to make runtime adjustments to your applications. Whether you need to update an image tag after a CI build, change a Helm value for debugging, or override a Kustomize parameter for testing, the CLI gives you direct control without modifying your Git repository. This guide covers every parameter override command available in the ArgoCD CLI, with practical examples for each manifest type.

## Setting Up the CLI

Before using parameter overrides, authenticate with your ArgoCD server:

```bash
# Interactive login
argocd login argocd.example.com --grpc-web

# Token-based login for CI/CD
argocd login argocd.example.com \
  --auth-token $ARGOCD_AUTH_TOKEN \
  --grpc-web

# Using environment variables
export ARGOCD_SERVER=argocd.example.com
export ARGOCD_AUTH_TOKEN=your-token-here
export ARGOCD_OPTS="--grpc-web"
```

## Helm Parameter Overrides

For Helm-based applications, you can override individual values, set entire values files, or change the Helm release name:

```bash
# Override a single Helm value
argocd app set my-app --helm-set image.tag=v1.2.3

# Override a nested value
argocd app set my-app --helm-set config.database.maxConnections=20

# Override with a string value (force string type)
argocd app set my-app --helm-set-string image.tag=v1.2.3

# Override with a file value
argocd app set my-app --helm-set-file config.cert=path/to/cert.pem

# Override multiple values at once
argocd app set my-app \
  --helm-set image.tag=v1.2.3 \
  --helm-set replicaCount=3 \
  --helm-set resources.limits.cpu=500m \
  --helm-set resources.limits.memory=512Mi

# Add a values file reference
argocd app set my-app \
  --values environments/production-values.yaml

# Change the Helm release name
argocd app set my-app --release-name my-app-v2
```

### Helm Value Types

Helm values are type-sensitive. ArgoCD provides different flags for different types:

```bash
# Boolean value
argocd app set my-app --helm-set autoscaling.enabled=true

# Integer value
argocd app set my-app --helm-set replicaCount=3

# String value (use --helm-set-string to prevent YAML type coercion)
argocd app set my-app --helm-set-string image.tag=1.0
# Without --helm-set-string, "1.0" might be interpreted as a float

# JSON array or complex value
argocd app set my-app --helm-set-json 'ingress.hosts=[{"host":"example.com","paths":[{"path":"/"}]}]'
```

## Kustomize Parameter Overrides

For Kustomize-based applications:

```bash
# Override the container image
argocd app set my-app --kustomize-image myregistry/my-app:v1.2.3

# Override multiple images
argocd app set my-app \
  --kustomize-image myregistry/my-app:v1.2.3 \
  --kustomize-image myregistry/sidecar:v2.0.0

# Change the image to use a digest
argocd app set my-app \
  --kustomize-image myregistry/my-app@sha256:abc123...

# Override the namespace
argocd app set my-app --kustomize-namespace production

# Set a name prefix
argocd app set my-app --kustomize-name-prefix "v2-"

# Set a name suffix
argocd app set my-app --kustomize-name-suffix "-canary"

# Add common labels
argocd app set my-app --kustomize-common-label "version=v2"

# Add common annotations
argocd app set my-app --kustomize-common-annotation "deployed-by=ci-pipeline"
```

## Plain Manifest Parameter Overrides

For applications using plain YAML manifests (directory of YAML files), you can use the `--plugin-env` flag to pass values that ArgoCD processes through its config management plugin:

```bash
# Set parameters for config management plugins
argocd app set my-app --plugin-env ENV_NAME=value
```

## Viewing Current Parameters

Before modifying parameters, check what is currently set:

```bash
# Show all application details including parameters
argocd app get my-app

# Show parameters in a structured format
argocd app get my-app --show-params

# Output as YAML to see the full spec
argocd app get my-app -o yaml

# Output as JSON for programmatic parsing
argocd app get my-app -o json | jq '.spec.source'
```

Example output from `--show-params`:

```
NAME                       VALUE
helm-set:image.tag         v1.2.3
helm-set:replicaCount      3
helm-set:config.logLevel   debug
```

## Removing Parameter Overrides

To revert to the values defined in Git, unset the overrides:

```bash
# Unset a specific Helm value
argocd app unset my-app --helm-set image.tag

# Unset multiple Helm values
argocd app unset my-app \
  --helm-set image.tag \
  --helm-set replicaCount

# Unset a values file
argocd app unset my-app --values environments/override-values.yaml

# Unset Kustomize image override
argocd app unset my-app --kustomize-image myregistry/my-app

# Unset Kustomize namespace
argocd app unset my-app --kustomize-namespace

# Unset name prefix/suffix
argocd app unset my-app --kustomize-name-prefix
argocd app unset my-app --kustomize-name-suffix
```

## Applying Overrides and Syncing

After setting overrides, the application shows as OutOfSync. You can sync immediately:

```bash
# Set parameter and sync in sequence
argocd app set my-app --helm-set image.tag=v1.2.3
argocd app sync my-app

# Sync with a dry-run first
argocd app set my-app --helm-set image.tag=v1.2.3
argocd app sync my-app --dry-run
# Review the diff, then sync for real
argocd app sync my-app

# Sync and wait for the application to become healthy
argocd app sync my-app --timeout 300
argocd app wait my-app --health --timeout 300
```

## CI/CD Pipeline Integration

The most common use case for CLI parameter overrides is CI/CD pipeline integration. Here is a complete GitHub Actions example:

```yaml
# .github/workflows/deploy.yaml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Build and push Docker image
        id: build
        run: |
          IMAGE_TAG="${{ github.sha }}"
          docker build -t myregistry/my-app:$IMAGE_TAG .
          docker push myregistry/my-app:$IMAGE_TAG
          echo "tag=$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o /usr/local/bin/argocd \
            https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x /usr/local/bin/argocd

      - name: Deploy to staging
        env:
          ARGOCD_SERVER: ${{ secrets.ARGOCD_SERVER }}
          ARGOCD_AUTH_TOKEN: ${{ secrets.ARGOCD_AUTH_TOKEN }}
        run: |
          # Set the new image tag
          argocd app set my-app-staging \
            --grpc-web \
            --helm-set image.tag=${{ steps.build.outputs.tag }}

          # Trigger sync and wait
          argocd app sync my-app-staging --grpc-web --async

          # Wait for sync and health
          argocd app wait my-app-staging \
            --grpc-web \
            --sync \
            --health \
            --timeout 300
```

## Scripting Bulk Overrides

When you need to update parameters across multiple applications:

```bash
#!/bin/bash
# update-all-images.sh - Update image tag across all environments
NEW_TAG=$1
APPS=("my-app-dev" "my-app-staging")

for app in "${APPS[@]}"; do
  echo "Updating $app to $NEW_TAG..."
  argocd app set "$app" --helm-set image.tag="$NEW_TAG"
  argocd app sync "$app" --async
done

# Wait for all to be healthy
for app in "${APPS[@]}"; do
  echo "Waiting for $app..."
  argocd app wait "$app" --health --timeout 300
done

echo "All applications updated to $NEW_TAG"
```

## Comparing Overrides vs Git State

Check if your application has drifted from Git due to overrides:

```bash
# Show the diff between desired state (with overrides) and live state
argocd app diff my-app

# Show the diff between Git state and live state (ignoring overrides)
argocd app diff my-app --local /path/to/local/manifests
```

## Emergency Override Pattern

For emergency scenarios where you need to quickly roll back or change configuration:

```bash
# Quick rollback by setting previous image tag
argocd app set my-app-production \
  --helm-set image.tag=v1.1.9    # Previous known-good version

# Force sync even if there are pending changes
argocd app sync my-app-production --force

# Scale down immediately
argocd app set my-app-production --helm-set replicaCount=0
argocd app sync my-app-production

# After the emergency, commit the change to Git
# and remove the override to return to GitOps flow
argocd app unset my-app-production --helm-set image.tag
```

## Best Practices

Always document overrides. When you set a parameter override, leave a note in your team's communication channel explaining what you changed and why. Overrides are not visible in your Git history, so they can be forgotten.

Treat overrides as temporary. They are a useful escape hatch, but long-lived overrides create a divergence between your Git repository and your running state. If an override has been in place for more than a day, commit it to Git instead.

Use `--show-params` regularly. Make it a habit to check for existing overrides before modifying an application. Forgotten overrides are a common source of confusion when debugging deployment issues.

The ArgoCD CLI is a powerful tool for managing parameter overrides. Used thoughtfully, it bridges the gap between strict GitOps and the practical need for quick, iterative changes in your deployment pipeline.
