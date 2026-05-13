# How to Test Flux Kustomization Overlays with flux build

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Kustomize, Testing, Validation

Description: Learn how to use the flux build command to test and validate Kustomization overlays locally before deploying to your cluster.

---

Flux Kustomization resources are the backbone of most GitOps repositories. They define what gets deployed, where the source files live, and how overlays are applied. The `flux build kustomization` command lets you preview the final rendered output of a Kustomization without applying anything to your cluster.

This guide covers how to use `flux build` effectively to test your Kustomization overlays.

## Understanding flux build kustomization

The `flux build kustomization` command renders a Flux Kustomization resource locally. It processes the Kustomize overlays, applies patches, and produces the final YAML that Flux would apply to your cluster. This lets you inspect the output and catch errors before they cause reconciliation failures.

## Basic Usage

Start with a simple example. Suppose you have a Kustomization resource defined in your cluster:

```yaml
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
```

Save the Kustomization manifest locally, for example as `./clusters/production/apps.yaml`, then run:

```bash
flux build kustomization apps \
  --path ./apps/production \
  --kustomization-file ./clusters/production/apps.yaml \
  --dry-run
```

This renders all the Kubernetes resources that the Kustomization would produce without connecting to any cluster.

## Testing Overlays with Base and Environment Layers

A common pattern is having a base configuration with environment-specific overlays. Consider this structure:

```text
apps/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  staging/
    kustomization.yaml
    replica-patch.yaml
  production/
    kustomization.yaml
    replica-patch.yaml
```

The base `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

The production overlay `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../base
patches:
  - path: replica-patch.yaml
```

The `replica-patch.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5
```

Build and verify the production overlay:

```bash
flux build kustomization apps \
  --path ./apps/production \
  --kustomization-file ./clusters/production/apps.yaml \
  --dry-run
```

The output will show the deployment with 5 replicas, confirming the patch was applied correctly.

## Comparing Overlay Outputs

You can compare what different environments will produce by building each overlay and diffing the results:

```bash
flux build kustomization apps \
  --path ./apps/staging \
  --kustomization-file ./clusters/staging/apps.yaml \
  --dry-run > /tmp/staging.yaml

flux build kustomization apps \
  --path ./apps/production \
  --kustomization-file ./clusters/production/apps.yaml \
  --dry-run > /tmp/production.yaml

diff /tmp/staging.yaml /tmp/production.yaml
```

This is useful for verifying that environment-specific changes are exactly what you expect and nothing unintended has changed.

## Validating Variable Substitutions

If your Kustomization uses Flux variable substitution, you can test those as well by providing the variables:

```bash
flux build kustomization apps \
  --path ./apps/production \
  --dry-run \
  --kustomization-file ./clusters/production/apps.yaml
```

Where `apps.yaml` contains the Kustomization with `postBuild` substitutions:

```yaml
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
  postBuild:
    substitute:
      CLUSTER_NAME: production
      DOMAIN: prod.example.com
```

## Catching Common Errors

The `flux build` command will catch several types of errors:

Missing resources referenced in kustomization.yaml:

```bash
$ flux build kustomization apps --path ./apps/broken --kustomization-file ./clusters/production/apps.yaml --dry-run
Error: accumulating resources: accumulating resources from ...
```

Invalid patch targets:

```bash
$ flux build kustomization apps --path ./apps/bad-patch --kustomization-file ./clusters/production/apps.yaml --dry-run
Error: no matches for Id ...
```

YAML syntax errors:

```bash
$ flux build kustomization apps --path ./apps/bad-yaml --kustomization-file ./clusters/production/apps.yaml --dry-run
Error: YAML parse error ...
```

## Integrating with Pre-Commit Hooks

Add `flux build` to your pre-commit hooks so overlays are validated before every commit. This example uses `yq` to find Flux Kustomization resources:

```yaml
# .pre-commit-config.yaml

repos:
  - repo: local
    hooks:
      - id: flux-build
        name: Validate Flux Kustomizations
        entry: >-
          bash -c 'set -euo pipefail;
          while IFS= read -r file; do
            while IFS=$'\''\t'\'' read -r name path; do
              [ -n "$name" ] || continue;
              flux build kustomization "$name" --path "$path" --kustomization-file "$file" --dry-run > /dev/null;
            done < <(yq -r '\''select(.apiVersion == "kustomize.toolkit.fluxcd.io/v1" and .kind == "Kustomization") | [.metadata.name, .spec.path] | @tsv'\'' "$file");
          done < <(find . -name "*.yaml" -not -path "./.git/*")'
        language: system
        pass_filenames: false
```

## Scripting Bulk Validation

For repositories with many overlays, create a validation script:

```bash
#!/bin/bash
set -euo pipefail

ERRORS=0

while IFS= read -r file; do
  while IFS=$'\t' read -r name path; do
    [ -n "$name" ] || continue

    echo -n "Building $name from $path ... "
    if flux build kustomization "$name" --path "$path" --kustomization-file "$file" --dry-run > /dev/null 2>&1; then
      echo "OK"
    else
      echo "FAILED"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(yq -r 'select(.apiVersion == "kustomize.toolkit.fluxcd.io/v1" and .kind == "Kustomization") | [.metadata.name, .spec.path] | @tsv' "$file")
done < <(find . -name '*.yaml' -not -path './.git/*')

if [ $ERRORS -gt 0 ]; then
  echo "$ERRORS overlay(s) failed validation"
  exit 1
fi

echo "All overlays validated successfully"
```

## Conclusion

The `flux build kustomization` command is an essential tool for testing Kustomize overlays before they reach your cluster. By building overlays locally, comparing environments, and integrating validation into your development workflow, you can catch errors early and ship configurations with confidence. Make it part of your CI pipeline and pre-commit hooks for maximum coverage.
