# How to Validate Dapr Component Specifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Validation, YAML, DevOps

Description: Learn how to validate Dapr component YAML specifications locally and in CI/CD to catch schema errors before they reach your Kubernetes cluster.

---

## Why Validate Dapr Components?

An invalid component YAML can cause silent failures - your service starts, but the state store or pub/sub broker never initializes. Catching errors early with schema validation saves hours of debugging.

## Using the Dapr CLI for Local Validation

The Dapr CLI can validate components against the sidecar's schema:

```bash
# Initialize Dapr locally first
dapr init

# Run your app with verbose logging to surface component errors
dapr run --app-id test-app \
         --resources-path ./components \
         --log-level debug \
         -- sleep 5
```

Check the output for lines like `[WARN] ... error loading component` or `[ERR] ...`.

## Schema-Based Validation with Kubeconform

JSON schemas for Dapr CRDs are available via the [datreeio/CRDs-catalog](https://github.com/datreeio/CRDs-catalog). Use `kubeconform` to validate before applying:

```bash
# Install kubeconform
brew install kubeconform

# Validate your components directory using schemas from the CRDs-catalog
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -summary \
  ./components/*.yaml
```

## Validating with kubectl dry-run

If you have cluster access, use a server-side dry run:

```bash
kubectl apply --dry-run=server -f ./components/statestore.yaml -n production
```

A valid component returns `configured (server dry run)`. An invalid one returns a descriptive error.

## Example: Catching a Missing Required Field

```yaml
# INVALID - missing required 'type' field
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mystore
spec:
  metadata:
    - name: redisHost
      value: "localhost:6379"
```

Running `kubectl apply --dry-run=server` on this file produces:

```text
Error from server: error validating data: ValidationError(Component.spec):
  missing required field "type"
```

The corrected version:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mystore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "localhost:6379"
    - name: redisPassword
      value: ""
```

## Integrating Validation into CI/CD

```yaml
# .github/workflows/validate-dapr.yml
name: Validate Dapr Components
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install kubeconform
        run: |
          curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
          sudo mv kubeconform /usr/local/bin/
      - name: Validate components
        run: |
          kubeconform \
            -schema-location default \
            -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
            -summary \
            ./components/*.yaml
```

## Summary

Validating Dapr component specifications with the CLI, kubeconform, or kubectl dry-run prevents misconfigured components from silently breaking your services. Adding these checks to your CI/CD pipeline ensures every change to component files is safe before reaching production.
