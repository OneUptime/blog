# How to Test Flux Variable Substitution with flux envsubst

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Variable Substitution, Testing, envsubst

Description: Learn how to test and debug Flux postBuild variable substitutions locally using flux envsubst before deploying to your cluster.

---

Flux supports variable substitution through the `postBuild` feature in Kustomization resources. This allows you to inject environment-specific values into your manifests at reconciliation time. Testing these substitutions locally before pushing to your repository helps you catch missing variables, typos, and unexpected values early.

This guide explains how to use `flux envsubst` and related techniques to validate variable substitutions.

## How Flux Variable Substitution Works

Flux variable substitution occurs in the `postBuild` phase of a Kustomization. After Kustomize builds the final manifests, Flux replaces `${VARIABLE_NAME}` patterns with values from ConfigMaps, Secrets, or inline definitions.

Here is a Kustomization with variable substitution:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/base
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      CLUSTER_NAME: production
      DOMAIN: prod.example.com
      REPLICAS: "3"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-vars
      - kind: Secret
        name: cluster-secrets
```

## Using flux envsubst Locally

The `flux envsubst` command processes variable substitutions on stdin. You can pipe any YAML through it with environment variables set:

```bash
export CLUSTER_NAME=production
export DOMAIN=prod.example.com
export REPLICAS=3

cat apps/base/deployment.yaml | flux envsubst
```

Given a deployment template like:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    cluster: ${CLUSTER_NAME}
spec:
  replicas: ${REPLICAS}
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          env:
            - name: APP_DOMAIN
              value: ${DOMAIN}
```

The output will show all variables replaced with their values.

## Testing with a Variables File

Instead of exporting variables individually, create a variables file and source it:

```bash
# vars/production.env
CLUSTER_NAME=production
DOMAIN=prod.example.com
REPLICAS=3
LOG_LEVEL=info
DATABASE_HOST=db.prod.internal
```

Then use it:

```bash
set -a
source vars/production.env
set +a

kustomize build apps/production | flux envsubst
```

This approach lets you maintain separate variable files for each environment and test substitutions against any of them.

## Detecting Unsubstituted Variables

One common problem is forgetting to define a variable, leaving `${UNDEFINED_VAR}` in your rendered output. You can detect this with a simple grep:

```bash
set -a
source vars/production.env
set +a

OUTPUT=$(kustomize build apps/production | flux envsubst)
UNSUBSTITUTED=$(echo "$OUTPUT" | grep -oP '\$\{[A-Z_]+\}' | sort -u)

if [ -n "$UNSUBSTITUTED" ]; then
  echo "WARNING: Unsubstituted variables found:"
  echo "$UNSUBSTITUTED"
  exit 1
fi
```

## Using Default Values

Flux supports default values in variable substitutions using the `${VAR:-default}` syntax:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: ${REPLICAS:-1}
  template:
    spec:
      containers:
        - name: my-app
          env:
            - name: LOG_LEVEL
              value: ${LOG_LEVEL:-info}
```

Test that defaults work correctly by omitting some variables:

```bash
export REPLICAS=5
# LOG_LEVEL intentionally not set

cat apps/base/deployment.yaml | flux envsubst
```

The output should show `replicas: 5` and `LOG_LEVEL: info` using the default.

## Strict Mode Validation

Use the `--strict` flag to make `flux envsubst` fail on undefined variables that do not have default values:

```bash
kustomize build apps/production | flux envsubst --strict
```

If any variable is referenced but not defined and has no default, the command will exit with an error. This is particularly useful in CI pipelines where you want to enforce that all variables are properly defined.

## Combining with flux build

For a complete test that includes both Kustomize building and variable substitution, combine the two:

```bash
set -a
source vars/production.env
set +a

flux build kustomization apps \
  --path ./apps/production \
  --dry-run | flux envsubst --strict
```

## Testing Multiple Environments

Create a script that validates variable substitution across all environments:

```bash
#!/bin/bash
set -euo pipefail

ENVS=("staging" "production")
ERRORS=0

for env in "${ENVS[@]}"; do
  echo "Testing environment: $env"

  set -a
  source "vars/${env}.env"
  set +a

  OUTPUT=$(kustomize build "apps/${env}" | flux envsubst --strict 2>&1) || {
    echo "FAILED: Variable substitution error in $env"
    echo "$OUTPUT"
    ERRORS=$((ERRORS + 1))
    continue
  }

  UNSUBSTITUTED=$(echo "$OUTPUT" | grep -oP '\$\{[A-Z_]+\}' | sort -u || true)
  if [ -n "$UNSUBSTITUTED" ]; then
    echo "FAILED: Unsubstituted variables in $env: $UNSUBSTITUTED"
    ERRORS=$((ERRORS + 1))
  else
    echo "OK: $env"
  fi
done

if [ $ERRORS -gt 0 ]; then
  echo "$ERRORS environment(s) failed"
  exit 1
fi
```

## CI Pipeline Integration

Add variable substitution testing to your CI pipeline:

```yaml
# GitHub Actions example
- name: Test variable substitutions
  run: |
    for env in staging production; do
      set -a
      source "vars/${env}.env"
      set +a
      kustomize build "apps/${env}" | flux envsubst --strict
    done
```

## Conclusion

Testing Flux variable substitutions locally with `flux envsubst` helps you catch undefined variables, verify default values, and ensure environment-specific configurations are correct before they reach your cluster. By combining it with strict mode validation and CI integration, you can build a reliable workflow that prevents substitution errors from causing deployment failures.
