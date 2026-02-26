# How to Use argocd app manifests to Inspect Generated Manifests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Debugging

Description: Learn how to use argocd app manifests to inspect the exact Kubernetes manifests ArgoCD generates from Helm charts, Kustomize overlays, and plain YAML sources.

---

When ArgoCD deploys your application, it transforms your source (Helm chart, Kustomize overlay, plain YAML) into Kubernetes manifests that get applied to the cluster. The `argocd app manifests` command lets you see exactly what ArgoCD generates, which is essential for debugging template rendering issues, understanding what gets deployed, and validating your configuration.

## Basic Usage

```bash
# Show the generated manifests (desired state from Git)
argocd app manifests my-app
```

This outputs all the Kubernetes manifests that ArgoCD would apply during a sync. The output is the fully rendered YAML, with all Helm template variables resolved, Kustomize transformations applied, and any other processing complete.

## Source vs Live Manifests

The `argocd app manifests` command can show two different views:

### Source Manifests (Desired State)

```bash
# Show what ArgoCD generates from the Git source (default)
argocd app manifests my-app --source
```

These are the manifests as generated from your repository - this is the "desired state."

### Live Manifests (Current State)

```bash
# Show what is actually running in the cluster
argocd app manifests my-app --source live
```

These are the manifests as they exist in the cluster right now - this is the "live state."

Comparing these two outputs helps you understand why an application is OutOfSync.

## Revision-Specific Manifests

View manifests for a specific Git revision:

```bash
# Show manifests for a specific commit
argocd app manifests my-app --revision a1b2c3d4e5f6

# Show manifests for a specific tag
argocd app manifests my-app --revision v2.1.0

# Show manifests for a specific branch
argocd app manifests my-app --revision feature/new-config
```

This is useful for previewing what a new version would deploy without actually syncing.

## Output Filtering

The command outputs all manifests concatenated together. Use standard tools to filter:

```bash
# Count the number of resources
argocd app manifests my-app | grep "^kind:" | wc -l

# Extract only Deployments
argocd app manifests my-app | python3 -c "
import sys, yaml
for doc in yaml.safe_load_all(sys.stdin):
    if doc and doc.get('kind') == 'Deployment':
        print(yaml.dump(doc, default_flow_style=False))
        print('---')
"

# Using yq to filter (if installed)
argocd app manifests my-app | yq 'select(.kind == "Deployment")'

# Extract a specific resource by name
argocd app manifests my-app | yq 'select(.metadata.name == "my-app" and .kind == "Deployment")'
```

## Debugging Helm Template Rendering

When your Helm chart is not rendering as expected, `argocd app manifests` shows you exactly what ArgoCD produces:

```bash
# See what ArgoCD generates from your Helm chart
argocd app manifests my-helm-app

# Compare with local Helm rendering
helm template my-release ./my-chart -f values-production.yaml

# Diff the two to find discrepancies
diff <(argocd app manifests my-helm-app) <(helm template my-release ./my-chart -f values-production.yaml)
```

Common issues this reveals:
- Helm values not being applied correctly
- Wrong chart version being used
- Missing value overrides
- Unexpected default values

## Debugging Kustomize Build

```bash
# See what ArgoCD generates from your Kustomize overlay
argocd app manifests my-kustomize-app

# Compare with local kustomize build
kustomize build ./overlays/production

# Diff to find discrepancies
diff <(argocd app manifests my-kustomize-app) <(kustomize build ./overlays/production)
```

## Comparing Desired vs Live State

This is one of the most powerful debugging techniques - comparing what ArgoCD wants to deploy versus what is actually running:

```bash
#!/bin/bash
# compare-states.sh - Compare desired and live manifests

APP_NAME="${1:?Usage: compare-states.sh <app-name>}"

DESIRED=$(argocd app manifests "$APP_NAME" --source)
LIVE=$(argocd app manifests "$APP_NAME" --source live)

# Save to temp files for diff
echo "$DESIRED" > /tmp/desired.yaml
echo "$LIVE" > /tmp/live.yaml

# Show the diff
diff --color /tmp/desired.yaml /tmp/live.yaml

# Cleanup
rm /tmp/desired.yaml /tmp/live.yaml
```

## Validating Manifests

Use the manifest output to run validation tools:

```bash
# Validate with kubeval
argocd app manifests my-app | kubeval --strict

# Validate with kubeconform
argocd app manifests my-app | kubeconform -strict

# Check with OPA/Conftest
argocd app manifests my-app | conftest test -

# Scan for security issues with kubesec
argocd app manifests my-app | kubesec scan /dev/stdin

# Scan with trivy
argocd app manifests my-app > /tmp/manifests.yaml
trivy config /tmp/manifests.yaml
```

## CI/CD Manifest Validation Pipeline

```yaml
# GitHub Actions - Validate manifests before deployment
name: Validate ArgoCD Manifests
on:
  pull_request:
    paths:
      - 'k8s/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install tools
        run: |
          # Install ArgoCD CLI
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd && sudo mv argocd /usr/local/bin/
          # Install kubeconform
          curl -sSL -o kubeconform.tar.gz https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz
          tar xf kubeconform.tar.gz && sudo mv kubeconform /usr/local/bin/

      - name: Login to ArgoCD
        run: argocd login ${{ secrets.ARGOCD_SERVER }} --username ${{ secrets.ARGOCD_USER }} --password ${{ secrets.ARGOCD_PASS }} --grpc-web

      - name: Validate manifests
        run: |
          argocd app manifests my-app --revision ${{ github.head_ref }} | kubeconform -strict -summary
```

## Exporting Manifests for Review

Generate manifest reports for review or documentation:

```bash
#!/bin/bash
# export-manifests.sh - Export manifests for all applications

OUTPUT_DIR="./manifest-exports"
mkdir -p "$OUTPUT_DIR"

for app in $(argocd app list -o name); do
  echo "Exporting manifests for: $app"
  argocd app manifests "$app" > "$OUTPUT_DIR/${app}.yaml" 2>/dev/null
done

echo "Manifests exported to $OUTPUT_DIR"
echo "Total applications: $(ls "$OUTPUT_DIR"/*.yaml | wc -l)"
```

## Manifest Diff Between Revisions

Compare what would change between two Git revisions:

```bash
#!/bin/bash
# revision-manifest-diff.sh - Compare manifests between two revisions

APP_NAME="${1:?Usage: revision-manifest-diff.sh <app> <old-rev> <new-rev>}"
OLD_REV="${2:?Provide old revision}"
NEW_REV="${3:?Provide new revision}"

echo "=== Manifest diff: $OLD_REV to $NEW_REV ==="

OLD_MANIFESTS=$(argocd app manifests "$APP_NAME" --revision "$OLD_REV")
NEW_MANIFESTS=$(argocd app manifests "$APP_NAME" --revision "$NEW_REV")

diff <(echo "$OLD_MANIFESTS") <(echo "$NEW_MANIFESTS")
```

## Troubleshooting Manifest Generation

### Empty Manifests

If `argocd app manifests` returns nothing:

```bash
# Check for generation errors
argocd app get my-app -o json | jq '.status.conditions[] | select(.type == "ComparisonError")'

# Check repo server logs for rendering errors
kubectl logs deployment/argocd-repo-server -n argocd | grep "my-app" | tail -20
```

### Incorrect Manifests

If manifests are not what you expect:

```bash
# Verify the source configuration
argocd app get my-app -o json | jq '.spec.source'

# Check if parameters are being applied
argocd app get my-app -o json | jq '.spec.source.helm.parameters'

# Verify the revision being used
argocd app get my-app -o json | jq '.status.sync.revision'
```

### Large Manifest Sets

For applications with many manifests:

```bash
# Count resources by kind
argocd app manifests my-app | grep "^kind:" | sort | uniq -c | sort -rn

# Get total resource count
argocd app manifests my-app | grep "^kind:" | wc -l

# Get total manifest size
argocd app manifests my-app | wc -c
```

## Summary

The `argocd app manifests` command is your window into what ArgoCD actually generates and deploys. Use it to debug template rendering issues (Helm, Kustomize), compare desired versus live state, validate manifests against policy, and export manifests for review. It is especially valuable when the application shows as OutOfSync and you need to understand exactly what differs between Git and the cluster.
