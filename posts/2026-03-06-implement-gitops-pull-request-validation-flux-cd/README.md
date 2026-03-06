# How to Implement GitOps Pull Request Validation with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Pull Requests, Validation, CI/CD, GitHub Actions, Kubernetes

Description: A comprehensive guide to implementing automated pull request validation for Flux CD GitOps repositories to catch errors before merging.

---

In a GitOps workflow, the Git repository is the source of truth for your Kubernetes cluster state. Every change goes through a pull request, making PR validation critical for preventing broken deployments. This guide shows how to build a robust PR validation pipeline for Flux CD repositories.

## Prerequisites

- A GitHub repository with Flux CD configurations
- GitHub Actions enabled on the repository
- Flux CLI v2.0 or later
- Basic understanding of Flux CD Kustomization and HelmRelease resources

## Why PR Validation Matters for GitOps

Without PR validation, a single malformed YAML file or misconfigured Kustomization can break the entire reconciliation loop, leaving your cluster in a degraded state. Automated validation catches these issues before they reach the main branch.

## Repository Structure

```text
clusters/
  staging/
    flux-system/
      gotk-sync.yaml
    infrastructure.yaml
    apps.yaml
  production/
    flux-system/
      gotk-sync.yaml
    infrastructure.yaml
    apps.yaml
infrastructure/
  base/
    kustomization.yaml
    cert-manager/
    ingress-nginx/
  overlays/
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
apps/
  base/
    kustomization.yaml
    frontend/
    backend/
  overlays/
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
```

## Step 1: YAML Syntax Validation

The first layer of validation ensures all YAML files are syntactically correct.

```yaml
# .github/workflows/pr-validation.yaml
name: PR Validation
on:
  pull_request:
    branches:
      - main
    paths:
      - "clusters/**"
      - "infrastructure/**"
      - "apps/**"

jobs:
  yaml-validation:
    name: YAML Syntax Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install yamllint
        run: pip install yamllint

      - name: Create yamllint config
        run: |
          cat > .yamllint.yaml << 'YAMLLINT_EOF'
          extends: default
          rules:
            line-length:
              max: 200
              allow-non-breakable-inline-mappings: true
            comments:
              min-spaces-from-content: 1
            truthy:
              check-keys: false
          YAMLLINT_EOF

      - name: Run yamllint
        run: |
          # Validate all YAML files in the repository
          yamllint -c .yamllint.yaml \
            clusters/ infrastructure/ apps/
```

## Step 2: Kubernetes Schema Validation

Validate that all manifests conform to Kubernetes API schemas.

```yaml
  schema-validation:
    name: Kubernetes Schema Validation
    runs-on: ubuntu-latest
    needs: yaml-validation
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install kubeconform
        run: |
          curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
            tar xz -C /usr/local/bin

      - name: Download Flux CD CRD schemas
        run: |
          # Create a directory for custom schemas
          mkdir -p /tmp/flux-schemas

          # Download Flux CD CRD schemas for kubeconform
          curl -sL https://github.com/fluxcd/flux2/releases/latest/download/crd-schemas.tar.gz | \
            tar xz -C /tmp/flux-schemas

      - name: Validate Kubernetes schemas
        run: |
          # Validate all YAML files against Kubernetes and Flux schemas
          find clusters/ infrastructure/ apps/ \
            -name "*.yaml" -type f | \
            xargs kubeconform \
              -strict \
              -ignore-missing-schemas \
              -schema-location default \
              -schema-location "/tmp/flux-schemas/{{ .ResourceKind }}_{{ .ResourceAPIVersion }}.json" \
              -summary
```

## Step 3: Flux Build Validation

Use `flux build` to render and validate all Kustomizations.

```yaml
  flux-build:
    name: Flux Build Validation
    runs-on: ubuntu-latest
    needs: yaml-validation
    strategy:
      matrix:
        cluster: [staging, production]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Install yq
        run: |
          sudo wget -qO /usr/local/bin/yq \
            https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

      - name: Build all Kustomizations for ${{ matrix.cluster }}
        run: |
          ERRORS=0

          for ks_file in clusters/${{ matrix.cluster }}/*.yaml; do
            [ -f "$ks_file" ] || continue

            # Parse the Kustomization metadata
            KIND=$(yq '.kind' "$ks_file")
            NAME=$(yq '.metadata.name' "$ks_file")
            PATH_FIELD=$(yq '.spec.path' "$ks_file")

            # Only process Kustomization resources
            if [ "$KIND" != "Kustomization" ] || [ "$PATH_FIELD" = "null" ]; then
              continue
            fi

            echo "Building: $NAME (cluster: ${{ matrix.cluster }})"

            # Run flux build
            if ! flux build kustomization "$NAME" \
              --path ".${PATH_FIELD}" \
              --kustomization-file "$ks_file" > /dev/null 2>&1; then

              echo "FAILED: $NAME"
              flux build kustomization "$NAME" \
                --path ".${PATH_FIELD}" \
                --kustomization-file "$ks_file" 2>&1 || true
              ERRORS=$((ERRORS + 1))
            else
              echo "OK: $NAME"
            fi
          done

          if [ "$ERRORS" -gt 0 ]; then
            echo "Build validation failed with $ERRORS error(s)"
            exit 1
          fi
```

## Step 4: Kustomize Overlay Consistency

Verify that all environments have consistent overlays.

```yaml
  overlay-consistency:
    name: Overlay Consistency Check
    runs-on: ubuntu-latest
    needs: yaml-validation
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Check overlay consistency
        run: |
          #!/bin/bash
          set -euo pipefail

          ERRORS=0

          # Check infrastructure overlays
          for base_resource in infrastructure/base/*.yaml; do
            RESOURCE=$(basename "$base_resource")

            for env in staging production; do
              OVERLAY_DIR="infrastructure/overlays/$env"

              if [ ! -d "$OVERLAY_DIR" ]; then
                echo "WARNING: Missing overlay directory: $OVERLAY_DIR"
                ERRORS=$((ERRORS + 1))
              fi
            done
          done

          # Check app overlays
          for base_resource in apps/base/*.yaml; do
            RESOURCE=$(basename "$base_resource")

            for env in staging production; do
              OVERLAY_DIR="apps/overlays/$env"

              if [ ! -d "$OVERLAY_DIR" ]; then
                echo "WARNING: Missing overlay directory: $OVERLAY_DIR"
                ERRORS=$((ERRORS + 1))
              fi
            done
          done

          if [ "$ERRORS" -gt 0 ]; then
            echo "Consistency check found $ERRORS issue(s)"
            exit 1
          fi

          echo "All overlay directories are consistent"
```

## Step 5: HelmRelease Validation

Validate HelmRelease configurations.

```yaml
  helm-validation:
    name: HelmRelease Validation
    runs-on: ubuntu-latest
    needs: yaml-validation
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install yq
          sudo wget -qO /usr/local/bin/yq \
            https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq
          # Install helm
          curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

      - name: Validate HelmRelease resources
        run: |
          ERRORS=0

          # Find all HelmRelease files
          find . -name "*.yaml" -type f | while read -r file; do
            KIND=$(yq '.kind' "$file" 2>/dev/null)

            if [ "$KIND" = "HelmRelease" ]; then
              echo "Validating HelmRelease: $file"

              # Check required fields
              CHART_NAME=$(yq '.spec.chart.spec.chart' "$file")
              CHART_VERSION=$(yq '.spec.chart.spec.version' "$file")
              SOURCE_KIND=$(yq '.spec.chart.spec.sourceRef.kind' "$file")

              if [ "$CHART_NAME" = "null" ]; then
                echo "  ERROR: Missing chart name in $file"
                ERRORS=$((ERRORS + 1))
              fi

              if [ "$CHART_VERSION" = "null" ]; then
                echo "  WARNING: No chart version pinned in $file"
              fi

              if [ "$SOURCE_KIND" = "null" ]; then
                echo "  ERROR: Missing sourceRef in $file"
                ERRORS=$((ERRORS + 1))
              fi

              echo "  OK: $file"
            fi
          done

          if [ "$ERRORS" -gt 0 ]; then
            echo "HelmRelease validation failed"
            exit 1
          fi
```

## Step 6: PR Comment with Validation Summary

Post a summary of all validation results on the PR.

```yaml
  summary:
    name: Validation Summary
    runs-on: ubuntu-latest
    needs: [yaml-validation, schema-validation, flux-build, helm-validation]
    if: always()
    permissions:
      pull-requests: write
    steps:
      - name: Post validation summary
        uses: actions/github-script@v7
        with:
          script: |
            const jobs = [
              { name: 'YAML Syntax', status: '${{ needs.yaml-validation.result }}' },
              { name: 'K8s Schema', status: '${{ needs.schema-validation.result }}' },
              { name: 'Flux Build', status: '${{ needs.flux-build.result }}' },
              { name: 'HelmRelease', status: '${{ needs.helm-validation.result }}' },
            ];

            const statusIcon = (s) => s === 'success' ? 'PASS' : s === 'failure' ? 'FAIL' : 'SKIP';

            let body = '## Flux CD PR Validation Summary\n\n';
            body += '| Check | Status |\n|-------|--------|\n';
            jobs.forEach(j => {
              body += `| ${j.name} | ${statusIcon(j.status)} |\n`;
            });

            const allPassed = jobs.every(j => j.status === 'success');
            body += allPassed
              ? '\nAll validation checks passed. Safe to merge.'
              : '\nSome checks failed. Please review and fix before merging.';

            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existing = comments.data.find(c =>
              c.body.includes('Flux CD PR Validation Summary')
            );

            const params = {
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body,
            };

            if (existing) {
              await github.rest.issues.updateComment({
                ...params,
                comment_id: existing.id,
              });
            } else {
              await github.rest.issues.createComment({
                ...params,
                issue_number: context.issue.number,
              });
            }
```

## Branch Protection Rules

Configure branch protection to require all validation checks.

```bash
# Using GitHub CLI to set branch protection rules
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["YAML Syntax Check","Kubernetes Schema Validation","Flux Build Validation (staging)","Flux Build Validation (production)","HelmRelease Validation"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1}'
```

## Local Validation Script

Run the same validation checks locally before pushing.

```bash
#!/bin/bash
# scripts/validate-pr.sh
# Run all PR validation checks locally

set -euo pipefail

echo "=== Flux CD PR Validation ==="
echo ""

# Step 1: YAML syntax
echo "1. YAML Syntax Validation..."
if command -v yamllint &> /dev/null; then
  yamllint -d relaxed clusters/ infrastructure/ apps/ && echo "   PASSED" || echo "   FAILED"
else
  echo "   SKIPPED (yamllint not installed)"
fi

# Step 2: Kubernetes schema validation
echo "2. Kubernetes Schema Validation..."
if command -v kubeconform &> /dev/null; then
  find clusters/ infrastructure/ apps/ -name "*.yaml" -type f | \
    xargs kubeconform -strict -ignore-missing-schemas -summary && echo "   PASSED" || echo "   FAILED"
else
  echo "   SKIPPED (kubeconform not installed)"
fi

# Step 3: Flux build
echo "3. Flux Build Validation..."
if command -v flux &> /dev/null; then
  for cluster in staging production; do
    for ks_file in clusters/$cluster/*.yaml; do
      [ -f "$ks_file" ] || continue
      NAME=$(yq '.metadata.name' "$ks_file" 2>/dev/null)
      PATH_FIELD=$(yq '.spec.path' "$ks_file" 2>/dev/null)
      [ "$NAME" = "null" ] || [ "$PATH_FIELD" = "null" ] && continue

      flux build kustomization "$NAME" \
        --path ".${PATH_FIELD}" \
        --kustomization-file "$ks_file" > /dev/null 2>&1 && \
        echo "   OK: $NAME ($cluster)" || \
        echo "   FAILED: $NAME ($cluster)"
    done
  done
else
  echo "   SKIPPED (flux CLI not installed)"
fi

echo ""
echo "=== Validation Complete ==="
```

## Summary

Pull request validation for Flux CD repositories should be a multi-layered process: YAML syntax checking, Kubernetes schema validation, Flux build verification, HelmRelease validation, and overlay consistency checks. By automating these checks in your CI pipeline and enforcing them through branch protection rules, you create a safety net that prevents misconfigurations from reaching your clusters. Run the same checks locally for fast feedback during development.
