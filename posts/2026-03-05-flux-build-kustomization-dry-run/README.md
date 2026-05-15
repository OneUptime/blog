# How to Use flux build kustomization for Dry Run in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Dry Run, Build, Validation

Description: Learn how to use the flux build kustomization command to preview the rendered output of your Kustomization resources before they are applied to the cluster.

---

Before applying changes to a production cluster, you want to verify that your manifests render correctly. The `flux build kustomization` command lets you do exactly that -- it performs a local dry run of the kustomize build process that Flux would execute during reconciliation, showing you the fully rendered YAML output without actually applying anything to the cluster.

This guide covers how to use `flux build kustomization` for validation, CI/CD integration, and catching errors before they reach your cluster.

## Prerequisites

- The `flux` CLI installed
- `kubectl` access to the cluster where the Kustomization exists (for fetching substitution variables)
- A Git repository with Flux Kustomization resources

## What flux build kustomization Does

The `flux build kustomization` command simulates what the kustomize-controller does during reconciliation:

1. It reads the Kustomization resource spec (either from the cluster or from a local file)
2. It runs `kustomize build` on the specified path, generating a local `kustomization.yaml` if one does not already exist
3. It applies any variable substitutions defined in `spec.postBuild`
4. It outputs the fully rendered manifests to stdout

This gives you the YAML that Flux would apply, allowing you to inspect it for correctness.

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
  --kustomization-file ./clusters/production/my-app.yaml \
  --dry-run
```

When using `--kustomization-file`, the CLI reads the Kustomization spec from the file rather than the cluster. With `--dry-run`, the command does not connect to the cluster, and `substituteFrom` references to ConfigMaps and Secrets are skipped. You can work around this by putting the required values in `spec.postBuild.substitute` in the local Kustomization file:

```yaml
spec:
  postBuild:
    substitute:
      CLUSTER_ENV: production
      APP_REPLICAS: "3"
```

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

Server-side dry run is more thorough because it sends the objects to the API server for validation, defaulting, authorization, and admission checks. It can catch issues such as missing namespaces, schema errors, quota or policy violations, and RBAC problems for the credentials running the command, but it does not prove that every referenced object exists unless an admission policy enforces that.

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
            --dry-run \
            | kubeconform -strict -summary -output json
```

This pipeline runs on every pull request and fails if the Kustomization produces invalid manifests. Because it uses `--dry-run`, any values normally loaded through `substituteFrom` should be supplied through `spec.postBuild.substitute` in the local Kustomization file.

## Common Build Errors

**Invalid manifest in the build path**:

```text
Error: accumulating resources: accumulating resources from 'deployment.yaml': MalformedYAMLError
```

Ensure the path contains valid Kubernetes YAML. Flux can generate a local `kustomization.yaml` if one does not already exist, but the YAML files under the path must still be valid manifests.

**Invalid patch target**:

```text
Error: no matches for OriginalId Deployment.v1.apps/my-app
```

A strategic merge patch or JSON patch references a resource that does not exist in the base. Check the patch target names and kinds.

**Unresolved variable substitution in strict mode**:

```text
Error: variable 'CLUSTER_ENV' not found in substitution map
```

A `${VARIABLE}` placeholder in your manifests does not have a corresponding entry in the substitution map while `--strict-substitute` is enabled. Add the variable to `spec.postBuild.substitute` or to the referenced ConfigMap/Secret. Without strict substitution, undefined variables are replaced with an empty string unless a default value is provided.

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
