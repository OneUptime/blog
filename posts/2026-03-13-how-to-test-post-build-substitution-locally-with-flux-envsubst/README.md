# How to Test Post-Build Substitution Locally with flux envsubst

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Fluxcd, GitOps, Kubernetes, Envsubst, Testing, Post-Build, Substitution, Local-Development

Description: Learn how to use the flux envsubst command to locally test and validate post-build variable substitution before pushing changes to your Git repository.

---

## Introduction

When using Flux post-build substitution, it is easy to introduce errors like misspelled variable names, missing placeholders, or incorrect syntax. Discovering these issues only after pushing to Git and waiting for Flux to reconcile is slow and frustrating. The Flux CLI includes an `envsubst` command that lets you test variable substitution locally on your machine before committing changes. This gives you fast feedback and helps catch substitution errors early in your workflow.

## Prerequisites

- Flux CLI installed locally (v2.0 or later)
- A local clone of your GitOps repository
- Basic familiarity with Flux Kustomization post-build substitution
- kustomize CLI installed (optional, for building manifests first)

## Installing the Flux CLI

If you do not already have the Flux CLI installed:

```bash
# macOS
brew install fluxcd/tap/flux

# Linux
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify installation
flux --version
```

## Basic Usage of flux envsubst

The `flux envsubst` command reads from stdin, performs variable substitution using environment variables, and writes the result to stdout. It uses the same substitution engine that Flux uses on the cluster.

Set environment variables and pipe a manifest through the command:

```bash
export CLUSTER_NAME=production
export REPLICAS=3
export INGRESS_HOST=app.prod.example.com

cat deployment.yaml | flux envsubst
```

Given a `deployment.yaml` file:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    cluster: ${CLUSTER_NAME}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

The output will show the manifest with all variables replaced:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    cluster: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

## Combining with Kustomize Build

In a real Flux setup, Kustomize builds the manifests first, then substitution happens. To replicate this locally, pipe the kustomize output through flux envsubst:

```bash
export CLUSTER_NAME=staging
export REPLICAS=1
export INGRESS_HOST=app.staging.example.com

kustomize build ./apps/my-app | flux envsubst
```

This gives you the exact output that Flux would produce on the cluster.

## Using a Variables File

Instead of exporting environment variables one by one, you can load them from a file. Create a `.env` file that mirrors your ConfigMap data:

```bash
# cluster-vars.env
CLUSTER_NAME=production
REPLICAS=3
INGRESS_HOST=app.prod.example.com
LOG_LEVEL=warn
DATABASE_HOST=db.prod.internal
```

Load and substitute in one command:

```bash
export $(cat cluster-vars.env | xargs) && kustomize build ./apps/my-app | flux envsubst
```

You can maintain separate env files for each cluster or environment:

```text
├── envs/
│   ├── production.env
│   ├── staging.env
│   └── development.env
└── apps/
    └── my-app/
```

## Using the strict Flag

By default, `flux envsubst` leaves undefined variables as-is. To catch missing variables, use the `--strict` flag, which causes the command to fail if any variable is not defined:

```bash
export CLUSTER_NAME=production
# REPLICAS is not set

kustomize build ./apps/my-app | flux envsubst --strict
```

This will produce an error indicating that `REPLICAS` is not defined, helping you catch missing variables before deploying.

## Writing a Local Test Script

Create a reusable test script for your repository:

```bash
#!/bin/bash
# test-substitution.sh

set -euo pipefail

ENV_FILE="${1:?Usage: $0 <env-file> <kustomize-path>}"
KUSTOMIZE_PATH="${2:?Usage: $0 <env-file> <kustomize-path>}"

# Load variables
set -a
source "$ENV_FILE"
set +a

echo "Testing substitution for: $KUSTOMIZE_PATH"
echo "Using variables from: $ENV_FILE"
echo "---"

# Build and substitute
kustomize build "$KUSTOMIZE_PATH" | flux envsubst --strict

echo "---"
echo "Substitution successful!"
```

Run it:

```bash
chmod +x test-substitution.sh
./test-substitution.sh envs/production.env apps/my-app
```

## Testing Multiple Applications

Extend the script to test all applications against all environments:

```bash
#!/bin/bash
# test-all.sh

set -euo pipefail

APPS_DIR="./apps"
ENVS_DIR="./envs"

ERRORS=0

for env_file in "$ENVS_DIR"/*.env; do
  env_name=$(basename "$env_file" .env)

  for app_dir in "$APPS_DIR"/*/; do
    app_name=$(basename "$app_dir")

    echo -n "Testing $app_name with $env_name... "

    set -a
    source "$env_file"
    set +a

    if kustomize build "$app_dir" | flux envsubst --strict > /dev/null 2>&1; then
      echo "OK"
    else
      echo "FAILED"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

if [ $ERRORS -gt 0 ]; then
  echo "$ERRORS test(s) failed"
  exit 1
fi

echo "All tests passed!"
```

## Integrating with CI/CD

Add substitution testing to your CI pipeline. Here is a GitHub Actions example:

```yaml
name: Test Flux Substitution
on:
  pull_request:
    paths:
      - 'apps/**'
      - 'envs/**'

jobs:
  test-substitution:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Setup Kustomize
        uses: imranismail/setup-kustomize@v2

      - name: Test substitution for all environments
        run: |
          for env_file in envs/*.env; do
            env_name=$(basename "$env_file" .env)
            echo "Testing environment: $env_name"
            set -a && source "$env_file" && set +a
            for app_dir in apps/*/; do
              app_name=$(basename "$app_dir")
              echo "  Testing app: $app_name"
              kustomize build "$app_dir" | flux envsubst --strict
            done
          done
```

## Comparing Outputs Across Environments

Use `flux envsubst` to generate and compare rendered manifests for different environments:

```bash
# Generate production output
set -a && source envs/production.env && set +a
kustomize build apps/my-app | flux envsubst > /tmp/prod.yaml

# Generate staging output
set -a && source envs/staging.env && set +a
kustomize build apps/my-app | flux envsubst > /tmp/staging.yaml

# Compare
diff /tmp/prod.yaml /tmp/staging.yaml
```

This helps you verify that the only differences between environments are the expected variable values.

## Conclusion

The `flux envsubst` command is an essential tool for validating post-build substitution locally before pushing changes. By combining it with kustomize build, environment variable files, and the `--strict` flag, you can catch substitution errors early and build confidence that your manifests will render correctly on the cluster. Integrating these checks into your CI pipeline ensures that substitution issues never reach your clusters.
