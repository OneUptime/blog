# How to Use flux build kustomization for Dry Run in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Dry Run, Build, Validation

Description: Learn how to use the flux build kustomization command to preview the rendered output of your Kustomization resources before they are applied to the cluster.

---

Before applying changes to a production cluster, you want to verify that your manifests render correctly. The `flux build kustomization` command lets you do exactly that -- it performs a local dry run of the kustomize build process that Flux would execute during reconciliation, showing you the fully rendered YAML output without actually applying anything to the cluster.

This guide covers how to use `flux build kustomization` for validation, CI/CD integration, and catching errors before they reach your cluster.

## Prerequisites

- The `flux` CLI installed (version 2.1 or later)
- `kubectl` access to the cluster where the Kustomization exists (for fetching substitution variables)
- A Git repository with Flux Kustomization resources

## What flux build kustomization Does

The `flux build kustomization` command simulates what the kustomize-controller does during reconciliation:

1. It reads the Kustomization resource spec (either from the cluster or from a local file)
2. It runs `kustomize build` on the specified path
3. It applies any variable substitutions defined in `spec.postBuild`
4. It outputs the fully rendered manifests to stdout

This gives you the exact YAML that Flux would apply, allowing you to inspect it for correctness.

## Basic Usage

To build a Kustomization that already exists in the cluster:

```bash
flux build kustomization my-app --path ./apps/my-app
```

This uses the Kustomization spec from the cluster (including any variable substitutions) and builds the manifests from the specified local path.

The output is the rendered YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
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
          image: ghcr.io/my-org/my-app:1.5.2
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

## Dry Run with Variable Substitutions

If your Kustomization uses `spec.postBuild.substitute` or `spec.postBuild.substituteFrom`, the build command resolves those variables. This is particularly useful for catching substitution errors.

Given a Kustomization with:

```yaml
spec:
  postBuild:
    substitute:
      CLUSTER_ENV: production
      APP_REPLICAS: "3"
    substituteFrom:
      - kind: ConfigMap
        name: cluster-config
```

The build command fetches the ConfigMap from the cluster and applies the substitutions:

```bash
flux build kustomization my-app --path ./apps/my-app
```

Variables like `${CLUSTER_ENV}` in your manifests are replaced with their values in the output.

## Building Without Cluster Access

For CI/CD pipelines that do not have cluster access, you can provide the Kustomization spec as a local file:

```bash
flux build kustomization my-app \
  --path ./apps/my-app \
  --kustomization-file ./clusters/production/my-app.yaml
```

When using `--kustomization-file`, the CLI reads the Kustomization spec from the file rather than the cluster. However, `substituteFrom` references to ConfigMaps and Secrets will not be resolved since there is no cluster to fetch them from. You can work around this by providing substitution values directly:

```bash
flux build kustomization my-app \
  --path ./apps/my-app \
  --kustomization-file ./clusters/production/my-app.yaml \
  --dry-run
```

## Validating Output

Pipe the build output to validation tools to catch issues beyond rendering:

**Validate YAML syntax**:

```bash
flux build kustomization my-app --path ./apps/my-app | kubectl apply --dry-run=client -f -
```

**Validate against the cluster API (server-side dry run)**:

```bash
flux build kustomization my-app --path ./apps/my-app | kubectl apply --dry-run=server -f -
```

Server-side dry run is more thorough because it validates against admission webhooks and the current cluster state, catching issues like invalid resource references or RBAC violations.

**Validate with kubeconform**:

```bash
flux build kustomization my-app --path ./apps/my-app | kubeconform -strict -summary
```

This validates the output against Kubernetes JSON schemas without requiring cluster access.

## Integrating with CI/CD

Add `flux build kustomization` to your CI pipeline to catch errors before they are merged:

```yaml
# .github/workflows/validate.yaml
name: Validate Flux Kustomizations
on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Install kubeconform
        run: |
          curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
          sudo mv kubeconform /usr/local/bin/

      - name: Build and validate my-app
        run: |
          flux build kustomization my-app \
            --path ./apps/my-app \
            --kustomization-file ./clusters/production/my-app.yaml \
            | kubeconform -strict -summary -output json
```

This pipeline runs on every pull request and fails if the Kustomization produces invalid manifests.

## Common Build Errors

**Missing kustomization.yaml**:

```
Error: kustomization path './apps/my-app' does not contain a kustomization.yaml file
```

Ensure the path contains a `kustomization.yaml` file that references your resources.

**Invalid patch target**:

```
Error: no matches for OriginalId Deployment.v1.apps/my-app
```

A strategic merge patch or JSON patch references a resource that does not exist in the base. Check the patch target names and kinds.

**Unresolved variable substitution**:

```
Error: variable 'CLUSTER_ENV' not found in substitution map
```

A `${VARIABLE}` placeholder in your manifests does not have a corresponding entry in the substitution map. Add the variable to `spec.postBuild.substitute` or to the referenced ConfigMap/Secret.

## Comparing Builds Across Environments

Use `flux build kustomization` to compare what would be applied in different environments:

```bash
# Build for staging
flux build kustomization my-app \
  --path ./apps/my-app \
  --kustomization-file ./clusters/staging/my-app.yaml > staging.yaml

# Build for production
flux build kustomization my-app \
  --path ./apps/my-app \
  --kustomization-file ./clusters/production/my-app.yaml > production.yaml

# Compare
diff staging.yaml production.yaml
```

This is useful for verifying that environment-specific substitutions produce the expected differences.

## Summary

The `flux build kustomization` command is an essential tool for validating your Flux CD configurations before they are applied. It renders the complete YAML output including kustomize overlays and variable substitutions, giving you visibility into exactly what Flux will apply. By integrating it into CI/CD pipelines and pairing it with validation tools like kubeconform or kubectl dry run, you can catch rendering errors, invalid manifests, and missing variables before they cause reconciliation failures in your clusters.
