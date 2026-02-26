# How to Use argocd app diff to Preview Changes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Change Management

Description: Learn how to use argocd app diff to preview what will change before syncing, compare revisions, and build pre-deployment review workflows.

---

Before you sync an application, you should know exactly what will change. The `argocd app diff` command shows you the differences between the desired state in Git and the live state in your cluster. It is your pre-deployment review tool and the equivalent of a `git diff` for your Kubernetes resources.

## Basic Usage

```bash
argocd app diff my-app
```

This outputs a unified diff showing what would change if you synced the application right now. The output looks similar to standard diff output:

```diff
===== apps/Deployment my-app-ns/my-app ======
--- live
+++ desired
@@ -6,7 +6,7 @@
   template:
     spec:
       containers:
-      - image: my-app:v1.0.0
+      - image: my-app:v2.0.0
         name: app
         ports:
         - containerPort: 8080
```

If the application is in sync, the command produces no output and returns exit code 0.

## Exit Codes

The exit code is critical for scripting:

- **Exit code 0**: Application is in sync (no differences)
- **Exit code 1**: Application is out of sync (differences found)
- **Exit code 2**: Error occurred (could not compute diff)

```bash
# Use exit codes in scripts
argocd app diff my-app
if [ $? -eq 0 ]; then
  echo "Application is in sync, nothing to deploy"
elif [ $? -eq 1 ]; then
  echo "Changes detected, review before syncing"
else
  echo "Error computing diff"
fi
```

## Diff Against a Specific Revision

Compare the live state against a revision different from the configured target:

```bash
# Diff against a specific commit
argocd app diff my-app --revision a1b2c3d4e5f6

# Diff against a branch
argocd app diff my-app --revision feature/new-api

# Diff against a tag
argocd app diff my-app --revision v2.1.0
```

This is useful for previewing what a new release would change before updating the application's target revision.

## Local Diff (Compare Against Local Files)

One of the most powerful features is comparing live state against local files on your machine:

```bash
# Diff against local manifests
argocd app diff my-app --local /path/to/local/manifests

# Diff against local Helm chart
argocd app diff my-app --local /path/to/chart

# Diff against local Kustomize directory
argocd app diff my-app --local /path/to/kustomize/overlay
```

This is incredibly useful during development. You can see what your changes would do before committing and pushing to Git:

```bash
# Typical development workflow
cd ~/code/my-manifests

# Make changes to your manifests locally
vim apps/my-app/deployment.yaml

# Preview what your changes would do
argocd app diff my-app --local ./apps/my-app

# If the diff looks good, commit and push
git add .
git commit -m "Update deployment image to v2.0.0"
git push
```

## Hard Refresh Before Diff

Force ArgoCD to refresh its cache before computing the diff:

```bash
argocd app diff my-app --hard-refresh
```

This ensures you are comparing against the absolute latest state from both Git and the cluster, bypassing any cached data.

## Server-Side Diff

Use the Kubernetes API server to compute the diff, which can be more accurate for resources with defaulted fields:

```bash
argocd app diff my-app --server-side
```

Server-side diff accounts for:
- Default values the API server would set
- Mutating webhook modifications
- Field ownership via server-side apply

## Diff Output for Specific Resources

While `argocd app diff` does not have a built-in resource filter, you can pipe the output through grep:

```bash
# Show diff only for Deployments
argocd app diff my-app 2>&1 | grep -A 20 "Deployment"

# Show diff for a specific resource
argocd app diff my-app 2>&1 | grep -A 30 "my-specific-configmap"
```

## Pre-Deployment Review Workflow

Here is a complete workflow for reviewing changes before deployment:

```bash
#!/bin/bash
# pre-deploy-review.sh - Review changes before deployment

APP_NAME="${1:?Usage: pre-deploy-review.sh <app-name>}"

echo "=== Pre-Deployment Review for: $APP_NAME ==="
echo ""

# Step 1: Hard refresh to get latest state
echo "Refreshing application state..."
argocd app get "$APP_NAME" --hard-refresh > /dev/null 2>&1

# Step 2: Check current status
SYNC_STATUS=$(argocd app get "$APP_NAME" -o json | jq -r '.status.sync.status')
HEALTH_STATUS=$(argocd app get "$APP_NAME" -o json | jq -r '.status.health.status')

echo "Current sync status:   $SYNC_STATUS"
echo "Current health status: $HEALTH_STATUS"
echo ""

# Step 3: Show the diff
echo "=== Changes to be applied ==="
DIFF_OUTPUT=$(argocd app diff "$APP_NAME" 2>&1)
DIFF_EXIT=$?

if [ $DIFF_EXIT -eq 0 ]; then
  echo "No changes detected. Application is in sync."
  exit 0
elif [ $DIFF_EXIT -eq 2 ]; then
  echo "ERROR: Could not compute diff"
  echo "$DIFF_OUTPUT"
  exit 2
fi

echo "$DIFF_OUTPUT"
echo ""

# Step 4: Count changes
RESOURCES_CHANGED=$(echo "$DIFF_OUTPUT" | grep "^=====" | wc -l)
echo "Total resources with changes: $RESOURCES_CHANGED"
echo ""

# Step 5: Ask for confirmation
read -p "Do you want to proceed with sync? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "Syncing application..."
  argocd app sync "$APP_NAME"
else
  echo "Sync cancelled."
fi
```

## CI/CD Pipeline Integration

Use `argocd app diff` in CI pipelines to create deployment previews:

```yaml
# GitHub Actions - Post diff as PR comment
name: ArgoCD Diff Preview
on:
  pull_request:
    paths:
      - 'k8s/**'

jobs:
  diff-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install ArgoCD CLI
        run: |
          curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
          chmod +x argocd
          sudo mv argocd /usr/local/bin/

      - name: Login to ArgoCD
        run: |
          argocd login $ARGOCD_SERVER --username $ARGOCD_USER --password $ARGOCD_PASS --grpc-web

      - name: Compute Diff
        id: diff
        run: |
          DIFF=$(argocd app diff my-app --local ./k8s 2>&1 || true)
          echo "diff<<EOF" >> $GITHUB_OUTPUT
          echo "$DIFF" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Post Comment
        uses: actions/github-script@v7
        with:
          script: |
            const diff = `${{ steps.diff.outputs.diff }}`;
            const body = diff.trim() === ''
              ? '### ArgoCD Diff Preview\nNo changes detected.'
              : `### ArgoCD Diff Preview\n\`\`\`diff\n${diff}\n\`\`\``;
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: body
            });
```

## Comparing Two Revisions

To compare what changed between two Git revisions, use local diff with different checkouts:

```bash
#!/bin/bash
# revision-diff.sh - Compare two revisions

APP_NAME="${1:?Usage: revision-diff.sh <app> <old-rev> <new-rev>}"
OLD_REV="${2:?Usage: revision-diff.sh <app> <old-rev> <new-rev>}"
NEW_REV="${3:?Usage: revision-diff.sh <app> <old-rev> <new-rev>}"

REPO_URL=$(argocd app get "$APP_NAME" -o json | jq -r '.spec.source.repoURL')
APP_PATH=$(argocd app get "$APP_NAME" -o json | jq -r '.spec.source.path')

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Clone and show diff for old revision
git clone "$REPO_URL" "$TMPDIR/repo"
cd "$TMPDIR/repo"

echo "=== Diff: $OLD_REV to $NEW_REV ==="
git diff "$OLD_REV" "$NEW_REV" -- "$APP_PATH"
```

## Understanding Diff Output

The diff output follows standard unified diff format:

```diff
===== apps/Deployment my-app-ns/my-app ======
```

This header line tells you:
- **apps** - the API group
- **Deployment** - the resource kind
- **my-app-ns** - the namespace
- **my-app** - the resource name

Lines prefixed with `-` are in the live state but not in the desired state.
Lines prefixed with `+` are in the desired state but not in the live state.

## Diff and ignoreDifferences

If your application has `ignoreDifferences` configured, the diff output will respect those settings:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

Fields configured in `ignoreDifferences` will not appear in the diff output, because ArgoCD excludes them from comparison.

## Summary

The `argocd app diff` command is your safety net before deployments. Use it to preview changes, catch unexpected modifications, and build approval workflows around your GitOps process. The local diff feature makes it especially powerful during development, letting you see exactly what your changes will do before they reach Git. Combined with CI/CD tooling, it enables deployment preview comments on pull requests, bringing visibility and confidence to your release process.
