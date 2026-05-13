# How to Configure Manifest Validation in CI for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Manifest Validation, CI/CD, GitOps, Kubeval, Kubeconform, Kustomize

Description: Learn how to add Kubernetes manifest validation to CI pipelines so that only syntactically correct and schema-valid manifests reach your Flux CD fleet repository.

---

## Introduction

Flux CD reconciles whatever is in your Git repository. If a broken manifest is merged, Flux will attempt to apply it and the reconciliation will fail, potentially leaving your application in a degraded state. Adding manifest validation as a CI gate on pull requests catches errors before they reach the fleet repository, preventing reconciliation failures entirely.

Validation can range from basic YAML syntax checking to full Kubernetes schema validation against the API server version running in your cluster. Tools like `kubeconform`, `kubeval`, `kustomize build`, and `kubectl apply --dry-run=server` each catch different categories of problems.

This guide covers setting up a comprehensive manifest validation pipeline for a Flux CD fleet repository, including Kustomize rendering, schema validation, and dry-run testing.

## Prerequisites

- A fleet repository containing Kubernetes manifests managed by Flux CD
- GitHub Actions or another CI system
- `kustomize`, `kubeconform`, and `kubectl` available in CI
- Optional: access to a test cluster for server-side dry-run validation

## Step 1: Understand What to Validate

A comprehensive validation pipeline checks:

1. **YAML syntax**: Is the YAML well-formed?
2. **Kustomize rendering**: Does `kustomize build` succeed without errors?
3. **Kubernetes schema validation**: Do manifests conform to the API schema for the target cluster version?
4. **Flux-specific CRD validation**: Are Flux CRDs (GitRepository, HelmRelease, etc.) valid?
5. **Server-side dry-run**: Would the API server accept the resources?

## Step 2: Set Up the Validation Workflow

```yaml
# .github/workflows/validate.yml

name: Validate Manifests

on:
  pull_request:
    paths:
      - 'clusters/**'
      - 'apps/**'
      - 'infrastructure/**'

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install kubeconform for schema validation
          KUBECONFORM_VERSION="v0.6.4"
          curl -sL "https://github.com/yannh/kubeconform/releases/download/${KUBECONFORM_VERSION}/kubeconform-linux-amd64.tar.gz" \
            | sudo tar xz -C /usr/local/bin/

          # Install kustomize
          curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" \
            | bash
          sudo mv kustomize /usr/local/bin/

          # Install flux CLI for Flux-specific validation
          curl -s https://fluxcd.io/install.sh | sudo bash

          # Install PyYAML for the syntax check
          python3 -m pip install --user pyyaml

      - name: Validate YAML syntax
        run: |
          # Find all YAML files and check they parse correctly
          python3 - <<'PY'
          import pathlib
          import sys
          import yaml

          failed = False
          for path in pathlib.Path(".").rglob("*"):
              if path.suffix not in (".yaml", ".yml"):
                  continue
              try:
                  with path.open() as f:
                      list(yaml.safe_load_all(f))
                  print(f"OK: {path}")
              except yaml.YAMLError as e:
                  print(f"ERROR: {path} - {e}")
                  failed = True

          if failed:
              sys.exit(1)
          PY

      - name: Render and validate with kubeconform
        run: |
          # Render each kustomization and validate schema, including Flux CRDs from the CRDs catalog
          find . -name kustomization.yaml | while read kustomization; do
            dir=$(dirname "$kustomization")
            echo "Validating: $dir"
            kustomize build "$dir" | kubeconform \
              --strict \
              --ignore-missing-schemas \
              --kubernetes-version "1.29.0" \
              --schema-location default \
              --schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
              -
          done
```

## Step 3: Add Flux-Specific Validation

```yaml
      - name: Validate Flux resources
        run: |
          # Check all GitRepository resources use the current stable API version
          find . -name '*.yaml' -exec grep -l 'kind: GitRepository' {} \; | while read f; do
            echo "Checking GitRepository in $f"
            # Ensure apiVersion is correct
            grep -q 'apiVersion: source.toolkit.fluxcd.io/v1' "$f" || \
              echo "WARNING: $f may use deprecated GitRepository API version"
          done

          # Validate HelmRelease resources
          find . -name '*.yaml' -exec grep -l 'kind: HelmRelease' {} \; | while read f; do
            echo "Checking HelmRelease in $f"
            grep -q 'apiVersion: helm.toolkit.fluxcd.io/v2' "$f" || \
              echo "WARNING: $f may use deprecated HelmRelease API version"
          done
```

## Step 4: Add Server-Side Dry Run Against a Test Cluster

For the strongest validation, run against an actual API server:

```yaml
      - name: Server-side dry run
        if: github.event_name == 'pull_request'
        env:
          TEST_CLUSTER_KUBECONFIG: ${{ secrets.TEST_CLUSTER_KUBECONFIG }}
        run: |
          # Write the kubeconfig secret to a file and point kubectl at it
          echo "$TEST_CLUSTER_KUBECONFIG" > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

          # Apply all manifests in dry-run mode
          find . -name '*.yaml' -not -path '*/flux-system/*' | while read f; do
            # Skip Flux bootstrap files that reference cluster-specific secrets
            if grep -q 'kind: Secret' "$f" 2>/dev/null; then
              echo "Skipping secret file: $f"
              continue
            fi
            kubectl apply --dry-run=server -f "$f"
          done
```

## Step 5: Add Kustomize Build Diff for PR Review

```yaml
      - name: Generate kustomize diff
        run: |
          # Build the target and base manifests to generate a diff for reviewers
          git fetch origin main
          git worktree add /tmp/base origin/main
          kustomize build /tmp/base/clusters/production/ > /tmp/base.yaml
          kustomize build clusters/production/ > /tmp/head.yaml
          git worktree remove /tmp/base

          echo "## Manifest Diff" >> $GITHUB_STEP_SUMMARY
          echo '```diff' >> $GITHUB_STEP_SUMMARY
          diff /tmp/base.yaml /tmp/head.yaml >> $GITHUB_STEP_SUMMARY || true
          echo '```' >> $GITHUB_STEP_SUMMARY
```

## Step 6: Enforce Validation as a Required Status Check

In your GitHub repository settings:

1. Go to **Settings > Branches > Branch protection rules**
2. Enable **Require status checks to pass before merging**
3. Add `validate` as a required check
4. Enable **Require branches to be up to date before merging**

This ensures no PR can be merged to the fleet repository without passing validation.

## Best Practices

- Pin `--kubernetes-version` in kubeconform to the exact version running in your cluster to catch API deprecations.
- Add the Flux CRD catalog URL to kubeconform's `--schema-location` to validate Flux-specific resources correctly.
- Generate a kustomize diff as a PR comment or step summary so reviewers can see exactly what will change in the cluster.
- Validate both the Kubernetes manifests and the Kustomize overlays, not just the base resources.
- Run validation on every PR to the fleet repository, not just merges to main.
- Treat server-side dry-run failures as blocking; they catch real API compatibility issues that client-side tools miss.

## Conclusion

Manifest validation in CI is one of the highest-ROI investments you can make in a Flux CD GitOps setup. It transforms the fleet repository from a collection of YAML files into a validated artifact that Flux CD can reliably apply, reducing the frequency and impact of reconciliation failures in production.
