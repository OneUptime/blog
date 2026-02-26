# How to Use argocd app diff for Change Review

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Diff, Code Review

Description: Master the argocd app diff command for reviewing changes before deployment, including local diffs, revision comparisons, and CI integration.

---

The `argocd app diff` command is one of the most useful tools in the ArgoCD CLI. It shows you exactly what would change if you synced an application, without actually syncing it. Yet many teams underuse it. This guide covers everything you can do with `argocd app diff` and how to integrate it into your review workflow.

## Basic Usage

The simplest form shows the diff between Git (desired state) and the cluster (live state):

```bash
# Show diff for an application
argocd app diff my-app
```

The output is a unified diff format showing what is different:

```diff
===== apps/Deployment production/my-app ======
--- desired (Git)
+++ live (Cluster)
@@ -12,7 +12,7 @@
     spec:
       containers:
       - name: my-app
-        image: myorg/my-app:v2.0.0
+        image: myorg/my-app:v1.9.0
         env:
-        - name: LOG_LEVEL
-          value: "info"
+        - name: LOG_LEVEL
+          value: "debug"
```

This tells you that Git declares v2.0.0 with info logging, but the cluster is running v1.9.0 with debug logging. Someone either manually changed the cluster or the last sync did not complete.

## Understanding the Diff Output

The diff output has specific conventions:

- Lines with `-` (red) are what Git declares (desired state)
- Lines with `+` (green) are what the cluster has (live state)
- The header `===== group/Kind namespace/name ======` identifies each resource
- Unchanged lines provide context around the changes

If the diff is empty (no output), the application is in sync.

## Local Diff: Preview Before Pushing

The `--local` flag compares your local files against the live cluster:

```bash
# Compare local directory against the live cluster
argocd app diff my-app --local ./apps/my-app/production/

# Compare a specific local file
argocd app diff my-app --local-repo-root . --local ./apps/my-app/
```

This is powerful for development because you can preview changes without committing:

```bash
# Edit a manifest
vim apps/my-app/production/deployment.yaml

# Preview what ArgoCD would see
argocd app diff my-app --local ./apps/my-app/production/

# If the diff looks right, commit and push
git add apps/my-app/production/deployment.yaml
git commit -m "Update my-app to v2.0.0"
git push
```

## Revision Diff: Compare Between Git Commits

Compare what changed between two revisions:

```bash
# Diff between the current sync and a specific revision
argocd app diff my-app --revision main

# Diff against a specific commit
argocd app diff my-app --revision abc123def

# Diff against a tag
argocd app diff my-app --revision v2.0.0
```

This is useful for verifying what a specific commit will change:

```bash
# Before merging a feature branch, check what it would change
argocd app diff my-app --revision feature/new-config
```

## Server-Side Diff

For the most accurate diff, enable server-side comparison:

```bash
# Use server-side diff (more accurate)
argocd app diff my-app --server-side
```

Server-side diff sends the manifests to the Kubernetes API server for comparison, which accounts for defaulting and mutation webhooks. This eliminates false positives you might see with client-side diffing.

Configure server-side diff as the default for an application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/compare-options: ServerSideDiff=true
spec:
  # ... rest of spec
```

## Filtering Diff Output

When an application has many resources, the diff can be noisy. Filter it:

```bash
# Diff only Deployments
argocd app diff my-app --resource "apps/Deployment"

# Diff a specific resource
argocd app diff my-app --resource "apps/Deployment/my-app"

# Diff only resources in a specific group
argocd app diff my-app --resource "networking.k8s.io/*"
```

## Exit Codes for Scripting

`argocd app diff` uses exit codes that are useful for scripting:

- **Exit 0** - No differences (application is in sync)
- **Exit 1** - Differences exist
- **Exit 2** - Error occurred

Use this in scripts:

```bash
#!/bin/bash
# check-sync.sh - Check if application needs syncing

if argocd app diff my-app > /dev/null 2>&1; then
    echo "Application is in sync - nothing to do"
    exit 0
else
    echo "Application has pending changes"
    argocd app diff my-app
    echo ""
    echo "Review the changes above before syncing"
    exit 1
fi
```

## Integrating Diff into CI/CD

### Pull Request Diff Bot

Post diffs as PR comments for team review:

```bash
#!/bin/bash
# pr-diff.sh - Generate diff comment for a pull request
set -euo pipefail

ARGOCD_SERVER="${ARGOCD_SERVER:?}"
APPS_DIR="${1:-apps}"

output="## ArgoCD Change Preview\n\n"

# Find affected applications from changed files
changed_apps=$(git diff --name-only origin/main...HEAD -- "$APPS_DIR/" | \
    awk -F'/' '{print $2}' | sort -u)

if [ -z "$changed_apps" ]; then
    output="${output}No application changes detected.\n"
else
    for app in $changed_apps; do
        output="${output}### Application: \`$app\`\n\n"

        diff_result=$(argocd app diff "$app" \
            --local "$APPS_DIR/$app/production/" 2>&1) || true

        if [ -n "$diff_result" ]; then
            output="${output}\`\`\`diff\n${diff_result}\n\`\`\`\n\n"
        else
            output="${output}No changes detected for this application.\n\n"
        fi
    done
fi

output="${output}---\n*Run \`argocd app diff <app-name>\` for detailed review.*\n"

echo -e "$output"
```

### Slack Notification with Diff

```bash
#!/bin/bash
# notify-diff.sh - Send diff to Slack before sync
set -euo pipefail

APP_NAME="$1"
SLACK_WEBHOOK="${SLACK_WEBHOOK:?}"

diff_output=$(argocd app diff "$APP_NAME" 2>&1) || true

if [ -n "$diff_output" ]; then
    # Truncate long diffs for Slack
    truncated=$(echo "$diff_output" | head -50)

    curl -X POST "$SLACK_WEBHOOK" \
        -H 'Content-Type: application/json' \
        -d "{
            \"text\": \"ArgoCD Diff Preview for $APP_NAME\",
            \"blocks\": [{
                \"type\": \"section\",
                \"text\": {
                    \"type\": \"mrkdwn\",
                    \"text\": \"\`\`\`${truncated}\`\`\`\"
                }
            }]
        }"
fi
```

## Diff with Helm Value Changes

When using Helm, diff captures value changes too:

```bash
# Diff after changing Helm values
argocd app diff my-app --local-repo-root . --local charts/my-app/ \
    --values values/production.yaml

# Compare different value files
diff <(helm template my-app charts/my-app/ -f values/staging.yaml) \
     <(helm template my-app charts/my-app/ -f values/production.yaml)
```

## Diff with Kustomize Changes

For Kustomize applications:

```bash
# Build locally and compare
kustomize build overlays/production/ > /tmp/local-build.yaml
argocd app manifests my-app --source git > /tmp/git-build.yaml
argocd app manifests my-app --source live > /tmp/live-build.yaml

# Compare local changes against Git
diff /tmp/local-build.yaml /tmp/git-build.yaml

# Compare Git against live cluster
diff /tmp/git-build.yaml /tmp/live-build.yaml
```

## Common Diff Patterns and What They Mean

### Image Tag Change

```diff
-        image: myorg/my-app:v1.0.0
+        image: myorg/my-app:v2.0.0
```

Simple version bump. Review the changelog for v2.0.0 before syncing.

### Resource Limit Change

```diff
           resources:
             limits:
-              memory: 512Mi
+              memory: 1Gi
-              cpu: 500m
+              cpu: "1"
```

Resource changes can affect scheduling. Verify node capacity before syncing.

### New Resource Added

```diff
===== /ConfigMap production/my-app-config ======
+apiVersion: v1
+kind: ConfigMap
+metadata:
+  name: my-app-config
+  namespace: production
+data:
+  DATABASE_URL: postgres://...
```

New resource. Verify it does not conflict with existing resources.

### Resource Removed

```diff
===== /Service production/my-app-legacy ======
-apiVersion: v1
-kind: Service
-metadata:
-  name: my-app-legacy
```

Resource will be pruned (if prune is enabled). Verify no other services depend on it.

## Best Practices

1. **Run diff before every manual sync.** Make it a habit, not an exception.

2. **Use local diff during development.** Check your changes before pushing. It is faster than waiting for CI.

3. **Enable server-side diff for production apps.** The accuracy improvement is worth the slight overhead.

4. **Monitor diff sizes with OneUptime.** Large diffs are riskier. Track how the size of your diffs correlates with deployment incidents using [OneUptime](https://oneuptime.com).

5. **Automate diff in your PR workflow.** Make diffs visible to reviewers so they can approve infrastructure changes with full context.

## Conclusion

`argocd app diff` is your primary tool for change review in a GitOps workflow. It bridges the gap between "I committed a change" and "I know what that change will do to my cluster." By mastering local diffs, revision comparisons, and CI integration, you make deployments predictable and reviewable. No more surprises when you hit sync.
