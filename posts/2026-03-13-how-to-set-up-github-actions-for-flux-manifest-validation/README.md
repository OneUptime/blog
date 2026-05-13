# How to Set Up GitHub Actions for Flux Manifest Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GitHub Action, CI/CD, Validation

Description: Learn how to configure GitHub Actions to automatically validate Flux manifests on every pull request before they reach your cluster.

---

Catching misconfigurations before they reach your Kubernetes cluster is one of the most important practices in GitOps. By integrating Flux manifest validation into your GitHub Actions workflow, you can ensure that every pull request is checked for syntax errors, schema violations, and structural problems before merging.

This guide walks you through setting up a complete validation pipeline using GitHub Actions and the Flux CLI.

## Prerequisites

Before getting started, make sure you have the following in place:

- A GitHub repository containing your Flux manifests
- Flux CLI installed locally for testing
- Basic familiarity with GitHub Actions workflows

## Installing the Flux CLI in GitHub Actions

The first step is to create a workflow file that installs the Flux CLI. Create a file at `.github/workflows/validate.yml` in your repository:

```yaml
name: Validate Flux Manifests

on:
  pull_request:
    branches:
      - main
    paths:
      - 'clusters/**'
      - 'apps/**'
      - 'infrastructure/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Run Flux pre-checks
        run: |
          flux check --pre
```

The `paths` filter ensures the workflow only runs when Flux-related files are modified, saving CI minutes on unrelated changes.

The `flux check --pre` command verifies that the GitHub Actions runner has the prerequisites needed before installing Flux components. The manifest-specific validation is added in the following steps.

## Adding Kubernetes Schema Validation

Beyond basic syntax checks, you should validate your manifests against Kubernetes API schemas. The `kubeconform` tool is excellent for this purpose:

```yaml
      - name: Install kubeconform
        run: |
          curl -sSL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
          sudo mv kubeconform /usr/local/bin/kubeconform

      - name: Validate Kubernetes schemas
        run: |
          find . -name '*.yaml' -not -path './.git/*' | \
            xargs kubeconform \
              -strict \
              -ignore-missing-schemas \
              -schema-location default \
              -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
              -summary
```

The additional schema location pulls in CRD schemas from the community catalog, which helps validate custom resources like Flux `Kustomization`, `HelmRelease`, and `GitRepository` objects.

## Validating Kustomize Overlays

Flux relies heavily on Kustomize. You should verify that all your Kustomize overlays build successfully:

```yaml
      - name: Validate kustomize overlays
        run: |
          find . -name 'kustomization.yaml' -not -path './.git/*' -exec dirname {} \; | while read dir; do
            echo "Validating $dir"
            kubectl kustomize "$dir" > /dev/null || exit 1
          done
```

## Adding Flux-Specific Validation

Use the `flux build` command to validate Flux Kustomization resources specifically:

```yaml
      - name: Validate Flux Kustomizations
        run: |
          find ./clusters -name '*.yaml' -exec grep -l "kind: Kustomization" {} \; | while IFS= read -r ks; do
            name=$(awk '/^kind: Kustomization/{found=1} found && /^[[:space:]]*name:/{print $2; exit}' "$ks")
            path=$(awk '/^spec:/{found=1} found && /^[[:space:]]*path:/{print $2; exit}' "$ks")
            echo "Checking $ks"
            flux build kustomization "$name" \
              --path "$path" \
              --kustomization-file "$ks" \
              --dry-run > /dev/null
          done
```

## Complete Workflow

Here is the full workflow combining all validation steps:

```yaml
name: Validate Flux Manifests

on:
  pull_request:
    branches:
      - main
    paths:
      - 'clusters/**'
      - 'apps/**'
      - 'infrastructure/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Install kubeconform
        run: |
          curl -sSL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | tar xz
          sudo mv kubeconform /usr/local/bin/kubeconform

      - name: Run Flux pre-checks
        run: flux check --pre

      - name: Validate Kubernetes schemas
        run: |
          find . -name '*.yaml' -not -path './.git/*' | \
            xargs kubeconform \
              -strict \
              -ignore-missing-schemas \
              -schema-location default \
              -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
              -summary

      - name: Validate kustomize overlays
        run: |
          find . -name 'kustomization.yaml' -not -path './.git/*' -exec dirname {} \; | while read dir; do
            echo "Validating $dir"
            kubectl kustomize "$dir" > /dev/null || exit 1
          done

      - name: Validate Flux Kustomizations
        run: |
          find ./clusters -name '*.yaml' -exec grep -l "kind: Kustomization" {} \; | while IFS= read -r ks; do
            name=$(awk '/^kind: Kustomization/{found=1} found && /^[[:space:]]*name:/{print $2; exit}' "$ks")
            path=$(awk '/^spec:/{found=1} found && /^[[:space:]]*path:/{print $2; exit}' "$ks")
            echo "Checking $ks"
            flux build kustomization "$name" \
              --path "$path" \
              --kustomization-file "$ks" \
              --dry-run > /dev/null
          done

      - name: YAML lint
        run: |
          pip install yamllint
          yamllint -c .yamllint.yml . || true
```

## Adding a yamllint Configuration

Create a `.yamllint.yml` file in your repository root to configure YAML linting rules:

```yaml
extends: default

rules:
  line-length:
    max: 200
    level: warning
  comments:
    min-spaces-from-content: 1
  truthy:
    check-keys: false
  document-start: disable
```

## Adding Status Checks

To enforce validation, go to your repository settings and add the validation workflow as a required status check for the `main` branch. This prevents merging pull requests that fail validation.

Navigate to Settings, then Branches, then Branch protection rules. Add a rule for `main` and enable "Require status checks to pass before merging." Search for your workflow job name and add it.

## Caching for Faster Builds

Speed up your workflow by caching the kubeconform binary:

```yaml
      - name: Cache tools
        uses: actions/cache@v4
        with:
          path: |
            /usr/local/bin/kubeconform
          key: tools-${{ runner.os }}-kubeconform
```

## Conclusion

Setting up GitHub Actions for Flux manifest validation provides a safety net that catches configuration errors before they can affect your clusters. By combining Flux pre-checks, Kubernetes schema validation, Kustomize build verification, and YAML linting, you create a comprehensive validation pipeline that gives your team confidence in every change. As your GitOps repository grows, this automated validation becomes increasingly valuable in maintaining the health and reliability of your deployments.
