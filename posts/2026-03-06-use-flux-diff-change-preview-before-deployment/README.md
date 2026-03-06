# How to Use flux diff for Change Preview Before Deployment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, flux diff, Change preview, GitOps, Kubernetes, Deployment, Validation

Description: Learn how to use the flux diff command to preview changes before they are applied to your Kubernetes cluster, reducing deployment risk.

---

Before deploying changes to a production Kubernetes cluster, you want to know exactly what will change. The `flux diff` command compares your local Kustomization output against what is currently running in the cluster, giving you a precise preview of every change before it takes effect.

## Prerequisites

- A running Kubernetes cluster with Flux CD installed
- Flux CLI v2.0 or later
- kubectl configured to access your cluster
- A Flux CD Git repository with existing deployments

## Understanding flux diff

The `flux diff` command works by:

1. Building your local Kustomization manifests (same as `flux build`)
2. Fetching the current live state from the cluster
3. Computing and displaying the differences

This gives you a clear picture of what will change when Flux reconciles.

## Basic flux diff Usage

### Diffing a Kustomization

```bash
# Compare local changes against the live cluster state
flux diff kustomization infrastructure \
  --path ./infrastructure/overlays/production \
  --kustomization-file ./clusters/production/infrastructure.yaml
```

Sample output:

```diff
--- live
+++ local
@@ -1,7 +1,7 @@
 apiVersion: apps/v1
 kind: Deployment
 metadata:
   name: myapp
   namespace: myapp
 spec:
-  replicas: 2
+  replicas: 3
   selector:
     matchLabels:
       app: myapp
```

## Setting Up a Change Preview Workflow

### Repository Structure

```text
clusters/
  production/
    infrastructure.yaml
    apps.yaml
infrastructure/
  base/
    kustomization.yaml
    deployment.yaml
    service.yaml
    configmap.yaml
  overlays/
    production/
      kustomization.yaml
      patches/
        deployment-patch.yaml
apps/
  base/
    kustomization.yaml
    deployment.yaml
  overlays/
    production/
      kustomization.yaml
```

### Infrastructure Base

```yaml
# infrastructure/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ingress
  namespace: ingress-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nginx-ingress
  template:
    metadata:
      labels:
        app: nginx-ingress
    spec:
      containers:
        - name: nginx
          image: nginx/nginx-ingress:3.4.0
          ports:
            - containerPort: 80
            - containerPort: 443
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

### Production Patch

```yaml
# infrastructure/overlays/production/patches/deployment-patch.yaml
# Scale up nginx-ingress for production traffic
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ingress
  namespace: ingress-system
spec:
  replicas: 4
  template:
    spec:
      containers:
        - name: nginx
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2000m
              memory: 1Gi
```

### Flux Kustomization

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/overlays/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: nginx-ingress
      namespace: ingress-system
```

## Running flux diff Before Committing

```bash
# Preview what will change in the cluster
flux diff kustomization infrastructure \
  --path ./infrastructure/overlays/production \
  --kustomization-file ./clusters/production/infrastructure.yaml

# The output shows exactly which fields will be modified
# Exit code 0 = no changes, exit code 1 = changes detected
```

## Automated Change Preview in Pull Requests

### GitHub Actions Workflow

```yaml
# .github/workflows/flux-diff.yaml
name: Flux Diff Preview
on:
  pull_request:
    paths:
      - "clusters/**"
      - "infrastructure/**"
      - "apps/**"

jobs:
  diff-preview:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4

      - name: Install Flux CLI
        uses: fluxcd/flux2/action@main

      - name: Configure kubectl
        uses: azure/setup-kubectl@v3

      - name: Set up kubeconfig
        run: |
          # Configure cluster access for diff comparison
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > /tmp/kubeconfig
          export KUBECONFIG=/tmp/kubeconfig

      - name: Run flux diff on changed Kustomizations
        id: diff
        run: |
          export KUBECONFIG=/tmp/kubeconfig
          DIFF_OUTPUT=""
          HAS_CHANGES=false

          # Process each Kustomization file
          for ks_file in clusters/production/*.yaml; do
            name=$(yq '.metadata.name' "$ks_file" 2>/dev/null)
            path=$(yq '.spec.path' "$ks_file" 2>/dev/null)

            if [ "$name" = "null" ] || [ "$path" = "null" ]; then
              continue
            fi

            echo "Running diff for $name..."

            # Capture the diff output
            RESULT=$(flux diff kustomization "$name" \
              --path ".${path}" \
              --kustomization-file "$ks_file" 2>&1) || true

            if [ -n "$RESULT" ]; then
              HAS_CHANGES=true
              DIFF_OUTPUT="${DIFF_OUTPUT}\n### Changes for \`${name}\`\n\`\`\`diff\n${RESULT}\n\`\`\`\n"
            else
              DIFF_OUTPUT="${DIFF_OUTPUT}\n### \`${name}\`: No changes\n"
            fi
          done

          # Write output for the comment step
          echo "has_changes=$HAS_CHANGES" >> "$GITHUB_OUTPUT"
          echo "$DIFF_OUTPUT" > /tmp/diff-output.md

      - name: Comment PR with diff results
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diffOutput = fs.readFileSync('/tmp/diff-output.md', 'utf8');

            const body = `## Flux CD Change Preview\n\n${diffOutput}\n\n---\n*Generated by flux diff*`;

            // Find existing comment
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
            });

            const existingComment = comments.data.find(c =>
              c.body.includes('Flux CD Change Preview')
            );

            if (existingComment) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existingComment.id,
                body: body,
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body: body,
              });
            }
```

## Using flux diff with HelmReleases

You can also preview Helm chart changes using `flux diff`.

```bash
# Diff a HelmRelease to see what chart values will change
flux diff kustomization apps \
  --path ./apps/overlays/production \
  --kustomization-file ./clusters/production/apps.yaml
```

### Example HelmRelease Change

```yaml
# apps/overlays/production/redis-patch.yaml
# Update Redis chart version and memory limits
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: cache
spec:
  chart:
    spec:
      version: "18.6.1"  # Was 18.5.0
  values:
    master:
      resources:
        limits:
          memory: 2Gi  # Was 1Gi
```

## Local Diff Script

Create a convenient script for local development.

```bash
#!/bin/bash
# scripts/preview-changes.sh
# Preview all Flux CD changes against the live cluster

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
CLUSTER=${1:-production}

echo "Previewing changes for cluster: $CLUSTER"
echo "========================================="

TOTAL_CHANGES=0

# Find all Kustomization files for the specified cluster
for ks_file in "$REPO_ROOT/clusters/$CLUSTER"/*.yaml; do
  [ -f "$ks_file" ] || continue

  # Parse metadata from the Kustomization file
  NAME=$(yq '.metadata.name' "$ks_file" 2>/dev/null)
  PATH_FIELD=$(yq '.spec.path' "$ks_file" 2>/dev/null)

  if [ "$NAME" = "null" ] || [ "$PATH_FIELD" = "null" ]; then
    continue
  fi

  echo ""
  echo "--- Kustomization: $NAME ---"

  # Run the diff
  DIFF_RESULT=$(flux diff kustomization "$NAME" \
    --path "$REPO_ROOT/${PATH_FIELD#./}" \
    --kustomization-file "$ks_file" 2>&1) || true

  if [ -n "$DIFF_RESULT" ]; then
    echo "$DIFF_RESULT"
    TOTAL_CHANGES=$((TOTAL_CHANGES + 1))
  else
    echo "No changes detected"
  fi
done

echo ""
echo "========================================="
echo "Total Kustomizations with changes: $TOTAL_CHANGES"

if [ "$TOTAL_CHANGES" -gt 0 ]; then
  echo "Review the changes above before merging."
  exit 1
fi
```

## Selective Diff for Specific Resources

Filter diff output to focus on specific resource types.

```bash
#!/bin/bash
# scripts/diff-deployments.sh
# Show only Deployment changes across all Kustomizations

set -euo pipefail

CLUSTER=${1:-production}

for ks_file in clusters/$CLUSTER/*.yaml; do
  NAME=$(yq '.metadata.name' "$ks_file" 2>/dev/null)
  PATH_FIELD=$(yq '.spec.path' "$ks_file" 2>/dev/null)

  [ "$NAME" = "null" ] || [ "$PATH_FIELD" = "null" ] && continue

  # Build and filter for Deployments only
  flux diff kustomization "$NAME" \
    --path ".${PATH_FIELD}" \
    --kustomization-file "$ks_file" 2>&1 | \
    grep -A 20 "kind: Deployment" || true
done
```

## Combining flux diff with Approval Gates

Use the diff output to create approval gates in your deployment pipeline.

```yaml
# .github/workflows/deploy-with-approval.yaml
name: Deploy with Approval
on:
  push:
    branches:
      - main
    paths:
      - "clusters/production/**"
      - "infrastructure/**"
      - "apps/**"

jobs:
  preview:
    runs-on: ubuntu-latest
    outputs:
      has_changes: ${{ steps.diff.outputs.has_changes }}
    steps:
      - uses: actions/checkout@v4
      - uses: fluxcd/flux2/action@main

      - name: Run diff
        id: diff
        run: |
          export KUBECONFIG=/tmp/kubeconfig
          echo "${{ secrets.KUBECONFIG }}" | base64 -d > /tmp/kubeconfig

          CHANGES=$(flux diff kustomization infrastructure \
            --path ./infrastructure/overlays/production \
            --kustomization-file ./clusters/production/infrastructure.yaml 2>&1) || true

          if [ -n "$CHANGES" ]; then
            echo "has_changes=true" >> "$GITHUB_OUTPUT"
            echo "Changes detected:"
            echo "$CHANGES"
          else
            echo "has_changes=false" >> "$GITHUB_OUTPUT"
          fi

  approve:
    needs: preview
    if: needs.preview.outputs.has_changes == 'true'
    runs-on: ubuntu-latest
    environment: production  # Requires manual approval
    steps:
      - name: Approval confirmed
        run: echo "Deployment approved, Flux will reconcile on next interval"
```

## Summary

The `flux diff` command is essential for safe GitOps deployments. It provides a clear preview of what will change in your cluster before reconciliation occurs. By integrating `flux diff` into pull request workflows and CI pipelines, you create a review process that catches unintended changes and gives your team confidence in every deployment.
